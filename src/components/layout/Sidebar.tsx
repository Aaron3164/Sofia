import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sparkles, User as UserIcon, Crown, X, Library, Calendar, Zap, BarChart3, LayoutDashboard, Search, BookX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDailyUsage } from '../../lib/gemini';
import { ErrorBookService } from '../../lib/ErrorBookService';
import './Layout.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { user, profile, updatePreferences } = useAuth();
  const [usage, setUsage] = React.useState<number | null>(null);
  const [errorCount, setErrorCount] = React.useState<number>(() => ErrorBookService.getErrors().length);

  React.useEffect(() => {
    const handleErrorsUpdate = () => {
      setErrorCount(ErrorBookService.getErrors().length);
    };
    window.addEventListener('sofia-error-book-updated', handleErrorsUpdate);
    return () => window.removeEventListener('sofia-error-book-updated', handleErrorsUpdate);
  }, []);

  const navItems = [
    { to: '/', label: 'Bibliothèque', icon: <Library size={17} />, exact: true },
    { to: '/planning', label: 'Planification', icon: <Calendar size={17} /> },
    { to: '/flashcards', label: 'Flashcards', icon: <Zap size={17} /> },
    { to: '/errors', label: "Carnet d'erreurs", icon: <BookX size={17} />, badge: errorCount > 0 ? errorCount : undefined },
    { to: '/statistics', label: 'Statistiques', icon: <BarChart3 size={17} /> },
    { to: '/dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={17} /> },
  ];

  React.useEffect(() => {
    const refreshUsage = () => {
      if (user) {
        getDailyUsage().then(setUsage);
      }
    };

    refreshUsage();

    window.addEventListener('ai-usage-updated', refreshUsage);
    return () => {
      window.removeEventListener('ai-usage-updated', refreshUsage);
    };
  }, [user]);

  const handleSelectTheme = async (targetTheme: 'dark' | 'glass') => {
    setTheme(targetTheme);
    if (user && updatePreferences) {
      try {
        await updatePreferences({ theme: targetTheme });
      } catch (err) {
        console.error('Failed to update theme preference:', err);
      }
    }
  };

  const themeOptions: { id: 'dark' | 'glass'; label: string; icon: React.ReactNode }[] = [
    { id: 'dark', label: 'Sombre', icon: <Moon size={14} /> },
    { id: 'glass', label: 'Aurore', icon: <Sparkles size={14} /> },
  ];

  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-placeholder" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/sofia-logo.png" alt="Logo Sof.IA" style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }} />
          <span>Sof.IA</span>
        </div>
        <button className="mobile-only close-sidebar-btn" onClick={onClose} aria-label="Fermer le menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (window.innerWidth <= 768 && onClose) onClose();
            }}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== undefined && (
              <span style={{
                background: 'rgba(225, 29, 72, 0.15)',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(225, 29, 72, 0.3)',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="nav-section-label">Outils</div>

        <button
          className="nav-item"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-global-search'));
            if (window.innerWidth <= 768 && onClose) onClose();
          }}
          title="Recherche Globale (Ctrl+K)"
          style={{ 
            width: '100%', 
            border: 'none', 
            background: 'transparent', 
            cursor: 'pointer', 
            fontFamily: 'inherit', 
            textAlign: 'left',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="nav-item-icon"><Search size={17} /></span>
            <span>Recherche</span>
          </span>
          <kbd style={{ fontSize: '0.68rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1px 5px', fontFamily: 'inherit', fontWeight: 500 }}>Ctrl K</kbd>
        </button>

        <NavLink
          to="/chat"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => {
            if (window.innerWidth <= 768 && onClose) onClose();
          }}
        >
          <span className="nav-item-icon"><Sparkles size={17} /></span>
          Chat SofIA
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <NavLink to="/dashboard" className="user-profile-card">
              <div className="user-avatar">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserIcon size={15} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{profile?.full_name || 'Utilisateur'}</div>
                <div className="user-plan">
                  {profile?.plan === 'premium' && <Crown size={11} style={{ color: 'var(--accent-primary)' }} />}
                  <span>Forfait {profile?.plan === 'premium' ? 'Premium' : 'Gratuit'}</span>
                </div>
              </div>
            </NavLink>

            {usage !== null && (
              <div className="usage-bar-container">
                <div className="usage-bar-header">
                  <span>Crédits IA du jour</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: usage >= (profile?.plan === 'premium' ? 45 : 4) ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {usage} / {profile?.plan === 'premium' ? 50 : 5}
                  </span>
                </div>
                <div className="usage-bar-track">
                  <div
                    className="usage-bar-fill"
                    style={{
                      width: `${Math.min((usage / (profile?.plan === 'premium' ? 50 : 5)) * 100, 100)}%`,
                      background: usage >= (profile?.plan === 'premium' ? 45 : 4) ? 'var(--danger)' : undefined,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="theme-selector-group" role="group" aria-label="Sélecteur de thème">
          {themeOptions.map((opt) => {
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`theme-selector-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectTheme(opt.id)}
                title={`Thème ${opt.label}${isActive ? ' (Actif)' : ''}`}
                aria-pressed={isActive}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
