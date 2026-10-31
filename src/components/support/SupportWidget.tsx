import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  ArrowLeft,
  BookOpen,
  CreditCard,
  FileText,
  Zap,
  Calendar,
  BarChart3,
  Search,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { 
  SUPPORT_CATEGORIES, 
  SUPPORT_KNOWLEDGE_BASE, 
  type SupportFAQItem 
} from './SupportKnowledge';
import { mdToHtml } from '../../lib/markdown';

export const SupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<SupportFAQItem | null>(null);

  const categoryIcons: Record<string, React.ReactNode> = {
    general: <Sparkles size={17} color="#6366f1" />,
    tools: <Search size={17} color="#8b5cf6" />,
    courses: <BookOpen size={17} color="#3b82f6" />,
    flashcards: <Zap size={17} color="#f59e0b" />,
    annales: <FileText size={17} color="#10b981" />,
    planning: <Calendar size={17} color="#ec4899" />,
    stats: <BarChart3 size={17} color="#06b6d4" />,
    premium: <CreditCard size={17} color="#10b981" />
  };

  // Filtered items based on optional search input
  const cleanFilter = filterQuery.toLowerCase().trim();
  const filteredKnowledge = SUPPORT_KNOWLEDGE_BASE.filter(item => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (!cleanFilter) return true;
    return (
      item.title.toLowerCase().includes(cleanFilter) ||
      item.keywords.some(k => k.toLowerCase().includes(cleanFilter)) ||
      item.answer.toLowerCase().includes(cleanFilter)
    );
  });

  const handleOpenItem = (item: SupportFAQItem) => {
    setActiveItem(item);
  };

  const handleBack = () => {
    if (activeItem) {
      setActiveItem(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('sofia_support_button_dismissed') === 'true';
  });

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    localStorage.setItem('sofia_support_button_dismissed', 'true');
  };

  const handleRestore = () => {
    setIsDismissed(false);
    localStorage.removeItem('sofia_support_button_dismissed');
  };

  return (
    <>
      {/* If dismissed, show a tiny unobtrusive dot in the bottom-right corner to reopen */}
      {isDismissed ? (
        <button
          onClick={handleRestore}
          aria-label="Afficher l'Aide SofIA"
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            zIndex: 999,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 0.55,
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.2s, transform 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.55';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Réafficher l'Aide & Support"
        >
          <HelpCircle size={15} color="var(--accent-primary)" />
        </button>
      ) : (
        /* Floating Trigger Button - Translucent Glassmorphic Style harmonized with UI */
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Aide et Guide SofIA"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: isOpen ? '0.55rem' : '0.5rem 0.95rem',
              borderRadius: '2rem',
              backgroundColor: 'rgba(255, 255, 255, 0.72)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(226, 230, 240, 0.85)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              backdropFilter: 'blur(12px)',
              opacity: isOpen ? 1 : 0.82
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(109, 40, 217, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = isOpen ? '1' : '0.82';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.72)';
              e.currentTarget.style.borderColor = 'rgba(226, 230, 240, 0.85)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)';
            }}
            title="Ouvrir le guide d'utilisation SofIA"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isOpen ? (
                <X size={17} color="var(--text-secondary)" />
              ) : (
                <HelpCircle size={17} color="var(--accent-primary)" />
              )}
            </div>
            {!isOpen && (
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                Aide & Guide
              </span>
            )}
          </button>

          {/* Discreet close button to dismiss the floating badge if it blocks files */}
          {!isOpen && (
            <button
              onClick={handleDismiss}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.05)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                opacity: 0.6,
                transition: 'opacity 0.15s, background 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
              title="Masquer le bouton (un point d'accès discret restera dans le coin)"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Slide-Up Popover Container */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.75rem',
            zIndex: 998,
            width: '400px',
            maxWidth: 'calc(100vw - 2.5rem)',
            height: '580px',
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
              {(selectedCategory || activeItem) && (
                <button
                  onClick={handleBack}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  title="Retour"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeItem ? activeItem.title : selectedCategory ? SUPPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label : 'Guide d\'utilisation SofIA'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {activeItem ? 'Fiche explicative' : 'Sélectionnez une rubrique ci-dessous'}
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

          {/* Optional Search / Filter bar */}
          {!activeItem && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-color)'
                }}
              >
                <Search size={14} color="var(--text-secondary)" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filtrer les questions (ex: Drive, Anki...)"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)'
                  }}
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} color="var(--text-secondary)" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            {/* VIEW 1: ACTIVE ANSWER DETAIL */}
            {activeItem ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    fontSize: '0.86rem'
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: mdToHtml(activeItem.answer) }} />

                  {activeItem.actionHint && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        fontSize: '0.76rem',
                        color: 'var(--accent-primary)',
                        fontWeight: 600
                      }}
                    >
                      💡 {activeItem.actionHint}
                    </div>
                  )}

                  {activeItem.id === 'how-to-start' && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        window.dispatchEvent(new CustomEvent('open-onboarding-tour'));
                      }}
                      style={{
                        marginTop: '0.75rem',
                        width: '100%',
                        padding: '0.65rem 1rem',
                        borderRadius: '0.65rem',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      <span>Lancer la visite guidée interactive</span>
                      <ChevronRight size={15} />
                    </button>
                  )}

                  {/* Auto Reply Notice */}
                  <div
                    style={{
                      marginTop: '0.85rem',
                      paddingTop: '0.65rem',
                      borderTop: '1px dashed var(--border-color)',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                      lineHeight: '1.35'
                    }}
                  >
                    🤖 Réponse automatique du Guide SofIA. Si votre question reste sans réponse, vous pouvez contacter notre service client.
                  </div>
                </div>

                <button
                  onClick={() => setActiveItem(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem',
                    borderRadius: '0.65rem',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={14} /> Retour à la liste des questions
                </button>
              </div>
            ) : selectedCategory || filterQuery ? (
              /* VIEW 2: LIST OF QUESTIONS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {filteredKnowledge.length} question{filteredKnowledge.length > 1 ? 's' : ''} disponible{filteredKnowledge.length > 1 ? 's' : ''} :
                  </span>
                  {selectedCategory && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setFilterQuery('');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Voir toutes les rubriques
                    </button>
                  )}
                </div>

                {filteredKnowledge.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucune question ne correspond à votre filtre.</p>
                  </div>
                ) : (
                  filteredKnowledge.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleOpenItem(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0.95rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        fontSize: '0.83rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ padding: '0.35rem', borderRadius: '0.4rem', backgroundColor: 'var(--bg-secondary)' }}>
                          <MessageSquare size={13} color="var(--accent-primary)" />
                        </div>
                        <span>{item.title}</span>
                      </div>
                      <ChevronRight size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* VIEW 3: HOME CATEGORIES GRID */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Interactive Tour Quick Launcher */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-onboarding-tour'));
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.85rem',
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(219, 39, 119, 0.12) 100%)',
                    border: '1px solid rgba(79, 70, 229, 0.28)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.28)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '0.6rem',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Visite guidée interactive
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        Redécouvrir les 4 piliers et astuces de SofIA
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.55rem' }}>
                  {SUPPORT_CATEGORIES.map(cat => {
                    const count = SUPPORT_KNOWLEDGE_BASE.filter(k => k.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: '0.85rem',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = cat.color;
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              backgroundColor: `${cat.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {categoryIcons[cat.id]}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {cat.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {count} guide{count > 1 ? 's' : ''} et réponse{count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--text-secondary)" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Customer Support notice */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)'
            }}
          >
            <span>Besoin d'une assistance personnalisée ?</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Service Client</span>
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
