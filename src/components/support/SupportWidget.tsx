import React, { useState, useRef, useEffect } from 'react';
import { 
  HelpCircle, 
  X, 
  Send, 
  Bot, 
  ChevronRight, 
  ArrowLeft,
  BookOpen,
  CreditCard,
  FileText,
  Zap,
  Calendar,
  BarChart3
} from 'lucide-react';
import { 
  SUPPORT_CATEGORIES, 
  SUPPORT_KNOWLEDGE_BASE, 
  findBestSupportAnswer, 
  type SupportFAQItem 
} from './SupportKnowledge';
import { mdToHtml } from '../../lib/markdown';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
  faqItem?: SupportFAQItem;
}

export const SupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: "👋 Bonjour ! Je suis le **Guide SofIA**. Posez-moi une question sur le fonctionnement de l'application, les abonnements, les annales ou les révisions !"
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || searchQuery).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setSearchQuery('');

    // Instant deterministic answer matching (0 token)
    const match = findBestSupportAnswer(query);

    setTimeout(() => {
      if (match) {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            text: match.answer,
            faqItem: match
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            text: `Je n'ai pas trouvé de réponse exacte à *" ${query} "*. \n\nConsultez les rubriques ci-dessous ou essayez des mots-clés simples comme : **"Premium"**, **"Google Drive"**, **"Annales"**, **"Anki"**, **"Planning"** ou **"Déplacer cours"**.`
          }
        ]);
      }
    }, 150);
  };

  const handleSelectFAQ = (item: SupportFAQItem) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: item.title
    };
    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'bot',
      text: item.answer,
      faqItem: item
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setSelectedCategory(null);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    premium: <CreditCard size={15} color="#8b5cf6" />,
    courses: <BookOpen size={15} color="#3b82f6" />,
    annales: <FileText size={15} color="#10b981" />,
    flashcards: <Zap size={15} color="#f59e0b" />,
    planning: <Calendar size={15} color="#ec4899" />,
    stats: <BarChart3 size={15} color="#06b6d4" />
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Aide et Guide SofIA"
        style={{
          position: 'fixed',
          bottom: '1.75rem',
          right: '1.75rem',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: isOpen ? '0.75rem' : '0.75rem 1.15rem',
          borderRadius: '2rem',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(8px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(79, 70, 229, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.35)';
        }}
        title="Ouvrir le guide d'utilisation et SAV SofIA"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isOpen ? <X size={20} /> : <HelpCircle size={20} />}
          {!isOpen && (
            <span 
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981'
              }}
            />
          )}
        </div>
        {!isOpen && (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.01em' }}>
            Aide & Guide
          </span>
        )}
      </button>

      {/* Slide-Up Popover Container */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.75rem',
            zIndex: 998,
            width: '380px',
            maxWidth: 'calc(100vw - 2.5rem)',
            height: '560px',
            maxHeight: 'calc(100vh - 7rem)',
            backgroundColor: 'var(--bg-elevated, #ffffff)',
            borderRadius: '1.25rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'supportPopoverIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: 'blur(16px)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Guide & Support SofIA
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                  ● Réponses instantanées (0 token)
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: '0.4rem'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Category Filters */}
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              overflowX: 'auto',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              scrollbarWidth: 'none'
            }}
          >
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '1rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <ArrowLeft size={12} /> Tous
              </button>
            )}
            {SUPPORT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '1rem',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  backgroundColor: selectedCategory === cat.id ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: selectedCategory === cat.id ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}
              >
                {categoryIcons[cat.id]}
                <span>{cat.label.split(' ')[1]}</span>
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              fontSize: '0.86rem'
            }}
          >
            {/* If a category is selected, show its curated questions */}
            {selectedCategory ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Questions fréquentes :
                </span>
                {SUPPORT_KNOWLEDGE_BASE.filter(item => item.category === selectedCategory).map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectFAQ(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.65rem',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                    }}
                  >
                    <span>{item.title}</span>
                    <ChevronRight size={14} color="var(--text-secondary)" />
                  </button>
                ))}
              </div>
            ) : (
              <>
                {messages.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                      gap: '0.25rem'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '90%',
                        padding: '0.75rem 0.95rem',
                        borderRadius: m.role === 'user' ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                        backgroundColor: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                        lineHeight: '1.5',
                        border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} 
                        style={{ fontSize: '0.84rem' }}
                      />
                      {m.faqItem?.actionHint && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '0.4rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            fontSize: '0.74rem',
                            color: 'var(--accent-primary)',
                            fontWeight: 600
                          }}
                        >
                          💡 {m.faqItem.actionHint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Quick suggestions when conversation starts */}
                {messages.length === 1 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Suggestions rapides :
                    </span>
                    {[
                      "Comment passer au forfait Premium ?",
                      "Comment fonctionne le module Annales ?",
                      "Limite de 50 pages sur les PDF",
                      "Raccourcis clavier pour les flashcards"
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(s)}
                        style={{
                          textAlign: 'left',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.5rem',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{s}</span>
                        <ChevronRight size={13} color="var(--accent-primary)" />
                      </button>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Footer Input */}
          <div
            style={{
              padding: '0.75rem 0.85rem',
              backgroundColor: 'var(--bg-elevated)',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Posez votre question (ex: Drive, Annales...)"
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  borderRadius: '1.25rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: searchQuery.trim() ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: searchQuery.trim() ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: searchQuery.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Popover Animation CSS */}
      <style>{`
        @keyframes supportPopoverIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};
