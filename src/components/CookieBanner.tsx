import { useState, useEffect } from 'react';
import { ShieldCheck, Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'sofia_cookie_consent_v1';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si le consentement a déjà été enregistré
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      // Léger délai pour une apparition fluide et non intrusive
      const timer = setTimeout(() => setIsVisible(true), 800);
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
      aria-label="Gestion des cookies et confidentialité"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(640px, calc(100% - 32px))',
        backgroundColor: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '18px 22px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        zIndex: 9999,
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        color: '#f4f4f5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        animation: 'slideUpCookie 0.3s ease-out forwards',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'rgba(225, 29, 72, 0.12)',
            border: '1px solid rgba(225, 29, 72, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#f43f5e',
          }}
        >
          <Cookie size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
              Respect de votre vie privée & Cookies
            </h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                fontWeight: 500,
              }}
            >
              <ShieldCheck size={12} /> RGPD
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.45', color: '#a1a1aa' }}>
            Sof.IA utilise des cookies strictement techniques pour maintenir votre session sécurisée et mémoriser vos préférences d'étude. Nous n'utilisons aucun traceur publicitaire tiers.{' '}
            <a
              href="/legal"
              style={{ color: '#fda4af', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              En savoir plus sur nos engagements RGPD
            </a>.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          flexWrap: 'wrap',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          onClick={handleRefuse}
          type="button"
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#d4d4d8',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
          }}
        >
          Essentiels uniquement
        </button>

        <button
          onClick={handleAccept}
          type="button"
          style={{
            padding: '8px 20px',
            borderRadius: '999px',
            backgroundColor: '#e11d48',
            border: '1px solid #e11d48',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(225, 29, 72, 0.3)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#be123c';
            e.currentTarget.style.borderColor = '#be123c';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e11d48';
            e.currentTarget.style.borderColor = '#e11d48';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Tout accepter
        </button>
      </div>

      <style>{`
        @keyframes slideUpCookie {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
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
