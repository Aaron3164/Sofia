import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Bot,
  Plus,
  Trash2,
  Globe,
  Paperclip,
  X,
  Copy,
  Check,
  Pencil,
  ExternalLink,
  Menu,
  FileText,
  Loader2,
  BookOpen,
  Scale,
  Stethoscope,
  Atom,
  Lightbulb,
  Code,
  Folder,
  ChevronDown,
  Search,
  FolderPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { getCachedAllCourseData } from '../lib/courseDataCache';
import {
  askChatSofia,
  generateChatTitle,
  getDailyUsage,
  type SofiaChatMessage,
  type SofiaChatSession
} from '../lib/gemini';
import { mdToHtml } from '../lib/markdown';
import { extractTextFromPDF } from '../lib/pdf-extractor';
import { WysiwygEditor } from '../components/library/WysiwygEditor';
import './ChatSofia.css';

const STARTER_PROMPTS = [
  {
    icon: <Stethoscope size={18} color="#0ea5e9" />,
    domain: 'Santé & Médecine',
    text: "Explique-moi la physiopathologie de l'insuffisance cardiaque gauche et ses conséquences cliniques."
  },
  {
    icon: <Scale size={18} color="#8b5cf6" />,
    domain: 'Droit & Sciences Juridiques',
    text: "Quelle est la différence fondamentale entre la responsabilité contractuelle et extracontractuelle ?"
  },
  {
    icon: <Atom size={18} color="#10b981" />,
    domain: 'Sciences & Ingénierie',
    text: "Démontre le théorème de Bayes et donne-moi une application concrète et intuitive."
  },
  {
    icon: <Lightbulb size={18} color="#f59e0b" />,
    domain: 'Méthodologie & Révisions',
    text: "Comment structurer un plan de révision efficace à 3 semaines d'un concours ou d'un partiel ?"
  },
  {
    icon: <Code size={18} color="#ec4899" />,
    domain: 'Informatique & Algo',
    text: "Explique le fonctionnement d'un algorithme de recherche dichotomique avec un exemple en Python."
  },
  {
    icon: <BookOpen size={18} color="#6366f1" />,
    domain: 'Culture & Analyse',
    text: "Fais-moi une synthèse claire des principaux courants de pensée en philosophie politique moderne."
  }
];

