import React, { useState } from 'react';
import { Crown, ShieldCheck, Mail, Lock, ArrowRight, Brain, Zap, Calendar, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LandingPage from './LandingPage';

export default function AuthPage() {
  const { signIn, signUp, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email, password);
        alert('Compte créé ! Veuillez vérifier votre e-mail (si activé) ou vous connecter.');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    }
  };

  const features = [
    { icon: <Brain size={18} />, title: 'Fiches IA Instantanées', desc: 'Synthétise 100 pages de cours en quelques secondes.', color: '#db2777' },
    { icon: <Zap size={18} />, title: 'Flashcards & QCM Auto', desc: 'Jamais les mêmes questions deux fois. Format ECNi.', color: '#ea580c' },
    { icon: <Calendar size={18} />, title: 'Répétition Espacée', desc: 'Ton planning de révision optimal, calculé par l\'IA.', color: '#701a75' },
  ];

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#ffe4e6',
      backgroundImage: `
        linear-gradient(135deg, #ffedd5 0%, #fbcfe8 45%, #c084fc 100%),
        radial-gradient(circle at 10% 20%, rgba(249, 115, 22, 0.15) 0%, transparent 45%),
        radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.18) 0%, transparent 50%),
        radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)
      `,
      backgroundAttachment: 'fixed',
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── LEFT PANEL: Form ───────────────────────────────── */}
      <div className="auth-left-panel" style={{
        flex: '0 0 480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(219, 39, 119, 0.15)',
      }}>
        {/* Back */}
        <button
          onClick={() => setShowAuth(false)}
          style={{
            position: 'absolute', top: '1.5rem', left: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(219, 39, 119, 0.25)',
            padding: '0.45rem 0.9rem',
            borderRadius: '2rem',
            color: '#db2777',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(219, 39, 119, 0.05)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#be185d'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#db2777'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'; }}
        >
          <ArrowLeft size={14} /> Retour
        </button>

        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.05em',
              background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
            }}>
              Sof.IA
            </div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: '#3b0764', marginBottom: '0.35rem' }}>
              {isSignUp ? 'Créer un compte' : 'Bon retour parmi nous'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'rgba(59, 7, 100, 0.65)' }}>
              {isSignUp ? 'Commence à réviser intelligemment' : 'Connecte-toi à ton espace Sof.IA'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
              color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#3b0764' }}>
                Adresse e-mail
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(112, 26, 117, 0.4)' }} size={15} />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  style={{
                    width: '100%', padding: '0.8rem 0.875rem 0.8rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid rgba(219, 39, 119, 0.18)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#3b0764', fontSize: '0.9rem',
                    fontWeight: 500,
                    outline: 'none', fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#db2777'; e.target.style.boxShadow = '0 0 0 3px rgba(219, 39, 119, 0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(219, 39, 119, 0.18)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#3b0764' }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(112, 26, 117, 0.4)' }} size={15} />
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '0.8rem 0.875rem 0.8rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid rgba(219, 39, 119, 0.18)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#3b0764', fontSize: '0.9rem',
                    fontWeight: 500,
                    outline: 'none', fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#db2777'; e.target.style.boxShadow = '0 0 0 3px rgba(219, 39, 119, 0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(219, 39, 119, 0.18)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.9rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(219, 39, 119, 0.35)',
                transition: 'all 0.2s ease',
                marginTop: '0.25rem',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 8px 32px rgba(219, 39, 119, 0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(219, 39, 119, 0.35)'; }}
            >
              {loading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Inter', sans-serif", transition: '0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#be185d'}
              onMouseLeave={e => e.currentTarget.style.color = '#db2777'}
            >
              {isSignUp ? 'Déjà un compte ? Se connecter →' : "Pas encore de compte ? S'inscrire →"}
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(59, 7, 100, 0.5)', fontWeight: 600 }}>
              <ShieldCheck size={12} /> Sécurisé par Supabase
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(59, 7, 100, 0.5)', fontWeight: 600 }}>
              <Crown size={12} /> Premium dispo
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Marketing ─────────────────────────── */}
      <div className="auth-right-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.9rem', borderRadius: '2rem', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(219, 39, 119, 0.25)', color: '#db2777', fontSize: '0.78rem', fontWeight: 800, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 4px 12px rgba(219, 39, 119, 0.05)' }}>
            <Sparkles size={12} /> Pour les filières exigeantes
          </div>

          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 900, color: '#3b0764', lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
            L'IA qui comprend tes études.
            <br />
            <span style={{ background: 'linear-gradient(135deg, #db2777, #ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Pas les autres.
            </span>
          </h2>

          <p style={{ fontSize: '0.95rem', color: 'rgba(59, 7, 100, 0.75)', marginBottom: '2.5rem', lineHeight: 1.65 }}>
            Conçue pour la médecine, le droit et toutes les formations à volume de contenu massif.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '1rem',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 8px 32px rgba(219, 39, 119, 0.05)',
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: `${f.color}15`, border: `1px solid ${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#3b0764', marginBottom: '0.2rem' }}>{f.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(59, 7, 100, 0.7)' }}>{f.desc}</div>
                </div>
                <CheckCircle size={16} color={f.color} style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hide right panel on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .auth-right-panel { display: none !important; }
          .auth-left-panel { flex: 1 !important; border-right: none !important; width: 100vw !important; }
        }
      `}</style>
    </div>
  );
}
