import { useEffect } from 'react';
import { Sparkles, Zap, Brain, ArrowRight, Check, Upload, FileText } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.15 });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-container" style={{ 
      width: '100%', 
      height: '100vh', 
      overflowY: 'auto', 
      scrollBehavior: 'smooth',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Section 1: Hero */}
      <section style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, var(--accent-primary)15 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 0
        }} />
        
        <div className="reveal reveal-scale" style={{ zIndex: 1, maxWidth: '900px' }}>
          <div style={{ 
            padding: '0.6rem 1.2rem', 
            backgroundColor: 'var(--accent-primary)15', 
            borderRadius: '2rem',
            color: 'var(--accent-primary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Sparkles size={18} /> L'Intelligence Artificielle pour tes études
          </div>
          
          <h1 style={{ 
            fontSize: 'clamp(2.8rem, 8vw, 4.5rem)', 
            fontWeight: 900, 
            lineHeight: 1.1, 
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, var(--text-primary) 20%, var(--accent-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em'
          }}>
            Domine tes cours avec Sof.IA
          </h1>
          
          <p style={{ 
            fontSize: 'clamp(1.1rem, 2.2vw, 1.3rem)', 
            color: 'var(--text-secondary)', 
            marginBottom: '2.5rem',
            maxWidth: '700px',
            marginInline: 'auto',
            lineHeight: 1.5
          }}>
            Sof.IA analyse tes PDF, crée tes fiches de révision et génère tes flashcards en un clic. Spécialement conçu pour les filières exigeantes comme le Droit.
          </p>
          
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={onGetStarted}
              className="btn btn-primary" 
              style={{ padding: '1.25rem 2.5rem', fontSize: '1.1rem', borderRadius: '1.1rem', boxShadow: '0 12px 32px var(--accent-primary)40' }}
            >
              Essayer maintenant <ArrowRight size={22} style={{ marginLeft: '0.5rem' }} />
            </button>
          </div>
        </div>
      </section>

      {/* NEW Section: Magik Transform (Law Focused) */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Magik Transform : Du PDF à la Fiche</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Ne perds plus ton temps à lire 50 pages de doctrine. Sofia extrait l'essentiel.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Left: Dense PDF Mock */}
            <div className="glass-panel reveal reveal-left delay-1" style={{ width: '320px', height: '420px', padding: '1.5rem', borderRadius: '1rem', position: 'relative', overflow: 'hidden', backgroundColor: 'white', border: '1px solid #e2e8f0' }}>
               <div style={{ color: '#64748b', fontSize: '0.65rem', lineHeight: 1.4 }}>
                  <h4 style={{ color: '#1e293b', fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Code Civil - Art. 1101 et suiv.</h4>
                  <p style={{ marginBottom: '0.8rem' }}>Le contrat est une convention par laquelle une ou plusieurs personnes s'obligent, envers une ou plusieurs autres, à donner, à faire ou à ne pas faire quelque chose...</p>
                  <p style={{ marginBottom: '0.8rem' }}>Il est de l'essence de l'obligation de reposer sur une cause licite dans l'obligation. La validité du contrat est subordonnée au consentement de la partie qui s'oblige, à sa capacité de contracter, à un objet certain qui forme la matière de l'engagement...</p>
                  <div style={{ width: '100%', height: '10px', background: '#f1f5f9', marginBottom: '0.5rem' }}></div>
                  <div style={{ width: '90%', height: '10px', background: '#f1f5f9', marginBottom: '0.5rem' }}></div>
                  <div style={{ width: '95%', height: '10px', background: '#f1f5f9', marginBottom: '0.5rem' }}></div>
                  <div style={{ width: '85%', height: '10px', background: '#f1f5f9', marginBottom: '0.5rem' }}></div>
                  <div style={{ width: '100%', height: '10px', background: '#f1f5f9', marginBottom: '2rem' }}></div>
                  <p style={{ opacity: 0.5 }}>[... 48 pages restantes ...]</p>
               </div>
               <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, white)', pointerEvents: 'none' }}></div>
            </div>

            <div className="reveal reveal-scale delay-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={48} className="text-accent" style={{ filter: 'drop-shadow(0 0 10px var(--accent-primary)40)' }} />
              <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.8rem' }}>Magik IA</div>
            </div>

            {/* Right: Clean Fiches Mock */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', width: '350px', justifyContent: 'center' }}>
               <div className="glass-panel reveal reveal-right delay-1" style={{ width: '160px', padding: '1.25rem', borderRadius: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)30' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}><Check size={14}/></div>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Les 4 piliers</h5>
                  <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>Consentement, Capacité, Objet, Cause.</p>
               </div>
               <div className="glass-panel reveal reveal-right delay-2" style={{ width: '160px', padding: '1.25rem', borderRadius: '1rem', background: 'var(--bg-elevated)', border: '1px solid #a855f730' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a855f720', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: '#a855f7' }}><Brain size={14}/></div>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Responsabilité</h5>
                  <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>Extra-contractuelle vs Contractuelle.</p>
               </div>
               <div className="glass-panel reveal reveal-right delay-3" style={{ width: '330px', padding: '1.25rem', borderRadius: '1rem', background: 'var(--bg-elevated)', border: '1px solid #10b98130' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: '#10b981' }}><Zap size={14}/></div>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Flashcards Prêts</h5>
                  <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>12 cartes générées sur l'article 1101.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW Section: Predictive Calendar (Law Focused) */}
      <section style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Calendrier Prédictif</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Sofia sait quand tu vas oublier. Elle planifie tes révisions au moment parfait.</p>
          </div>

          <div className="glass-panel reveal reveal-scale" style={{ padding: '2rem', borderRadius: '2rem', border: '1px solid var(--border-color)' }}>
             <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                {[
                  { day: 'Lundi', task: 'Droit Civil' , status: 'Critique', color: 'red' },
                  { day: 'Mardi', task: 'Droit Admin', status: 'Optimal', color: 'green' },
                  { day: 'Mercredi', task: 'Droit Privé', status: 'Planifié', color: 'blue' },
                  { day: 'Jeudi', task: 'Droit Pénal', status: 'Critique', color: 'red' },
                  { day: 'Vendredi', task: 'Histoire du Droit', status: 'Révisé', color: 'gray' }
                ].map((item, i) => (
                  <div key={i} className={`reveal reveal-up delay-${i+1}`} style={{ minWidth: '160px', padding: '1.5rem', borderRadius: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>{item.day}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>{item.task}</div>
                    <div style={{ 
                      fontSize: '0.65rem', 
                      backgroundColor: item.color === 'red' ? '#fee2e2' : item.color === 'green' ? '#dcfce7' : item.color === 'blue' ? '#dbeafe' : '#f1f5f9',
                      color: item.color === 'red' ? '#ef4444' : item.color === 'green' ? '#10b981' : item.color === 'blue' ? '#3b82f6' : '#64748b',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '0.5rem',
                      display: 'inline-block',
                      fontWeight: 700
                    }}>
                      {item.status}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Section 4: App Preview */}
      <section style={{ padding: '6rem 2rem', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem' }}>Une interface pensée pour toi</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Claire, intuitive et dénuée de distractions.</p>
          </div>

          <div className="reveal reveal-scale" style={{ 
            width: '100%', 
            maxWidth: '1000px', 
            margin: '0 auto', 
            borderRadius: '1.5rem', 
            overflow: 'hidden', 
            boxShadow: '0 30px 80px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)'
          }}>
            {/* Real Mock Header */}
            <div style={{ height: '70px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem', background: 'var(--bg-primary)' }}>
               <ArrowRight size={20} style={{ transform: 'rotate(180deg)', opacity: 0.6 }} />
               <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Droit Civil (Les Contrats)</h3>
               <div style={{ backgroundColor: '#10b981', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>Programmée</div>
               <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '110px', height: '34px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}></div>
                  <div style={{ width: '80px', height: '34px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 500 }}>Supprimer</div>
               </div>
            </div>
            
            {/* Real Mock Body */}
            <div style={{ display: 'flex', gap: '1.5rem', height: '540px', padding: '1.5rem', backgroundColor: 'var(--bg-primary)80' }}>
              {/* Left Column: Documents */}
              <div className="reveal reveal-left" style={{ width: '300px', background: 'var(--bg-secondary)', borderRadius: '1.25rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)' }}>
                 <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}><FileText size={18} style={{ opacity: 0.7 }}/> Documents Sources</h4>
                 <div style={{ flex: 1, border: '2px dashed var(--border-color)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-primary)40' }}>
                    <Upload size={36} style={{ opacity: 0.2, marginBottom: '1.25rem' }} />
                    <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '1.5rem', lineHeight: 1.4 }}>Glissez-déposez le PDF ici (Code Civil, Doctrine...)</p>
                    <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.7rem 1.2rem', width: '100%', borderRadius: '0.75rem' }}>Uploader un PDF</button>
                 </div>
                 <div style={{ backgroundColor: '#10b98115', color: '#10b981', padding: '1rem', borderRadius: '0.6rem', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #10b98120' }}>
                    Mémorisé localement. Prêt pour l'IA.
                 </div>
              </div>
              
              {/* Right Column: Flashcards Interface */}
              <div className="reveal reveal-right" style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                 {/* Tabs Bar */}
                 <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 1.5rem', gap: '2rem', background: 'var(--bg-primary)30' }}>
                    {['Source (PDF)', 'Flashcards (Anki)', 'Examens Blancs', 'Explications', 'Résumé'].map((tab, i) => (
                      <div key={tab} style={{ 
                        padding: '1.25rem 0', 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        borderBottom: i === 1 ? '3px solid var(--accent-primary)' : 'none', 
                        color: i === 1 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap'
                      }}>{tab}</div>
                    ))}
                 </div>
                 
                 {/* Training View */}
                 <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                          <Zap size={18} className="text-secondary" /> Flashcards (Anki)
                       </div>
                       <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.6rem 1rem', borderRadius: '0.6rem' }}>Générer Maintenant</button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                       <p style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 500 }}>Carte 1 sur 34</p>
                       <div style={{ 
                         width: '100%', 
                         maxWidth: '480px', 
                         height: '240px', 
                         background: 'white', 
                         borderRadius: '1.5rem', 
                         boxShadow: '0 10px 40px rgba(0,0,0,0.04)', 
                         display: 'flex', 
                         alignItems: 'center', 
                         justifyContent: 'center', 
                         textAlign: 'center', 
                         padding: '2.5rem', 
                         fontSize: '1.25rem', 
                         fontWeight: 800,
                         color: '#1e293b',
                         border: '1px solid var(--border-color)'
                       }}>
                         Quelle est la sanction d'un contrat en cas de défaut d'objet certain ?
                       </div>
                       <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.6rem 1.2rem' }}>Précédente</button>
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.6rem 1.2rem' }}>Voir Réponse</button>
                          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.6rem 2rem' }}>Suivante</button>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
          <div className="reveal reveal-up" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
             <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '0.75rem' }}>Un tarif dérisoire.</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Choisis la simplicité. **Sans engagement (résiliable à tout moment)**.</p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem',
            alignItems: 'stretch'
          }}>
            <div className="glass-panel reveal reveal-left" style={{ padding: '2.5rem', borderRadius: '1.75rem', opacity: 0.8, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Découverte</h3>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>0€ <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/mois</span></div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}><Check size={16} className="text-secondary" /> 1 Dossier de cours</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}><Check size={16} className="text-secondary" /> Sofia IA standard</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', opacity: 0.4 }}><Check size={16} /> Flashcards Magiques</li>
              </ul>
              <button onClick={onGetStarted} className="btn btn-outline" style={{ width: '100%' }}>Tester gratuitement</button>
            </div>

            <div className="glass-panel reveal reveal-right" style={{ 
              padding: '3rem 2.5rem', 
              borderRadius: '1.75rem', 
              border: '2px solid var(--accent-primary)',
              backgroundColor: 'var(--bg-elevated)',
              boxShadow: '0 20px 50px var(--accent-primary)15',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, marginBottom: '1rem' }}>POPULAIRE</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Premium</h3>
              <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>9,99€ <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>/mois</span></div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Le prix de deux cafés pour réussir ton année.</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.70rem', fontSize: '0.95rem', fontWeight: 600 }}><Check size={18} className="text-accent" /> Dossiers Illimités</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.70rem', fontSize: '0.95rem', fontWeight: 600 }}><Check size={18} className="text-accent" /> Sofia Prioritaire & Illimitée</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.70rem', fontSize: '0.95rem', fontWeight: 600 }}><Check size={18} className="text-accent" /> Flashcards Magiques Auto</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.70rem', fontSize: '0.95rem', fontWeight: 600 }}><Check size={18} className="text-accent" /> Expérience Zéro Pub</li>
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Apple Pay • Revolut • Cartes Bancaires</span>
              </div>
              <button onClick={onGetStarted} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>Passer au Premium</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ/CTA Section */}
      <section style={{ padding: '6rem 2rem 6rem', textAlign: 'center' }}>
        <div className="reveal reveal-scale" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '1.25rem' }}>Prêt à transformer tes révisions ?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem' }}>Rejoins les étudiants qui visent l'excellence avec Sofia.</p>
          <button onClick={onGetStarted} className="btn btn-primary" style={{ padding: '1.35rem 3.5rem', fontSize: '1.2rem', borderRadius: '1.2rem' }}>
            Commencer l'aventure Sof.IA
          </button>
        </div>
      </section>
    </div>
  );
}
