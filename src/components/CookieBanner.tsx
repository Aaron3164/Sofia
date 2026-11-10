import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'sofia_cookie_consent_v1';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const handleRefuse = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential_only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Gestion des cookies"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(500px, calc(100% - 24px))',
        backgroundColor: 'rgba(24, 24, 27, 0.94)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        zIndex: 9999,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        color: '#f4f4f5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        animation: 'slideUpCookie 0.25s ease-out forwards',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <Cookie size={16} color="#fda4af" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: '1.35', color: '#a1a1aa' }}>
          Cookies essentiels uniquement.{' '}
          <a
            href="/legal"
            style={{ color: '#fda4af', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            Mentions & RGPD
          </a>
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={handleRefuse}
          type="button"
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#a1a1aa',
            fontSize: '0.72rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a1a1aa';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          Refuser
        </button>

        <button
          onClick={handleAccept}
          type="button"
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            backgroundColor: '#e11d48',
            border: '1px solid #e11d48',
            color: '#ffffff',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#be123c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e11d48';
          }}
        >
          Accepter
        </button>
      </div>

      <style>{`
        @keyframes slideUpCookie {
          from {
            opacity: 0;
            transform: translate(-50%, 15px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </aside>
  );
}
