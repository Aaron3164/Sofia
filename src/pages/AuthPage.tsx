import React, { useState } from 'react';
import { Crown, ShieldCheck, Mail, GraduationCap, Lock, ArrowRight, Brain, Zap, Calendar, Sparkles } from 'lucide-react';
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

  return (
    <div className="fade-in" style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative'
    }}>
      {/* Back Button */}
      <button 
        onClick={() => setShowAuth(false)}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          zIndex: 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          padding: '0.6rem 1.2rem',
          borderRadius: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.9rem',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
      >
        <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} /> Retour
      </button>

      {/* Left: Login Form */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem',
        zIndex: 2
      }}>
        <div className="glass-panel" style={{ 
          maxWidth: '430px', 
          width: '100%', 
          padding: '3rem', 
          borderRadius: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              backgroundColor: 'var(--accent-primary)', 
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px var(--accent-primary)40'
            }}>
              <GraduationCap size={28} color="white" />
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--text-primary)' }}>Sof.IA</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Votre assistant d'apprentissage intelligent</p>
          </div>

          {error && (
            <div style={{ backgroundColor: 'var(--danger)20', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="input"
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0.9rem', fontSize: '1rem', width: '100%', marginTop: '0.5rem', borderRadius: '0.75rem' }}
              disabled={loading}
            >
              {isSignUp ? "Créer mon compte" : "Se connecter"}
              <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>

          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5rem' }}
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Crown size={14} className="text-secondary" />
              Plans Premium disponibles
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <ShieldCheck size={14} className="text-success" />
              Sécurisé par Supabase
            </div>
        </div>
      </div>

      {/* Right: Marketing Panel (Desktop Only Hide on small screens via CSS/Inline) */}
      <div style={{ 
        flex: 1.2, 
        position: 'relative', 
        backgroundColor: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        overflow: 'hidden',
        color: 'white'
      }}>
        {/* Background Gradient & Pattern */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4338ca 100%)',
          opacity: 0.9
        }}></div>
        
        {/* Abstract shapes for depth */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', filter: 'blur(40px)' }}></div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '440px', textAlign: 'center' }}>
           <div style={{ 
             display: 'inline-flex', 
             alignItems: 'center', 
             gap: '0.5rem', 
             padding: '0.5rem 1rem', 
             backgroundColor: 'rgba(255,255,255,0.1)', 
             borderRadius: '2rem',
             fontSize: '0.85rem',
             fontWeight: 600,
             marginBottom: '2rem',
             backdropFilter: 'blur(8px)'
           }}>
             <Sparkles size={16} className="text-secondary" style={{ color: '#fbbf24' }} /> L'IA au service de ta réussite
           </div>

           <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
             L'intelligence artificielle au service de ta réussite.
           </h2>
           
           <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '3rem', lineHeight: 1.5 }}>
             Transforme tes cours en fiches et flashcards en un instant. Sofia t'accompagne jusqu'aux examens.
           </p>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left', width: '100%' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                 <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={20} />
                 </div>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Fiches IA Instantanées</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Synthétise 100 pages de cours en 5 minutes.</p>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                 <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={20} />
                 </div>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Flashcards Automatiques</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Révise comme un pro avec la répétition espacée.</p>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                 <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} />
                 </div>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Planning Intelligent</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Laisse l'IA gérer ton emploi du temps de révision.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
