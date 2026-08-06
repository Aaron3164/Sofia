import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Sparkles, User as UserIcon, Crown, X, Library, Calendar, Zap, BarChart3, LayoutDashboard, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDailyUsage } from '../../lib/gemini';
import './Layout.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { user, profile, updatePreferences } = useAuth();
  const [usage, setUsage] = React.useState<number | null>(null);

  const navItems = [
    { to: '/', label: 'Bibliothèque', icon: <Library size={17} />, exact: true },
    { to: '/planning', label: 'Planification', icon: <Calendar size={17} /> },
    { to: '/flashcards', label: 'Flashcards', icon: <Zap size={17} /> },
    { to: '/statistics', label: 'Statistiques', icon: <BarChart3 size={17} /> },
    { to: '/dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={17} /> },
  ];

  React.useEffect(() => {
    if (user) {
      getDailyUsage().then(setUsage);
    }
  }, [user]);

  const handleToggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'glass' : 'light';
    setTheme(nextTheme);
    if (user && updatePreferences) {
      try {
        await updatePreferences({ theme: nextTheme });
      } catch (err) {
        console.error('Failed to update theme preference:', err);
      }
    }
  };

  const themeLabel = theme === 'light' ? 'Mode Sombre' : theme === 'dark' ? 'Mode Aurora' : 'Mode Clair';
  const themeIcon = theme === 'light' ? <Moon size={15} /> : theme === 'dark' ? <Sparkles size={15} /> : <Sun size={15} />;

  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-placeholder">Sof.IA</div>
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
            {item.label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Outils</div>

        <button
          className="nav-item"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-global-search'));
            if (window.innerWidth <= 768 && onClose) onClose();
          }}
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
        >
          <span className="nav-item-icon"><Search size={17} /></span>
          Recherche Globale
        </button>
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <NavLink to="/dashboard" className="user-profile-card">
              <div className="user-avatar">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserIcon size={16} color="white" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{profile?.full_name || 'Utilisateur'}</div>
                <div className="user-plan">
                  {profile?.plan === 'premium' && <Crown size={9} />}
                  Plan {profile?.plan || 'gratuit'}
                </div>
              </div>
            </NavLink>

            {profile?.plan !== 'premium' && usage !== null && (
              <div className="usage-bar-container">
                <div className="usage-bar-header">
                  <span>Générations IA</span>
                  <span style={{ color: usage >= 4 ? 'var(--danger)' : 'var(--text-muted)' }}>{usage} / 5</span>
                </div>
                <div className="usage-bar-track">
                  <div
                    className="usage-bar-fill"
                    style={{
                      width: `${Math.min((usage / 5) * 100, 100)}%`,
                      background: usage >= 18 ? 'var(--danger)' : undefined,
                    }}
                  />
                </div>
              </div>
            )}

            {profile?.plan === 'premium' && (
              <div className="premium-badge">✦ Accès Illimité</div>
            )}
          </>
        )}

        <button className="theme-toggle" onClick={handleToggleTheme} aria-label="Changer de thème">
          {themeIcon}
          <span>{themeLabel}</span>
        </button>
      </div>
    </aside>
  );
};