export default function ChatSofia() {
  const { user, profile } = useAuth();
  const { alert, confirm } = useDialog();
  const { nodes } = useFileSystem();

  const storageKey = `sofia_universal_chats_${user?.id || 'guest'}`;

  // Sessions state
  const [sessions, setSessions] = useState<SofiaChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved chat sessions:', e);
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return sessions.length > 0 ? sessions[0].id : null;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  // Attached file
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  // Course / Folder Target Selector state (like PlanningCenter)
  const [selectedTargetNode, setSelectedTargetNode] = useState<{ id: string; name: string; type: 'course' | 'folder' } | null>(null);
  const [isCourseSelectorOpen, setIsCourseSelectorOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => {
      const currentIsCollapsed = prev[folderId] ?? true;
      return {
        ...prev,
        [folderId]: !currentIsCollapsed
      };
    });
  };

  const getDescendantCourses = (folderId: string): FileNode[] => {
    const directChildren = nodes
      .filter(n => n.parentId === folderId)
      .sort((a, b) => a.order - b.order);
    const directCourses = directChildren.filter(n => n.type === 'course');
    const subFolders = directChildren.filter(n => n.type === 'folder');
    let all: FileNode[] = [...directCourses];
    for (const sub of subFolders) {
      all = all.concat(getDescendantCourses(sub.id));
    }
    return all;
  };

  // Quota tracking
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const maxGenerations = profile?.plan === 'premium' ? 50 : 5;
  const isQuotaReached = dailyUsage >= maxGenerations;

  useEffect(() => {
    const refreshUsage = () => {
      getDailyUsage().then(count => setDailyUsage(count));
    };
    refreshUsage();
    window.addEventListener('ai-usage-updated', refreshUsage);
    return () => window.removeEventListener('ai-usage-updated', refreshUsage);
  }, [user]);

  // Copy state & Edit state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (e) {
      console.error('Could not save sessions to localStorage:', e);
    }
  }, [sessions, storageKey]);

  // Current session object
  const currentSession = sessions.find((s) => s.id === activeSessionId) || null;
  const currentMessages = currentSession?.messages || [];

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading]);

  // Dynamic textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Create a new blank session
  const handleCreateNewChat = () => {
    setActiveSessionId(null);
    setInputText('');
    setAttachedFile(null);
    setIsSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Delete a session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm('Voulez-vous vraiment supprimer cette conversation ? Cette action est irréversible.');

    if (!confirmed) return;

    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  // Copy assistant response
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle file attachment
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAttaching(true);
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const text = await extractTextFromPDF(file);
        setAttachedFile({
          name: file.name,
          content: text.slice(0, 120000)
        });
      } else {
        const text = await file.text();
        setAttachedFile({
          name: file.name,
          content: text.slice(0, 120000)
        });
      }
    } catch (err: any) {
      console.error('Error reading attached file:', err);
      alert("Impossible de lire le fichier joint. Assurez-vous qu'il s'agit d'un PDF ou d'un fichier texte lisible.");
    } finally {
      setIsAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    if (isQuotaReached) {
      const errorMessage: SofiaChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ **Limite quotidienne atteinte** (${dailyUsage}/${maxGenerations}). ${profile?.plan === 'premium' ? 'Revenez demain !' : 'Passez au Plan Premium pour 50 générations/jour !'}`,
        createdAt: Date.now()
      };
      // Show error in current or new session
      if (activeSessionId && currentSession) {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { id: crypto.randomUUID(), role: 'user' as const, content: query, createdAt: Date.now() }, errorMessage] } : s));
      }
      setInputText('');
      return;
    }

    const userMessage: SofiaChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      createdAt: Date.now(),
      attachmentName: attachedFile?.name
    };

    let targetSessionId = activeSessionId;
    let isBrandNewSession = false;

    if (!targetSessionId || !currentSession) {
      targetSessionId = crypto.randomUUID();
      isBrandNewSession = true;
      const newSession: SofiaChatSession = {
        id: targetSessionId,
        title: 'Nouvelle discussion',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage]
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(targetSessionId);
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, userMessage], updatedAt: Date.now() }
            : s
        )
      );
    }

    setInputText('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    try {
      // Build conversation context
      const existingMsgs = isBrandNewSession ? [] : currentMessages;
      const historyToPass = [...existingMsgs, userMessage].map((m) => ({
        role: m.role,
        content: m.content
      }));

      // Retrieve relevant course excerpts from the student's imported PDFs & courses
      let relevantCoursesContext = '';
      try {
        const cloudData = await getCachedAllCourseData(profile?.id);
        const getCourseText = (node: FileNode) => {
          const cRow = cloudData?.find(r => r.course_id === node.id);
          let content = cRow?.extracted_content || '';
          let resume = cRow?.generations?.resume || '';

          if (!content || !resume) {
            const local = localStorage.getItem(`aura_subject_${node.id}`);
            if (local) {
              try {
                const parsed = JSON.parse(local);
                if (!content) content = parsed.extractedContent || '';
                if (!resume) resume = parsed.generations?.resume || '';
              } catch {}
            }
          }
          return { content, resume };
        };

        if (selectedTargetNode) {
          // Explicit Course or Folder Target selected by the student
          if (selectedTargetNode.type === 'course') {
            const targetCourse = nodes.find(n => n.id === selectedTargetNode.id);
            if (targetCourse) {
              const { content, resume } = getCourseText(targetCourse);
              relevantCoursesContext = `--- COURS CIBLÉ PAR L'ÉTUDIANT : ${targetCourse.name} ---\n${content || resume || 'Aucun texte extrait pour ce cours.'}`;
            }
          } else {
            const folderCourses = getDescendantCourses(selectedTargetNode.id);
            const blocks: string[] = [];
            let totalChars = 0;
            const maxFolderBudget = 160000;

            for (const cNode of folderCourses) {
              if (totalChars >= maxFolderBudget) break;
              const { content, resume } = getCourseText(cNode);
              const textToUse = content || resume;
              if (textToUse) {
                const slice = textToUse.slice(0, Math.max(15000, Math.floor(maxFolderBudget / Math.max(1, folderCourses.length))));
                blocks.push(`--- COURS DU DOSSIER "${selectedTargetNode.name}" : ${cNode.name} ---\n${slice}`);
                totalChars += slice.length;
              }
            }
            if (blocks.length > 0) {
              relevantCoursesContext = blocks.join('\n\n');
            }
          }
        } else {
          // Automatic keyword scan across all courses
          const courseNodes = nodes.filter((n: FileNode) => n.type === 'course');
          if (courseNodes.length > 0) {
            const cleanQ = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const tokens = cleanQ.split(/[\s,.'";:!?()\-+/]+/).filter(t => t.length >= 3);

            if (tokens.length > 0) {
              const matchedBlocks: { name: string; text: string; score: number }[] = [];

              for (const node of courseNodes) {
                const { content, resume } = getCourseText(node);
                const combined = `${node.name} ${resume} ${content}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                let score = 0;
                for (const token of tokens) {
                  if (combined.includes(token)) score++;
                }

                if (score > 0) {
                  const snippetParts: string[] = [];
                  if (resume) snippetParts.push(resume.slice(0, 1500));
                  
                  for (const token of tokens) {
                    const idx = combined.indexOf(token);
                    if (idx !== -1 && content) {
                      const start = Math.max(0, idx - 200);
                      const end = Math.min(content.length, idx + 400);
                      snippetParts.push(content.substring(start, end));
                      if (snippetParts.length >= 3) break;
                    }
                  }

                  matchedBlocks.push({
                    name: node.name,
                    text: snippetParts.join('\n...\n').slice(0, 4000),
                    score
                  });
                }
              }

              matchedBlocks.sort((a, b) => b.score - a.score);
              const topBlocks = matchedBlocks.slice(0, 5);

              if (topBlocks.length > 0) {
                relevantCoursesContext = topBlocks.map(b => 
                  `--- COURS : ${b.name} ---\n${b.text}`
                ).join('\n\n');
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not scan user courses for chat context:', err);
      }

      // Call Chat SofIA Universal API
      const result = await askChatSofia(historyToPass, {
        useWebSearch,
        attachmentContext: currentAttachment?.content,
        coursesContext: relevantCoursesContext,
        preferences: profile?.preferences
      });

      const assistantMessage: SofiaChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.text,
        createdAt: Date.now(),
        sources: result.sources
      };

      // Add response to session
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, assistantMessage], updatedAt: Date.now() }
            : s
        )
      );

      // Auto-generate title for new sessions asynchronously
      if (isBrandNewSession) {
        generateChatTitle(query).then((generatedTitle) => {
          if (generatedTitle) {
            setSessions((prev) =>
              prev.map((s) => (s.id === targetSessionId ? { ...s, title: generatedTitle } : s))
            );
          }
        });
      }
    } catch (err: any) {
      console.error('Chat SofIA error:', err);
      const isQuota = err?.message?.toLowerCase().includes('quota') || err?.message?.toLowerCase().includes('limite');
      
      const errorMessage: SofiaChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: isQuota
          ? "⚠️ **Limite quotidienne atteinte** : Vous avez atteint votre quota de générations IA pour aujourd'hui. Passez au Plan Premium pour profiter d'un accès illimité."
          : `⚠️ **Une erreur est survenue** : ${err?.message || 'Impossible de contacter SofIA pour le moment. Veuillez réessayer.'}`,
        createdAt: Date.now()
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, errorMessage], updatedAt: Date.now() }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut: Enter to submit, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Save manual edit
  const handleSaveEdit = (msgId: string, newHtml: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === msgId ? { ...m, content: newHtml } : m
              )
            }
          : s
      )
    );
    setEditingMsgId(null);
  };

  return (
    <div className="chat-sofia-layout">
      {/* SIDEBAR: CONVERSATION HISTORY */}
      <aside className={`chat-sofia-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="chat-sofia-sidebar-header">
          <button className="chat-new-btn" onClick={handleCreateNewChat}>
            <Plus size={16} />
            <span>Nouvelle discussion</span>
          </button>
        </div>

        <div className="chat-sessions-list">
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem 1rem' }}>
              Aucune discussion enregistrée. Démarrez un échange avec SofIA !
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`chat-session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setIsSidebarOpen(false);
                }}
              >
                <div className="chat-session-title">
                  <Bot size={15} style={{ opacity: 0.7 }} />
                  <span>{session.title || 'Discussion sans titre'}</span>
                </div>
                <button
                  className="chat-session-delete"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  title="Supprimer cette discussion"
                  aria-label="Supprimer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="chat-sofia-main">
        {/* HEADER */}
        <header className="chat-sofia-header">
          <div className="chat-sofia-title-box">
            <button
              className="chat-tool-btn mobile-only"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Historique des discussions"
            >
              <Menu size={18} />
            </button>
            <div className="chat-sofia-avatar-badge">
              <Bot size={20} />
              <div className="chat-online-dot" />
            </div>
            <div className="chat-title-text">
              <h1>
                Chat SofIA <span className="chat-tag-badge">Universelle</span>
              </h1>
              <p className="chat-subtitle">Tuteur académique & recherche ouverte sans restriction de cours</p>
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className={`web-search-toggle ${selectedTargetNode ? 'active' : ''}`}
              onClick={() => setIsCourseSelectorOpen(true)}
              title="Cibler un cours ou un dossier précis de votre bibliothèque"
              style={selectedTargetNode ? { borderColor: 'var(--accent-primary)', background: 'var(--accent-light)', color: 'var(--accent-primary)' } : undefined}
            >
              {selectedTargetNode?.type === 'folder' ? <Folder size={14} /> : <BookOpen size={14} />}
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedTargetNode ? selectedTargetNode.name : '+ Cibler un cours / dossier'}
              </span>
              {selectedTargetNode && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTargetNode(null);
                  }}
                  title="Retirer le ciblage"
                  style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.2rem', opacity: 0.8 }}
                >
                  <X size={13} />
                </span>
              )}
            </button>

            <button
              className={`web-search-toggle ${useWebSearch ? 'active' : ''}`}
              onClick={() => setUseWebSearch(!useWebSearch)}
              title={useWebSearch ? 'Recherche Google live activée' : 'Activer la recherche Google en direct'}
            >
              <Globe size={14} />
              <span>Recherche Web</span>
              <div className="toggle-indicator" />
            </button>

            <button
              className="chat-tool-btn"
              onClick={handleCreateNewChat}
              title="Nouvelle discussion"
            >
              <Plus size={18} />
            </button>
          </div>
        </header>

        {/* MESSAGES SCROLL CONTAINER */}
        <div className="chat-messages-scroll">
          {currentMessages.length === 0 ? (
            /* EMPTY STATE HERO */
            <div className="chat-welcome-container">
              <div className="chat-welcome-avatar">
                <Bot size={34} />
              </div>
              <h2 className="chat-welcome-title">Bonjour ! Que souhaitez-vous explorer ?</h2>
              <p className="chat-welcome-desc">
                Je suis <strong>SofIA</strong>. Contrairement aux espaces de cours dédiés, vous pouvez me poser
                n'importe quelle question sur vos études, la méthodologie, les sciences, le droit ou la culture générale.
              </p>

              <div className="chat-starters-grid">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="chat-starter-card"
                    onClick={() => !isQuotaReached && handleSendMessage(prompt.text)}
                    style={isQuotaReached ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                  >
                    <div className="chat-starter-icon">{prompt.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                        {prompt.domain}
                      </div>
                      <div className="chat-starter-text">{prompt.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* CONVERSATION MESSAGES */
            currentMessages.map((msg) => (
              <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                <div className="chat-msg-avatar">
                  {msg.role === 'user' ? (
                    user?.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="User"
                        style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }}
                      />
                    ) : (
                      'Moi'
                    )
                  ) : (
                    <Bot size={18} />
                  )}
                </div>

                <div className="chat-msg-bubble">
                  {msg.role === 'user' ? (
                    <div className="chat-msg-content">
                      {msg.attachmentName && (
                        <div className="chat-attachment-pill">
                          <FileText size={13} />
                          <span>{msg.attachmentName}</span>
                        </div>
                      )}
                      <div>{msg.content}</div>
                    </div>
                  ) : (
                    <div className="chat-msg-content">
                      {editingMsgId === msg.id ? (
                        <WysiwygEditor
                          initialContent={msg.content}
                          onSave={(newHtml) => handleSaveEdit(msg.id, newHtml)}
                          onCancel={() => setEditingMsgId(null)}
                        />
                      ) : (
                        <div
                          className="resume-content-rendered"
                          dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }}
                        />
                      )}

                      {/* Web Search Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="chat-sources-box">
                          <div className="chat-sources-header">
                            <Globe size={12} /> Sources & Références consultées
                          </div>
                          <div className="chat-sources-chips">
                            {msg.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="chat-source-chip"
                                title={src.url}
                              >
                                <span>{src.title}</span>
                                <ExternalLink size={10} style={{ opacity: 0.6 }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons below assistant answer */}
                      <div className="chat-msg-actions">
                        <button
                          className="chat-action-btn"
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          title="Copier le texte"
                        >
                          {copiedId === msg.id ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                          <span>{copiedId === msg.id ? 'Copié !' : 'Copier'}</span>
                        </button>

                        <button
                          className="chat-action-btn"
                          onClick={() => setEditingMsgId(msg.id)}
                          title="Modifier la réponse"
                        >
                          <Pencil size={13} />
                          <span>Modifier</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Thinking / Loading indicator */}
          {isLoading && (
            <div className="chat-message-row assistant">
              <div className="chat-msg-avatar">
                <Bot size={18} />
              </div>
              <div className="chat-msg-bubble">
                <div className="chat-thinking-box">
                  <div className="chat-thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>
                    {useWebSearch ? 'Recherche sur le web & formulation en cours...' : 'SofIA réfléchit...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FOOTER */}
        <div className="chat-input-footer">
          {/* Active Course/Folder Target bar */}
          {selectedTargetNode && (
            <div className="chat-attached-bar" style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-light)' }}>
              <div className="chat-attached-name" style={{ color: 'var(--accent-primary)' }}>
                {selectedTargetNode.type === 'folder' ? <Folder size={15} /> : <BookOpen size={15} />}
                <span>
                  {selectedTargetNode.type === 'folder' ? 'Dossier ciblé :' : 'Cours ciblé :'}{' '}
                  <strong>{selectedTargetNode.name}</strong>
                </span>
              </div>
              <button
                className="chat-tool-btn"
                style={{ width: '24px', height: '24px' }}
                onClick={() => setSelectedTargetNode(null)}
                title="Revenir à toute la bibliothèque"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Attached file bar */}
          {attachedFile && (
            <div className="chat-attached-bar">
              <div className="chat-attached-name">
                <FileText size={15} color="var(--accent-primary)" />
                <span>Document joint : <strong>{attachedFile.name}</strong></span>
              </div>
              <button
                className="chat-tool-btn"
                style={{ width: '24px', height: '24px' }}
                onClick={() => setAttachedFile(null)}
                title="Retirer le fichier"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="chat-input-box">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt,.md,.doc,.docx"
              style={{ display: 'none' }}
            />

            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={
                selectedTargetNode
                  ? `Posez votre question sur « ${selectedTargetNode.name} »...`
                  : "Posez votre question à SofIA (ex: concept, formule, méthodologie, code...)..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <div className="chat-input-tools">
              <button
                className={`chat-tool-btn ${selectedTargetNode ? 'active' : ''}`}
                onClick={() => setIsCourseSelectorOpen(true)}
                disabled={isLoading}
                title="Cibler un cours ou dossier de la bibliothèque"
                style={{ color: selectedTargetNode ? 'var(--accent-primary)' : undefined }}
              >
                <BookOpen size={17} />
              </button>

              <button
                className="chat-tool-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAttaching || isLoading}
                title="Joindre un document ou PDF"
              >
                {isAttaching ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
              </button>

              <button
                className={`chat-tool-btn ${useWebSearch ? 'active' : ''}`}
                onClick={() => setUseWebSearch(!useWebSearch)}
                title={useWebSearch ? 'Recherche web activée' : 'Activer la recherche web'}
                style={{ color: useWebSearch ? 'var(--accent-secondary)' : undefined }}
              >
                <Globe size={17} />
              </button>

              <button
                className="chat-send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading || isQuotaReached}
                title={isQuotaReached ? `Limite atteinte (${dailyUsage}/${maxGenerations})` : 'Envoyer le message (Entrée)'}
              >
                {isLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>

          <div className="chat-disclaimer">
            {isQuotaReached ? (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                ⚠️ Limite quotidienne atteinte ({dailyUsage}/{maxGenerations}).{' '}
                {profile?.plan !== 'premium' ? 'Passez Premium pour 50 générations/jour !' : 'Revenez demain !'}
              </span>
            ) : (
              <>SofIA peut générer des réponses inexactes. Vérifiez toujours les informations critiques avec vos sources universitaires.</>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Course / Folder Selector (same tree presentation as PlanningCenter) */}
      {isCourseSelectorOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 18, 33, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => {
            setIsCourseSelectorOpen(false);
            setCourseSearchQuery('');
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-xl)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Cibler un cours ou dossier</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  SofIA s'appuiera prioritairement sur votre sélection
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setIsCourseSelectorOpen(false);
                  setCourseSearchQuery('');
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Rechercher un cours ou dossier..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            {selectedTargetNode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-primary)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  Actuel : {selectedTargetNode.name}
                </span>
                <button
                  onClick={() => {
                    setSelectedTargetNode(null);
                    setIsCourseSelectorOpen(false);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                >
                  Réinitialiser (Tout)
                </button>
              </div>
            )}

            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.25rem' }}>
              {courseSearchQuery.trim() ? (
                (() => {
                  const q = courseSearchQuery.toLowerCase().trim();
                  const matched = nodes.filter(n => n.name.toLowerCase().includes(q));
                  if (matched.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Aucun cours ou dossier correspondant.
                      </div>
                    );
                  }
                  return matched.map(item => {
                    const parentFolder = nodes.find(n => n.id === item.parentId);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedTargetNode({ id: item.id, name: item.name, type: item.type });
                          setIsCourseSelectorOpen(false);
                          setCourseSearchQuery('');
                        }}
                        className="hover-lift"
                        style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', overflow: 'hidden' }}>
                          {item.type === 'folder' ? (
                            <Folder size={16} color={item.color || 'var(--accent-primary)'} />
                          ) : (
                            <FileText size={16} color="var(--accent-primary)" />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </span>
                            {parentFolder && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                📁 {parentFolder.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', height: 'auto', flexShrink: 0 }}>
                          Cibler
                        </button>
                      </div>
                    );
                  });
                })()
              ) : nodes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Aucun cours dans votre bibliothèque.
                </div>
              ) : (
                <ChatCourseTreeSelector
                  nodes={nodes}
                  parentId={null}
                  depth={0}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={toggleFolderCollapse}
                  onSelectCourse={(course) => {
                    setSelectedTargetNode({ id: course.id, name: course.name, type: 'course' });
                    setIsCourseSelectorOpen(false);
                    setCourseSearchQuery('');
                  }}
                  onSelectFolder={(folder) => {
                    setSelectedTargetNode({ id: folder.id, name: folder.name, type: 'folder' });
                    setIsCourseSelectorOpen(false);
                    setCourseSearchQuery('');
                  }}
                  getDescendantCourses={getDescendantCourses}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface ChatCourseTreeSelectorProps {
  nodes: FileNode[];
  parentId: string | null;
  depth: number;
  collapsedFolders: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  onSelectCourse: (course: FileNode) => void;
  onSelectFolder: (folder: FileNode) => void;
  getDescendantCourses: (folderId: string) => FileNode[];
}

function ChatCourseTreeSelector({
  nodes,
  parentId,
  depth,
  collapsedFolders,
  onToggleFolder,
  onSelectCourse,
  onSelectFolder,
  getDescendantCourses,
}: ChatCourseTreeSelectorProps) {
  const currentNodes = nodes
    .filter(n => n.parentId === parentId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.order - b.order;
    });

  if (currentNodes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginLeft: depth > 0 ? '1rem' : 0 }}>
      {currentNodes.map(node => {
        if (node.type === 'folder') {
          const isCollapsed = collapsedFolders[node.id] ?? true;
          const descendantCourses = getDescendantCourses(node.id);

          return (
            <div
              key={node.id}
              style={{
                borderRadius: '0.5rem',
                border: '1px solid var(--border-subtle)',
                backgroundColor: depth === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                padding: '0.4rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '0.2rem 0.25rem'
                }}
                onClick={() => onToggleFolder(node.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <ChevronDown size={15} />
                  </button>
                  <Folder size={16} color={node.color || 'var(--accent-primary)'} />
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                    ({descendantCourses.length} cours)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFolder(node);
                  }}
                  disabled={descendantCourses.length === 0}
                  className="btn btn-outline hover-lift"
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.6rem',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap',
                    opacity: descendantCourses.length === 0 ? 0.4 : 1,
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)'
                  }}
                  title={`Cibler les ${descendantCourses.length} cours de ce dossier`}
                >
                  <FolderPlus size={12} />
                  <span>Tout le dossier</span>
                </button>
              </div>

              {!isCollapsed && (
                <div style={{ marginTop: '0.15rem' }}>
                  <ChatCourseTreeSelector
                    nodes={nodes}
                    parentId={node.id}
                    depth={depth + 1}
                    collapsedFolders={collapsedFolders}
                    onToggleFolder={onToggleFolder}
                    onSelectCourse={onSelectCourse}
                    onSelectFolder={onSelectFolder}
                    getDescendantCourses={getDescendantCourses}
                  />
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={node.id}
            onClick={() => onSelectCourse(node)}
            className="hover-lift"
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <FileText size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.name}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: 'auto', flexShrink: 0 }}
            >
              Cibler
            </button>
          </div>
        );
      })}
    </div>
  );
}
