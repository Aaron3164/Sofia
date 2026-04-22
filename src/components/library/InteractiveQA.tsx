import React, { useState, useEffect } from 'react';
import { Send, User, Bot, Plus, Trash2, MessageSquare } from 'lucide-react';
import { askQuestion, generateChatTitle } from '../../lib/gemini';
import { mdToHtml } from '../../lib/markdown';

export interface QAMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface QAConversation {
  id: string;
  title: string;
  messages: QAMessage[];
}

import type { AIPreferences } from '../../lib/gemini';

interface InteractiveQAProps {
  data: string | null;
  onUpdate: (newData: string) => void;
  documentContext: string;
  preferences?: AIPreferences;
}

export const InteractiveQA: React.FC<InteractiveQAProps> = ({ data, onUpdate, documentContext, preferences }) => {
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [conversations, setConversations] = useState<QAConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Parse data on mount or when data changes externally
  useEffect(() => {
    try {
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if ('role' in parsed[0]) {
            // Legacy format migration
            const legacyConv: QAConversation = {
              id: 'legacy-chat',
              title: 'Discussion initiale',
              messages: parsed as QAMessage[]
            };
            setConversations([legacyConv]);
            if (!activeChatId) setActiveChatId('legacy-chat');
          } else if ('title' in parsed[0]) {
            // New format
            setConversations(parsed as QAConversation[]);
            if (!activeChatId && parsed.length > 0) setActiveChatId(parsed[0].id);
          }
        } else {
          setConversations([]);
        }
      }
    } catch (e) {
      console.error('Failed to parse QA history', e);
    }
  }, [data]);

  const activeConversation = conversations.find(c => c.id === activeChatId) || null;
  const messages = activeConversation?.messages || [];

  const handleCreateNewChat = () => {
    setActiveChatId(null);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    if (activeChatId === id) {
      setActiveChatId(updated.length > 0 ? updated[0].id : null);
    }
    setConversations(updated);
    onUpdate(JSON.stringify(updated));
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !documentContext) return;

    const newQuestion: QAMessage = { role: 'user', text: inputValue.trim() };
    const isNewChat = !activeChatId || !activeConversation;
    const currentChatId = isNewChat ? crypto.randomUUID() : activeChatId;

    let updatedConversations = [...conversations];

    if (isNewChat) {
      const newConv: QAConversation = {
        id: currentChatId,
        title: 'Génération en cours...',
        messages: [newQuestion]
      };
      updatedConversations.push(newConv);
      setActiveChatId(currentChatId);
    } else {
      updatedConversations = updatedConversations.map(c => 
        c.id === currentChatId ? { ...c, messages: [...c.messages, newQuestion] } : c
      );
    }

    // Optimistic UI update
    setInputValue('');
    setConversations(updatedConversations);
    onUpdate(JSON.stringify(updatedConversations));
    setIsAsking(true);

    try {
      if (isNewChat) {
        // Run both API calls concurrently
        const [answerText, title] = await Promise.all([
          askQuestion(documentContext.substring(0, 300000), newQuestion.text, preferences),
          generateChatTitle(newQuestion.text)
        ]);
        const newAnswer: QAMessage = { role: 'ai', text: answerText };
        
        updatedConversations = updatedConversations.map(c => 
          c.id === currentChatId ? { ...c, title, messages: [...c.messages, newAnswer] } : c
        );
      } else {
        const answerText = await askQuestion(documentContext.substring(0, 300000), newQuestion.text, preferences);
        const newAnswer: QAMessage = { role: 'ai', text: answerText };
        
        updatedConversations = updatedConversations.map(c => 
          c.id === currentChatId ? { ...c, messages: [...c.messages, newAnswer] } : c
        );
      }
      
      setConversations(updatedConversations);
      onUpdate(JSON.stringify(updatedConversations));
    } catch (error) {
      alert("Erreur lors de la communication avec l'IA. Veuillez réessayer.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* Top Bar for Conversations */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto',
        scrollbarWidth: 'none', 
      }}>
        <button 
          onClick={handleCreateNewChat}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: !activeChatId ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: !activeChatId ? 'white' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
          }}
        >
          <Plus size={16} /> Nouvelle discussion
        </button>
        
        {conversations.map(conv => (
          <div 
            key={conv.id}
            onClick={() => setActiveChatId(conv.id)}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: activeChatId === conv.id ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${activeChatId === conv.id ? 'var(--border-color)' : 'transparent'}`,
              color: activeChatId === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', transition: 'all 0.2s'
            }}
          >
            <MessageSquare size={14} />
            <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {conv.title}
            </span>
            <button 
              onClick={(e) => handleDeleteChat(conv.id, e)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', 
                color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem',
                opacity: activeChatId === conv.id ? 1 : 0.5, borderRadius: '4px'
              }}
              title="Supprimer la discussion"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {messages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '1rem' }}>
          <Bot size={48} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
          <p style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>Salut, c'est Sofia ! 👋</p>
          <p>Pose-moi n'importe quelle question sur ton cours, je suis là pour t'aider à tout comprendre.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              style={{
                display: 'flex',
                gap: '1rem',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: m.role === 'user' ? 'white' : 'var(--text-primary)'
              }}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div style={{
                backgroundColor: 'transparent',
                padding: '0',
                borderRadius: '1.5rem',
                maxWidth: '100%',
                lineHeight: '1.7',
                flex: 1
              }}>
                {m.role === 'ai' ? (
                  <div className="study-resume-container" style={{ padding: '0', height: 'auto', overflow: 'visible' }}>
                    <div className="resume-glass-wrapper" style={{ padding: '2rem', margin: '0', maxWidth: '100%', fontSize: '1rem' }}>
                      <div className="resume-content-rendered" dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '0.8rem 1.2rem', 
                    backgroundColor: 'var(--accent-primary)', 
                    color: 'white', 
                    borderRadius: '1.25rem', 
                    borderTopRightRadius: '0.1rem', 
                    marginLeft: m.role === 'user' ? 'auto' : '0', 
                    width: 'fit-content',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                  }}>
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAsking && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
               <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} />
              </div>
              <div className="pulse" style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '1rem', color: 'var(--text-secondary)' }}>
                Sofia réfléchit...
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <input 
          type="text" 
          className="input-field" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pose ta question à Sofia..."
          style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          disabled={isAsking}
        />
        <button 
          className="btn btn-primary shadow-sm" 
          onClick={handleSend}
          disabled={isAsking || !inputValue.trim()}
          style={{ padding: '0 1.5rem', borderRadius: '0.5rem' }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
