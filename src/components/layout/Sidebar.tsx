import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Sparkles, User as UserIcon, Crown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDailyUsage } from '../../lib/gemini';
import './Layout.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const [usage, setUsage] = React.useState<number | null>(null);

  const navItems = [
    { to: '/', label: '📚 Bibliothèque' },
    { to: '/planning', label: '📅 Planification' },
    { to: '/flashcards', label: '⚡ Flashcards' },
    { to: '/statistics', label: '📊 Statistiques' },
    { to: '/dashboard', label: '🚀 Tableau de bord' },
  ];

  React.useEffect(() => {
    if (user) {
      getDailyUsage().then(setUsage);
    }
  }, [user]);

  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-placeholder">Sof.IA</div>
        <button className="mobile-only close-sidebar-btn" onClick={onClose} aria-label="Close Menu">
          <X size={24} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (window.innerWidth <= 768 && onClose) onClose();
            }}
          >
            <span style={{ fontSize: '1.2rem', marginLeft: '0.2rem' }}>{item.label}</span>
          </NavLink>
        ))}
        
        <button 
          className="nav-item"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-global-search'));
            if (window.innerWidth <= 768 && onClose) onClose();
          }}
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginTop: '1rem', color: 'var(--text-secondary)' }}
        >
          <span style={{ fontSize: '1.1rem', marginLeft: '0.2rem' }}>🔍 Recherche Globale</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <NavLink to="/dashboard" className="user-profile-nav hover-lift" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '1rem', 
              marginBottom: '0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '1rem',
              textDecoration: 'none',
              color: 'inherit',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <UserIcon size={16} color="white" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || 'Utilisateur'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {profile?.plan === 'premium' && <Crown size={10} className="text-accent" />}
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    Plan {profile?.plan || 'gratuit'}
                  </p>
                </div>
              </div>
            </NavLink>

            {/* Quota Indicator */}
            {profile?.plan !== 'premium' && usage !== null && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: 'var(--bg-elevated)', 
                borderRadius: '0.75rem', 
                marginBottom: '1rem',
                fontSize: '0.75rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 500 }}>
                  <span>Générations IA</span>
                  <span>{usage} / 20</span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min((usage / 20) * 100, 100)}%`, 
                    height: '100%', 
                    backgroundColor: usage >= 18 ? 'var(--danger)' : 'var(--accent-primary)',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            )}
            
            {profile?.plan === 'premium' && (
              <div style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: 'var(--bg-elevated)', 
                borderRadius: '0.75rem', 
                marginBottom: '1rem',
                fontSize: '0.75rem',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textAlign: 'center',
                border: '1px solid var(--accent-primary)',
                opacity: 0.8
              }}>
                ✨ Accès Illimité
              </div>
            )}
          </>
        )}
        <button className="theme-toggle hover-lift" onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : theme === 'dark' ? <Sparkles size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Mode Sombre' : theme === 'dark' ? 'Mode Verre' : 'Mode Clair'}</span>
        </button>
      </div>
    </aside>
  );
};
