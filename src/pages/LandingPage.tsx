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
      color: '#db2777',
    },
    {
      icon: <Brain size={22} />,
      title: 'QCM & Examens Blancs',
      desc: 'Des questions adaptées au niveau de tes études — format ECNi, concours, partiels. Jamais les mêmes deux fois.',
      color: '#ea580c',
    },
    {
      icon: <Search size={22} />,
      title: 'Recherche dans tous tes cours',
      desc: 'Retrouve une notion dans l\'ensemble de ta bibliothèque en une seule requête. L\'IA cherche à ta place.',
      color: '#701a75',
    },
    {
      icon: <Clock size={22} />,
      title: 'Répétition espacée',
      desc: 'Un calendrier de révision généré automatiquement, basé sur l\'algorithme de Leitner, pour ne plus rien oublier.',
      color: '#db2777',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Suivi de progression',
      desc: 'Visualise ton temps de travail, tes scores aux QCM et l\'évolution de ta maîtrise cours par cours.',
      color: '#ea580c',
    },
    {
      icon: <Layers size={22} />,
      title: 'Bibliothèque organisée',
      desc: 'Tes cours rangés en dossiers, synchronisés sur le cloud. Accède à tout, depuis n\'importe quel appareil.',
      color: '#701a75',
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
        backgroundColor: '#ffe4e6',
        backgroundImage: `
          linear-gradient(135deg, #ffedd5 0%, #fbcfe8 45%, #c084fc 100%),
          radial-gradient(circle at 10% 20%, rgba(249, 115, 22, 0.15) 0%, transparent 45%),
          radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.18) 0%, transparent 50%),
          radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)
        `,
        backgroundAttachment: 'fixed',
        color: '#3b0764',
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
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(244, 63, 94, 0.18)',
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '1.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em',
        }}>
          Sof.IA
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'rgba(59, 7, 100, 0.7)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, padding: '0.4rem 0.75rem' }}>
            Fonctionnalités
          </a>
          <a href="#pricing" style={{ color: 'rgba(59, 7, 100, 0.7)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, padding: '0.4rem 0.75rem' }}>
            Tarifs
          </a>
          <button
            onClick={onGetStarted}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '2rem',
              border: '1px solid rgba(219, 39, 119, 0.3)',
              background: 'rgba(219, 39, 119, 0.08)',
              color: '#db2777',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(219, 39, 119, 0.15)'; e.currentTarget.style.borderColor = '#db2777'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(219, 39, 119, 0.08)'; e.currentTarget.style.borderColor = 'rgba(219, 39, 119, 0.3)'; }}
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
        <div className="reveal reveal-scale" style={{ zIndex: 1, maxWidth: '860px' }}>
          {/* Label */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '2rem',
            border: '1px solid rgba(219, 39, 119, 0.25)',
            background: 'rgba(255, 255, 255, 0.6)',
            color: '#db2777',
            fontSize: '0.82rem', fontWeight: 700,
            marginBottom: '2rem',
            boxShadow: '0 4px 12px rgba(219, 39, 119, 0.06)',
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
              background: 'linear-gradient(135deg, #3b0764 25%, #db2777 65%, #ea580c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
              animation: 'gradientShift 6s ease infinite',
            }}>
              Révise 3× plus vite.
            </span>
            <br />
            <span style={{ color: 'rgba(112, 26, 117, 0.75)', fontWeight: 800 }}>
              Réussis vraiment.
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: 'rgba(112, 26, 117, 0.75)',
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
                background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                boxShadow: '0 8px 32px rgba(219, 39, 119, 0.25)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(219, 39, 119, 0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(219, 39, 119, 0.25)'; }}
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
                border: '1px solid rgba(219, 39, 119, 0.2)',
                background: 'rgba(255, 255, 255, 0.5)',
                color: '#db2777',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'; }}
            >
              Voir une démo
            </button>
          </div>

          {/* Social proof mini */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(112, 26, 117, 0.6)' }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#db2777" color="#db2777" />)}
              <span style={{ marginLeft: '0.3rem' }}>4.9 / 5 — 200+ étudiants</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(219, 39, 119, 0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(112, 26, 117, 0.6)' }}>
              <Shield size={13} color="#059669" />
              Données 100% privées
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(219, 39, 119, 0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(112, 26, 117, 0.6)' }}>
              <CheckCircle size={13} color="#db2777" />
              Sans engagement
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', background: 'rgba(255, 255, 255, 0.4)', borderTop: '1px solid rgba(219, 39, 119, 0.15)', borderBottom: '1px solid rgba(219, 39, 119, 0.15)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '2rem', background: 'rgba(219, 39, 119, 0.1)', border: '1px solid rgba(219, 39, 119, 0.2)', color: '#db2777', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Comment ça marche
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.75rem)', fontWeight: 800, color: '#3b0764', marginBottom: '1rem' }}>
              De ton PDF à ta révision,<br />en 3 étapes
            </h2>
            <p style={{ color: 'rgba(112, 26, 117, 0.75)', fontSize: '1.05rem', maxWidth: '520px', marginInline: 'auto' }}>
              Pas d'installation, pas de configuration. Juste l'essentiel.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Upload ton cours', desc: 'Glisse ton PDF ou ton polycopié. Sof.IA extrait et indexe tout le contenu automatiquement.', icon: <BookOpen size={24} />, color: '#db2777' },
              { step: '02', title: 'L\'IA génère', desc: 'Flashcards, QCM adaptatifs, résumé structuré et explications détaillées créés à la demande.', icon: <Brain size={24} />, color: '#ea580c' },
              { step: '03', title: 'Tu révises efficacement', desc: 'Suis ta progression, programme tes sessions, et arrive aux examens en confiance.', icon: <BarChart3 size={24} />, color: '#701a75' },
            ].map((item, i) => (
              <div key={i} className={`reveal reveal-up delay-${i + 1}`} style={{
                padding: '2rem',
                borderRadius: '1.25rem',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 8px 32px rgba(219, 39, 119, 0.05)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '3rem', fontWeight: 900, color: 'rgba(219, 39, 119, 0.07)', letterSpacing: '-0.05em' }}>{item.step}</div>
                <div style={{ width: '48px', height: '48px', borderRadius: '0.875rem', background: `${item.color}15`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: '1.25rem' }}>
                  {item.icon}
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#3b0764', marginBottom: '0.6rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(112, 26, 117, 0.7)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" style={{ padding: '7rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '2rem', background: 'rgba(219, 39, 119, 0.1)', border: '1px solid rgba(219, 39, 119, 0.2)', color: '#db2777', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fonctionnalités
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.75rem)', fontWeight: 800, color: '#3b0764', marginBottom: '1rem' }}>
              Tout ce dont tu as besoin,<br />rien de superflu
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <div key={i} className={`reveal reveal-up delay-${(i % 3) + 1}`} style={{
                padding: '1.75rem',
                borderRadius: '1.25rem',
                background: 'rgba(255, 255, 255, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.75)',
                boxShadow: '0 4px 20px rgba(219, 39, 119, 0.04)',
                transition: 'all 0.25s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)'; e.currentTarget.style.borderColor = `${f.color}40`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.55)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.75)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '0.75rem', background: `${f.color}12`, border: `1px solid ${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '1rem' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#3b0764', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(112, 26, 117, 0.65)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', background: 'rgba(255, 255, 255, 0.4)', borderTop: '1px solid rgba(219, 39, 119, 0.15)', borderBottom: '1px solid rgba(219, 39, 119, 0.15)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.7rem,3.5vw,2.5rem)', fontWeight: 800, color: '#3b0764', marginBottom: '0.75rem' }}>
              Ils ont changé leur façon de réviser
            </h2>
            <p style={{ color: 'rgba(112, 26, 117, 0.65)', fontSize: '1rem' }}>
              Des résultats concrets, vérifiables, mesurables.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {testimonials.map((t, i) => (
              <div key={i} className={`reveal reveal-up delay-${i + 1}`} style={{
                padding: '1.75rem',
                borderRadius: '1.25rem',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 8px 32px rgba(219, 39, 119, 0.05)',
              }}>
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
                  {Array(t.rating).fill(0).map((_, j) => <Star key={j} size={14} fill="#db2777" color="#db2777" />)}
                </div>
                <p style={{ fontSize: '0.92rem', color: '#3b0764', lineHeight: 1.7, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #db2777, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3b0764' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(112, 26, 117, 0.5)' }}>{t.promo}</div>
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
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.75rem)', fontWeight: 900, color: '#3b0764', marginBottom: '0.75rem' }}>
              Transparent. Sans surprise.
            </h2>
            <p style={{ color: 'rgba(112, 26, 117, 0.65)', fontSize: '1rem' }}>
              Résiliable à tout moment. Pas de CB requise pour l'essai gratuit.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            {/* Free */}
            <div className="reveal reveal-left" style={{
              padding: '2.5rem',
              borderRadius: '1.5rem',
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 8px 32px rgba(219, 39, 119, 0.05)',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(112, 26, 117, 0.6)', marginBottom: '0.5rem' }}>Découverte</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 900, color: '#3b0764', marginBottom: '1.5rem' }}>
                0€ <span style={{ fontSize: '1rem', color: 'rgba(112, 26, 117, 0.5)', fontWeight: 500 }}>/mois</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {['Dossiers illimités', '5 générations IA par jour', 'Flashcards & QCM inclus', 'Synchronisation cloud'].map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'rgba(112, 26, 117, 0.8)' }}>
                    <CheckCircle size={16} color="#059669" /> {item}
                  </div>
                ))}
                {['Générations illimitées', 'Recherche globale multi-cours', 'Répétition espacée avancée'].map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'rgba(112, 26, 117, 0.3)', textDecoration: 'line-through' }}>
                    <div style={{ width: 16, height: 16 }} /> {item}
                  </div>
                ))}
              </div>
              <button onClick={onGetStarted} style={{ width: '100%', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid rgba(219, 39, 119, 0.25)', background: 'transparent', color: '#db2777', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(219, 39, 119, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Commencer gratuitement
              </button>
            </div>

            {/* Premium */}
            <div className="reveal reveal-right" style={{
              padding: '2.75rem',
              borderRadius: '1.5rem',
              background: 'linear-gradient(145deg, rgba(219, 39, 119, 0.18) 0%, rgba(234, 88, 12, 0.08) 100%)',
              border: '2px solid rgba(219, 39, 119, 0.4)',
              boxShadow: '0 16px 48px rgba(219, 39, 119, 0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #db2777, #ea580c)' }} />
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.25rem 0.75rem', borderRadius: '2rem', background: 'linear-gradient(135deg, #db2777, #ea580c)', color: 'white', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Populaire
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#db2777', marginBottom: '0.5rem' }}>Premium</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '3rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                <span style={{ background: 'linear-gradient(135deg, #db2777, #ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>9,99€</span>
                <span style={{ fontSize: '1rem', color: 'rgba(112, 26, 117, 0.5)', fontWeight: 500 }}> /mois</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(112, 26, 117, 0.65)', marginBottom: '1.75rem' }}>
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
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#3b0764', fontWeight: 600 }}>
                    <CheckCircle size={16} color="#059669" fill="rgba(5, 150, 105, 0.1)" /> {item}
                  </div>
                ))}
              </div>
              <button onClick={onGetStarted} style={{
                width: '100%', padding: '1rem',
                borderRadius: '0.875rem', border: 'none',
                background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
                color: 'white', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                boxShadow: '0 8px 32px rgba(219, 39, 119, 0.3)',
                transition: 'all 0.25s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(219, 39, 119, 0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(219, 39, 119, 0.3)'; }}
              >
                Passer au Premium <ChevronRight size={18} />
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(112, 26, 117, 0.5)', marginTop: '1rem' }}>
                Apple Pay · Carte bancaire · Résiliable en 1 clic
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{ padding: '7rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="reveal reveal-scale" style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, color: '#3b0764', lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
            Tes examens arrivent.<br />
            <span style={{ background: 'linear-gradient(135deg, #db2777, #ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sof.IA est prête.
            </span>
          </h2>
          <p style={{ color: 'rgba(112, 26, 117, 0.65)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Rejoins les étudiants qui ont arrêté de subir les révisions et ont commencé à les maîtriser.
          </p>
          <button onClick={onGetStarted} style={{
            padding: '1.1rem 2.75rem',
            fontSize: '1.05rem', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            borderRadius: '0.875rem', border: 'none',
            background: 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
            color: 'white', cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(219, 39, 119, 0.3)',
            transition: 'all 0.25s ease',
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(219, 39, 119, 0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(219, 39, 119, 0.3)'; }}
          >
            Commencer gratuitement <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(219, 39, 119, 0.15)', padding: '2rem', textAlign: 'center', color: 'rgba(112, 26, 117, 0.4)', fontSize: '0.82rem' }}>
        © 2025 Sof.IA — Fait avec passion pour les étudiants exigeants
      </footer>
    </div>
  );
}
