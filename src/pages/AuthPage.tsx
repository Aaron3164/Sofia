import React, { useState, useEffect } from 'react';
import { Crown, ShieldCheck, Mail, Lock, ArrowRight, Brain, Zap, Calendar, Sparkles, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import LandingPage from './LandingPage';

export default function AuthPage() {
  const { signIn, signUp, resetPassword, updatePassword, loading } = useAuth();
  const { alert } = useDialog();
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if URL contains reset password recovery tokens / hash / code
  useEffect(() => {
    const handleRecovery = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const urlParams = new URLSearchParams(search);
      const code = urlParams.get('code');

      if (code) {
        setShowAuth(true);
        setIsResetMode(true);
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (e: any) {
          console.warn('[AuthPage] exchangeCodeForSession error:', e);
        }
      } else if (hash && (hash.includes('type=recovery') || hash.includes('reset-password') || hash.includes('access_token'))) {
        setShowAuth(true);
        setIsResetMode(true);
        // If hash contains access_token and refresh_token, set session
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } catch (e: any) {
            console.warn('[AuthPage] setSession error:', e);
          }
        }
      }
    };

    handleRecovery();

    // Also listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowAuth(true);
        setIsResetMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isResetMode) {
        if (newPassword.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          setIsSubmitting(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.');
          setIsSubmitting(false);
          return;
        }
        await updatePassword(newPassword);
        setResetSuccess(true);
        await alert('Votre mot de passe a été mis à jour avec succès !');
        setIsResetMode(false);
        setIsForgotPassword(false);
        window.location.hash = '';
      } else if (isForgotPassword) {
        if (!email.trim()) {
          setError('Veuillez renseigner votre adresse e-mail.');
          setIsSubmitting(false);
          return;
        }
        await resetPassword(email.trim());
        setResetSent(true);
      } else if (isSignUp) {
        await signUp(email, password);
        await alert('Compte créé ! Veuillez vérifier votre e-mail (si activé) ou vous connecter.');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Trop de demandes d\'e-mails en peu de temps. Par sécurité, Supabase impose une pause d\'environ 60 secondes. Veuillez patienter 1 minute avant de réessayer.');
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Identifiants incorrects. Vérifiez votre adresse e-mail et votre mot de passe.');
      } else if (msg.toLowerCase().includes('user already registered')) {
        setError('Un compte existe déjà avec cette adresse e-mail.');
      } else if (msg.toLowerCase().includes('auth session missing')) {
        setError('Le lien de réinitialisation a expiré ou est invalide. Veuillez demander un nouveau lien.');
      } else {
        setError(msg || 'Une erreur est survenue.');
      }
    } finally {
      setIsSubmitting(false);
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
              {isResetMode
                ? 'Nouveau mot de passe'
                : isForgotPassword
                ? 'Mot de passe oublié'
                : isSignUp
                ? 'Créer un compte'
                : 'Bon retour parmi nous'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'rgba(59, 7, 100, 0.65)' }}>
              {isResetMode
                ? 'Choisis un nouveau mot de passe sécurisé'
                : isForgotPassword
                ? 'Reçois un lien de réinitialisation sécurisé par e-mail'
                : isSignUp
                ? 'Commence à réviser intelligemment'
                : 'Connecte-toi à ton espace Sof.IA'}
            </p>
          </div>

          {/* Success messages */}
          {resetSent && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#065f46', padding: '0.9rem 1rem', borderRadius: '0.75rem', fontSize: '0.88rem',
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem', lineHeight: 1.5,
            }}>
              <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>E-mail envoyé !</strong> Vérifie ta boîte de réception (et tes spams) pour réinitialiser ton mot de passe.
              </div>
            </div>
          )}

          {resetSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#065f46', padding: '0.9rem 1rem', borderRadius: '0.75rem', fontSize: '0.88rem',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
            }}>
              <CheckCircle size={18} color="#10b981" />
              <span>Mot de passe réinitialisé ! Tu peux maintenant te connecter.</span>
            </div>
          )}

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
            {isResetMode ? (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#3b0764' }}>
                    Nouveau mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(112, 26, 117, 0.4)' }} size={15} />
                    <input
                      type="password" required value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
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
                    Confirmer le mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(112, 26, 117, 0.4)' }} size={15} />
                    <input
                      type="password" required value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
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
              </>
            ) : (
              <>
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

                {!isForgotPassword && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3b0764' }}>
                        Mot de passe
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setError(null);
                            setResetSent(false);
                          }}
                          style={{
                            background: 'none', border: 'none', color: '#db2777',
                            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            padding: 0, fontFamily: "'Inter', sans-serif",
                          }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>
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
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loading}
              style={{
                padding: '0.9rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: (isSubmitting || loading) ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(219, 39, 119, 0.35)',
                transition: 'all 0.2s ease',
                marginTop: '0.25rem',
                opacity: (isSubmitting || loading) ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!isSubmitting && !loading) e.currentTarget.style.boxShadow = '0 8px 32px rgba(219, 39, 119, 0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(219, 39, 119, 0.35)'; }}
            >
              {(isSubmitting || loading)
                ? 'Chargement...'
                : isResetMode
                ? 'Enregistrer le nouveau mot de passe'
                : isForgotPassword
                ? 'Envoyer le lien de réinitialisation'
                : isSignUp
                ? 'Créer mon compte'
                : 'Se connecter'}
              {!isSubmitting && !loading && (
                isResetMode ? <KeyRound size={16} /> : isForgotPassword ? <Mail size={16} /> : <ArrowRight size={16} />
              )}
            </button>
          </form>

          {/* Toggle / Back options */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setResetSent(false);
                }}
                style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Inter', sans-serif", transition: '0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#be185d'}
                onMouseLeave={e => e.currentTarget.style.color = '#db2777'}
              >
                ← Revenir à la connexion
              </button>
            ) : isResetMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setError(null);
                }}
                style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Inter', sans-serif", transition: '0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#be185d'}
                onMouseLeave={e => e.currentTarget.style.color = '#db2777'}
              >
                ← Revenir à la connexion
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Inter', sans-serif", transition: '0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#be185d'}
                onMouseLeave={e => e.currentTarget.style.color = '#db2777'}
              >
                {isSignUp ? 'Déjà un compte ? Se connecter →' : "Pas encore de compte ? S'inscrire →"}
              </button>
            )}
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
