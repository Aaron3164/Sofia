import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Brain, Zap, CheckCircle, Clock, Search, BarChart3, Shield, Star, ChevronRight, BookOpen, Layers } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <Zap size={22} />,
      title: 'Flashcards intelligentes',
      desc: 'Tes fiches de révision générées en 10 secondes depuis n\'importe quel PDF. Format Anki compatible.',
      color: '#a78bfa',
    },
    {
      icon: <Brain size={22} />,
      title: 'QCM & Examens Blancs',
      desc: 'Des questions adaptées au niveau de tes études — format ECNi, concours, partiels. Jamais les mêmes deux fois.',
      color: '#34d399',
    },
    {
      icon: <Search size={22} />,
      title: 'Recherche dans tous tes cours',
      desc: 'Retrouve une notion dans l\'ensemble de ta bibliothèque en une seule requête. L\'IA cherche à ta place.',
      color: '#f59e0b',
    },
    {
      icon: <Clock size={22} />,
      title: 'Répétition espacée',
      desc: 'Un calendrier de révision généré automatiquement, basé sur l\'algorithme de Leitner, pour ne plus rien oublier.',
      color: '#f87171',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Suivi de progression',
      desc: 'Visualise ton temps de travail, tes scores aux QCM et l\'évolution de ta maîtrise cours par cours.',
      color: '#60a5fa',
    },
    {
      icon: <Layers size={22} />,
      title: 'Bibliothèque organisée',
      desc: 'Tes cours rangés en dossiers, synchronisés sur le cloud. Accède à tout, depuis n\'importe quel appareil.',
      color: '#e879f9',
    },
  ];

  const testimonials = [
    { name: 'Léa M.', promo: 'D1 — Paris V', text: 'J\'ai passé mes partiels avec 40% de révisions en moins. La génération de QCM est bluffante.', rating: 5 },
    { name: 'Thomas K.', promo: 'L3 Droit — Lyon', text: 'Plus jamais je ne lis un polycopié de 80 pages en entier. Sofia extrait ce qui compte vraiment.', rating: 5 },
    { name: 'Camille R.', promo: 'P2 — Bordeaux', text: 'La recherche globale dans tous mes cours m\'a sauvé lors d\'une colle. Indispensable.', rating: 5 },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        scrollBehavior: 'smooth',
        backgroundColor: '#08090f',
        color: '#f0f2ff',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── NAV ────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2.5rem',
        background: 'rgba(8, 9, 15, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '1.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #a78bfa 0%, #34d399 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em',
        }}>
          Sof.IA
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'rgba(240,242,255,0.6)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, padding: '0.4rem 0.75rem' }}>
            Fonctionnalités
          </a>
          <a href="#pricing" style={{ color: 'rgba(240,242,255,0.6)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, padding: '0.4rem 0.75rem' }}>
            Tarifs
          </a>
          <button
            onClick={onGetStarted}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '2rem',
              border: '1px solid rgba(167,139,250,0.4)',
              background: 'rgba(167,139,250,0.1)',
              color: '#c4b5fd',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.2)'; e.currentTarget.style.borderColor = '#a78bfa'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.1)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; }}
          >
            Connexion
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated blobs */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '55vw', height: '55vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
          filter: 'blur(60px)', animation: 'floatSlow 12s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)',
          filter: 'blur(80px)', animation: 'floatSlow 16s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '15%',
          width: '25vw', height: '25vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(248,113,113,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)', animation: 'float 10s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        <div className="reveal reveal-scale" style={{ zIndex: 1, maxWidth: '860px' }}>
          {/* Label */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '2rem',
            border: '1px solid rgba(167,139,250,0.3)',
            background: 'rgba(167,139,250,0.08)',
            color: '#c4b5fd',
            fontSize: '0.82rem', fontWeight: 600,
            marginBottom: '2rem',
            backdropFilter: 'blur(8px)',
          }}>
            <Sparkles size={14} />
            IA de révision pour les filières exigeantes
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(3rem, 8vw, 5.5rem)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: '1.5rem',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 70%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
              animation: 'gradientShift 6s ease infinite',
            }}>
              Révise 3× plus vite.
            </span>
            <br />
            <span style={{ color: 'rgba(240,242,255,0.55)', fontWeight: 800 }}>
              Réussis vraiment.
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: 'rgba(240,242,255,0.55)',
            maxWidth: '620px',
            marginInline: 'auto',
            lineHeight: 1.65,
            marginBottom: '3rem',
          }}>
            Sof.IA transforme tes PDF en flashcards, QCM et fiches de révision en un clic.
            Conçue pour la médecine, le droit et toutes les filières à volume massif de contenu.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
            <button
              onClick={onGetStarted}
              style={{
                padding: '1rem 2.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                borderRadius: '0.875rem',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(124,58,237,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)'; }}
            >
              Commencer gratuitement <ArrowRight size={18} />
            </button>
            <button
              onClick={onGetStarted}
              style={{
                padding: '1rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                borderRadius: '0.875rem',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(240,242,255,0.8)',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              Voir une démo
            </button>
          </div>

          {/* Social proof mini */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(240,242,255,0.4)' }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />)}
              <span style={{ marginLeft: '0.3rem' }}>4.9 / 5 — 200+ étudiants</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(240,242,255,0.4)' }}>
              <Shield size={13} color="#34d399" />
              Données 100% privées
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(240,242,255,0.4)' }}>
              <CheckCircle size={13} color="#a78bfa" />
              Sans engagement
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '2rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Comment ça marche
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.75rem)', fontWeight: 800, color: '#f0f2ff', marginBottom: '1rem' }}>
              De ton PDF à ta révision,<br />en 3 étapes
            </h2>
            <p style={{ color: 'rgba(240,242,255,0.45)', fontSize: '1.05rem', maxWidth: '520px', marginInline: 'auto' }}>
              Pas d'installation, pas de configuration. Juste l'essentiel.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Upload ton cours', desc: 'Glisse ton PDF ou ton polycopié. Sof.IA extrait et indexe tout le contenu automatiquement.', icon: <BookOpen size={24} />, color: '#a78bfa' },
              { step: '02', title: 'L\'IA génère', desc: 'Flashcards, QCM adaptatifs, résumé structuré et explications détaillées créés à la demande.', icon: <Brain size={24} />, color: '#34d399' },
              { step: '03', title: 'Tu révises efficacement', desc: 'Suis ta progression, programme tes sessions, et arrive aux examens en confiance.', icon: <BarChart3 size={24} />, color: '#f59e0b' },
            ].map((item, i) => (
              <div key={i} className={`reveal reveal-up delay-${i + 1}`} style={{
                padding: '2rem',
                borderRadius: '1.25rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '3rem', fontWeight: 900, color: 'rgba(255,255,255,0.04)', letterSpacing: '-0.05em' }}>{item.step}</div>
                <div style={{ width: '48px', height: '48px', borderRadius: '0.875rem', background: `${item.color}18`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: '1.25rem' }}>
                  {item.icon}
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f0f2ff', marginBottom: '0.6rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(240,242,255,0.45)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" style={{ padding: '7rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '2rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fonctionnalités
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.75rem)', fontWeight: 800, color: '#f0f2ff', marginBottom: '1rem' }}>
              Tout ce dont tu as besoin,<br />rien de superflu
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <div key={i} className={`reveal reveal-up delay-${(i % 3) + 1}`} style={{
                padding: '1.75rem',
                borderRadius: '1.25rem',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.25s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = `${f.color}40`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '0.75rem', background: `${f.color}15`, border: `1px solid ${f.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '1rem' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f0f2ff', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(240,242,255,0.4)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.7rem,3.5vw,2.5rem)', fontWeight: 800, color: '#f0f2ff', marginBottom: '0.75rem' }}>
              Ils ont changé leur façon de réviser
            </h2>
            <p style={{ color: 'rgba(240,242,255,0.4)', fontSize: '1rem' }}>
              Des résultats concrets, vérifiables, mesurables.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {testimonials.map((t, i) => (
              <div key={i} className={`reveal reveal-up delay-${i + 1}`} style={{
                padding: '1.75rem',
                borderRadius: '1.25rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
                  {Array(t.rating).fill(0).map((_, j) => <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ fontSize: '0.92rem', color: 'rgba(240,242,255,0.7)', lineHeight: 1.7, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f0f2ff' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(240,242,255,0.35)' }}>{t.promo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '7rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.75rem)', fontWeight: 900, color: '#f0f2ff', marginBottom: '0.75rem' }}>
              Transparent. Sans surprise.
            </h2>
            <p style={{ color: 'rgba(240,242,255,0.45)', fontSize: '1rem' }}>
              Résiliable à tout moment. Pas de CB requise pour l'essai gratuit.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            {/* Free */}
            <div className="reveal reveal-left" style={{
              padding: '2.5rem',
              borderRadius: '1.5rem',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(240,242,255,0.6)', marginBottom: '0.5rem' }}>Découverte</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 900, color: '#f0f2ff', marginBottom: '1.5rem' }}>
                0€ <span style={{ fontSize: '1rem', color: 'rgba(240,242,255,0.35)', fontWeight: 500 }}>/mois</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {['Dossiers illimités', '5 générations IA par jour', 'Flashcards & QCM inclus', 'Synchronisation cloud'].map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'rgba(240,242,255,0.55)' }}>
                    <CheckCircle size={16} color="#34d399" /> {item}
                  </div>
                ))}
                {['Générations illimitées', 'Recherche globale multi-cours', 'Répétition espacée avancée'].map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'rgba(240,242,255,0.2)', textDecoration: 'line-through' }}>
                    <div style={{ width: 16, height: 16 }} /> {item}
                  </div>
                ))}
              </div>
              <button onClick={onGetStarted} style={{ width: '100%', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(240,242,255,0.7)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Commencer gratuitement
              </button>
            </div>

            {/* Premium */}
            <div className="reveal reveal-right" style={{
              padding: '2.75rem',
              borderRadius: '1.5rem',
              background: 'linear-gradient(145deg, rgba(124,58,237,0.15) 0%, rgba(52,211,153,0.06) 100%)',
              border: '1px solid rgba(167,139,250,0.3)',
              boxShadow: '0 0 60px rgba(124,58,237,0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #34d399)' }} />
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.25rem 0.75rem', borderRadius: '2rem', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Populaire
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.5rem' }}>Premium</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '3rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                <span style={{ background: 'linear-gradient(135deg, #a78bfa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>9,99€</span>
                <span style={{ fontSize: '1rem', color: 'rgba(240,242,255,0.35)', fontWeight: 500 }}> /mois</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(240,242,255,0.35)', marginBottom: '1.75rem' }}>
                Moins qu'un café par semaine pour réussir ton année.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                {[
                  'Dossiers illimités',
                  'Génération IA illimitée & prioritaire',
                  'Flashcards & QCM avancés (jamais identiques)',
                  'Recherche globale dans tous les cours',
                  'Répétition espacée (algorithme Leitner)',
                  'Statistiques de progression détaillées',
                  'Synchronisation cloud multi-appareils',
                ].map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'rgba(240,242,255,0.8)', fontWeight: 500 }}>
                    <CheckCircle size={16} color="#34d399" fill="rgba(52,211,153,0.15)" /> {item}
                  </div>
                ))}
              </div>
              <button onClick={onGetStarted} style={{
                width: '100%', padding: '1rem',
                borderRadius: '0.875rem', border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                color: 'white', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                transition: 'all 0.25s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(124,58,237,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)'; }}
              >
                Passer au Premium <ChevronRight size={18} />
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(240,242,255,0.25)', marginTop: '1rem' }}>
                Apple Pay · Carte bancaire · Résiliable en 1 clic
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{ padding: '7rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="reveal reveal-scale" style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, color: '#f0f2ff', lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
            Tes examens arrivent.<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sof.IA est prête.
            </span>
          </h2>
          <p style={{ color: 'rgba(240,242,255,0.45)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Rejoins les étudiants qui ont arrêté de subir les révisions et ont commencé à les maîtriser.
          </p>
          <button onClick={onGetStarted} style={{
            padding: '1.1rem 2.75rem',
            fontSize: '1.05rem', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            borderRadius: '0.875rem', border: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
            color: 'white', cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            transition: 'all 0.25s ease',
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(124,58,237,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)'; }}
          >
            Commencer gratuitement <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem', textAlign: 'center', color: 'rgba(240,242,255,0.2)', fontSize: '0.82rem' }}>
        © 2025 Sof.IA — Fait avec passion pour les étudiants exigeants
      </footer>
    </div>
  );
}
