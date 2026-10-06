import React, { useState, useEffect, useRef } from 'react';
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
  Code
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import {
  askChatSofia,
  generateChatTitle,
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

      // Call Chat SofIA Universal API
      const result = await askChatSofia(historyToPass, {
        useWebSearch,
        attachmentContext: currentAttachment?.content,
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
                    onClick={() => handleSendMessage(prompt.text)}
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
              placeholder="Posez votre question à SofIA (ex: concept, formule, méthodologie, code...)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <div className="chat-input-tools">
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
                disabled={!inputText.trim() || isLoading}
                title="Envoyer le message (Entrée)"
              >
                {isLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>

          <div className="chat-disclaimer">
            SofIA peut générer des réponses inexactes. Vérifiez toujours les informations critiques avec vos sources universitaires.
          </div>
        </div>
      </div>
    </div>
  );
}
