import { useState } from 'react';
import { 
  ArrowRight, Sparkles, Brain, Zap, CheckCircle, Clock, Search, 
  Shield, Star, ChevronRight, Layers, FileText, Award, Check, RotateCw
} from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'flashcard' | 'mcq' | 'resume' | 'annale'>('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const features = [
    {
      icon: <Zap size={24} color="#f472b6" />,
      bg: 'rgba(236, 72, 153, 0.15)',
      border: 'rgba(236, 72, 153, 0.3)',
      title: 'Flashcards de Haute Précision',
      desc: 'Extraction chirurgicale des notions clés depuis vos polycopiés et PDF. Fiches recto-verso optimisées pour la mémorisation active.',
    },
    {
      icon: <Brain size={24} color="#fdba74" />,
      bg: 'rgba(251, 146, 60, 0.15)',
      border: 'rgba(251, 146, 60, 0.3)',
      title: 'Examens Blancs & Pièges ECNi',
      desc: 'Génération de QCM à choix multiples et cas cliniques sans jamais recycler les mêmes énoncés. Détecte et cible vos lacunes.',
    },
    {
      icon: <Search size={24} color="#f472b6" />,
      bg: 'rgba(236, 72, 153, 0.15)',
      border: 'rgba(236, 72, 153, 0.3)',
      title: 'Recherche Globale Transversale',
      desc: 'Interrogez l\'ensemble de vos semestres et cours en 1 seconde. Synthèse croisée rédigée avec citations des cours d\'origine.',
    },
    {
      icon: <Award size={24} color="#fdba74" />,
      bg: 'rgba(251, 146, 60, 0.15)',
      border: 'rgba(251, 146, 60, 0.3)',
      title: 'Import & Analyse d\'Annales Officielles',
      desc: 'Reconnaissance mot pour mot des sujets d\'examen et de leurs corrigés officiels. Association automatique des schémas et images.',
    },
    {
      icon: <Clock size={24} color="#34d399" />,
      bg: 'rgba(52, 211, 153, 0.15)',
      border: 'rgba(52, 211, 153, 0.3)',
      title: 'Répétition Espacée Intelligente',
      desc: 'Planning automatique basé sur la courbe de l\'oubli d\'Ebbinghaus et l\'algorithme de Leitner. Révisez exactement ce qu\'il faut, quand il faut.',
    },
    {
      icon: <Layers size={24} color="#c084fc" />,
      bg: 'rgba(192, 132, 252, 0.15)',
      border: 'rgba(192, 132, 252, 0.3)',
      title: 'Bibliothèque Cloud Structurée',
      desc: 'Classement de vos dossiers par spécialité ou matière. Synchronisation cloud instantanée et consultation fluide sur tous vos appareils.',
    },
  ];

  return (
    <div className="lp-container">
      {/* ── DEEP AURORE AMBIENT GLOW & GRID ── */}
      <div className="lp-bg-glow">
        <div className="lp-glow-orb lp-glow-1" />
        <div className="lp-glow-orb lp-glow-2" />
        <div className="lp-glow-orb lp-glow-3" />
        <div className="lp-grid-overlay" />
      </div>

      {/* ── NAVBAR (Apple Liquid Glass) ── */}
      <nav className="lp-nav">
        <div className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>Sof.IA</span>
          <span className="lp-logo-badge">Élite 2.0</span>
        </div>
        <div className="lp-nav-links">
          <a href="#demo" className="lp-nav-link">Démonstration</a>
          <a href="#features" className="lp-nav-link">Fonctionnalités</a>
          <a href="#pricing" className="lp-nav-link">Tarifs</a>
          <button onClick={onGetStarted} className="lp-btn-login">
            Connexion
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="lp-hero">
        <div className="lp-pill">
          <span className="lp-pill-dot" />
          <span>Conçu pour la Médecine, le Droit et les Concours d'Élite</span>
        </div>

        <h1 className="lp-hero-title">
          <span className="lp-title-gradient">Révisez 3× plus vite.</span><br />
          <span className="lp-title-sub">Maîtrisez <span className="lp-title-serif">chaque détail.</span></span>
        </h1>

        <p className="lp-hero-desc">
          Sof.IA transforme vos centaines de pages de cours en Flashcards actives, 
          QCM corrigés et fiches de synthèse à haute rétention. L'IA qui comprend la complexité de vos études.
        </p>

        <div className="lp-hero-actions">
          <button onClick={onGetStarted} className="lp-btn-primary">
            Commencer gratuitement <ArrowRight size={18} />
          </button>
          <a href="#demo" className="lp-btn-secondary">
            Tester la démonstration
          </a>
        </div>

        <div className="lp-trust-row">
          <div className="lp-trust-item">
            <CheckCircle size={15} color="#34d399" />
            <span>Essai gratuit sans CB</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-item">
            <Shield size={15} color="#f472b6" />
            <span>Données privées & chiffrées</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-item">
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={13} fill="#fb923c" color="#fb923c" />
              ))}
            </div>
            <span>4.9/5 par les étudiants de santé & droit</span>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL SHOWCASE (MotionSites Dual Panel + Apple HIG Demo) ── */}
      <section id="demo" className="lp-showcase-section">
        <div className="lp-showcase-grid">
          {/* Photo Réelle d'Étudiant avec Overlay Cinématique */}
          <div className="lp-real-photo-card">
            <img 
              src="/hero-student.jpg" 
              alt="Étudiante en médecine révisant avec Sof.IA sur iPad" 
              className="lp-real-photo-img"
            />
            <div className="lp-real-photo-gradient" />
            <div className="lp-real-photo-caption">
              <span className="lp-photo-badge">
                <Sparkles size={12} /> Études Exigeantes
              </span>
              <h3 className="lp-photo-title">Immersion & Mémorisation Profonde</h3>
              <p className="lp-photo-text">
                Pensé pour les étudiants en PACES/PASS/LAS, Internat ECNi et CRFPA qui doivent absorber des milliers de notions sans saturer.
              </p>
            </div>
          </div>

          {/* Démonstration Interactive Apple HIG */}
          <div className="lp-mockup-apple">
            {/* Window Header */}
            <div className="lp-mockup-header">
              <div className="lp-mockup-dots">
                <span className="lp-mockup-dot lp-dot-red" />
                <span className="lp-mockup-dot lp-dot-yellow" />
                <span className="lp-mockup-dot lp-dot-green" />
              </div>
              <div className="lp-mockup-title">
                <Sparkles size={13} color="#f472b6" />
                <span>Sof.IA Studio — Cardiologie_Item_231.pdf</span>
              </div>
              <div style={{ width: '40px' }} />
            </div>

            {/* Navigation Tabs */}
            <div className="lp-mockup-tabs">
              <button 
                className={`lp-mockup-tab-btn ${activeTab === 'flashcard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('flashcard'); setIsFlipped(false); }}
              >
                <Zap size={14} /> Flashcards (3D Flip)
              </button>
              <button 
                className={`lp-mockup-tab-btn ${activeTab === 'mcq' ? 'active' : ''}`}
                onClick={() => { setActiveTab('mcq'); setSelectedOption(null); }}
              >
                <Brain size={14} /> Examen Blanc QCM
              </button>
              <button 
                className={`lp-mockup-tab-btn ${activeTab === 'resume' ? 'active' : ''}`}
                onClick={() => setActiveTab('resume')}
              >
                <FileText size={14} /> Fiche Synthétique
              </button>
              <button 
                className={`lp-mockup-tab-btn ${activeTab === 'annale' ? 'active' : ''}`}
                onClick={() => setActiveTab('annale')}
              >
                <Award size={14} /> Annales Concours
              </button>
            </div>

            {/* Body */}
            <div className="lp-mockup-body">
              {activeTab === 'flashcard' && (
                <div className="lp-flashcard-perspective">
                  <div 
                    className={`lp-flashcard-inner ${isFlipped ? 'flipped' : ''}`}
                    onClick={() => setIsFlipped(!isFlipped)}
                    title="Cliquez pour retourner physiquement la flashcard"
                  >
                    {/* Face Recto */}
                    <div className="lp-flashcard-face lp-flashcard-front">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="lp-card-tag lp-tag-rose">Recto · Question Essentielle</span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Item 231 · Électrocardiogramme</span>
                        </div>
                        <div className="lp-card-question">
                          Quels sont les 3 critères diagnostiques majeurs d'un syndrome coronarien avec sus-décalage (STEMI) sur l'ECG ?
                        </div>
                      </div>
                      <div className="lp-flashcard-footer">
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                          💡 Touchez la carte pour révéler le verso
                        </span>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                          className="lp-btn-flip"
                        >
                          <RotateCw size={14} /> Tourner la carte
                        </button>
                      </div>
                    </div>

                    {/* Face Verso (Retournement Physique 180°) */}
                    <div className="lp-flashcard-face lp-flashcard-back">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="lp-card-tag lp-tag-violet">Verso · Corrigé Détaillé</span>
                          <span style={{ fontSize: '0.8rem', color: '#c084fc' }}>Validation Sofia IA</span>
                        </div>
                        <div className="lp-card-answer-box">
                          <p style={{ margin: '0 0 0.5rem 0' }}>1. <strong>Sus-décalage du segment ST</strong> persistant ≥ 1 mm dans au moins 2 dérivations contiguës.</p>
                          <p style={{ margin: '0 0 0.5rem 0' }}>2. <strong>Image en miroir</strong> (sous-décalage réciproque) dans le territoire opposé.</p>
                          <p style={{ margin: 0 }}>3. <strong>Onde de Pardee</strong> englobant le segment ST et l'onde T.</p>
                        </div>
                      </div>
                      <div className="lp-flashcard-footer">
                        <span style={{ fontSize: '0.82rem', color: '#34d399' }}>
                          ✓ Intervalle Leitner : révision à J+4
                        </span>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                          className="lp-btn-flip"
                        >
                          <RotateCw size={14} /> Revenir à la question
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mcq' && (
                <div className="lp-mcq-demo">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="lp-card-tag lp-tag-rose">QCM Entraînement Concours</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Difficulté : Avancée</span>
                  </div>
                  <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 750, margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                    Concernant la prise en charge immédiate d'une embolie pulmonaire à haut risque, quelle est la mesure prioritaire ?
                  </h4>
                  <div>
                    {[
                      "A. Anticoagulation par AVK à dose efficace d'emblée",
                      "B. Thrombolyse intraveineuse systémique (en l'absence de contre-indication)",
                      "C. Pose d'un filtre cave d'emblée sans héparinothérapie",
                      "D. Surveillance simple et oxygénothérapie seule"
                    ].map((opt, idx) => {
                      const isCorrect = idx === 1;
                      const isSelected = selectedOption === idx;
                      return (
                        <div 
                          key={idx}
                          className={`lp-mcq-option ${isSelected ? (isCorrect ? 'correct' : '') : ''}`}
                          onClick={() => setSelectedOption(idx)}
                        >
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px',
                            border: isSelected ? '2px solid #f472b6' : '2px solid rgba(255,255,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: isSelected ? '#f472b6' : 'transparent',
                            flexShrink: 0
                          }}>
                            {isSelected && <Check size={12} color="#ffffff" />}
                          </div>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {isSelected && isCorrect && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                              ✓ Bonne réponse
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'resume' && (
                <div style={{ width: '100%', maxWidth: '580px', textAlign: 'left', background: '#170d24', padding: '1.8rem', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f472b6', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    <FileText size={16} /> Synthèse Pédagogique Structurée
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Insuffisance Cardiaque Aiguë</h3>
                  <p style={{ color: 'rgba(241, 245, 249, 0.78)', fontSize: '0.9rem', lineHeight: '1.7', margin: '0 0 1rem 0' }}>
                    • <strong>Définition :</strong> Incapacité du myocarde à assurer un débit sanguin suffisant aux besoins métaboliques périphériques.<br />
                    • <strong>Biomarqueurs clés :</strong> Dosage du BNP (&gt; 35 pg/mL) ou NT-proBNP (&gt; 125 pg/mL) pour éliminer le diagnostic en urgence.<br />
                    • <strong>Traitement de fond (Les 4 Piliers) :</strong> Bêta-bloquants, IEC/ARA2 ou ARNI, Anti-aldostérone, et Inhibiteurs SGLT2.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fdba74', fontSize: '0.8rem', fontWeight: 650 }}>
                    <Sparkles size={13} /> Sourcé mot pour mot depuis le polycopié du Collège des Enseignants
                  </div>
                </div>
              )}

              {activeTab === 'annale' && (
                <div style={{ width: '100%', maxWidth: '580px', textAlign: 'left', background: '#170d24', padding: '1.8rem', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fdba74', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Award size={16} /> Module Annales & Concours
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Extraction Précise d'Annales PDF</h3>
                  <p style={{ color: 'rgba(241, 245, 249, 0.78)', fontSize: '0.9rem', lineHeight: '1.7', margin: '0 0 1.25rem 0' }}>
                    Glissez n'importe quel sujet d'annale officiel (ECNi, Barreau, partiels universitaires). Sof.IA extrait automatiquement :
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: '#f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Grilles et barèmes
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Clichés radio & schémas
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Explication détaillée par item
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Mode examen chronométré
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES SECTION ── */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-badge">
            <Sparkles size={12} />
            <span>Architecture & Rigueur Scientifique</span>
          </div>
          <h2 className="lp-section-title">
            Tout l'arsenal indispensable pour réussir vos concours
          </h2>
          <p className="lp-section-subtitle">
            Aucun gadget superflu. Des outils calibrés pour mémoriser durablement et performer le jour J.
          </p>
        </div>

        <div className="lp-features-grid">
          {features.map((f, i) => (
            <div key={i} className="lp-feature-card">
              <div 
                className="lp-feature-icon"
                style={{ backgroundColor: f.bg, border: `1px solid ${f.border}` }}
              >
                {f.icon}
              </div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING SECTION (Haute Lisibilité WCAG AAA) ── */}
      <section id="pricing" className="lp-section" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="lp-section-header">
          <div className="lp-section-badge">
            <Award size={12} />
            <span>Tarifs Clairs</span>
          </div>
          <h2 className="lp-section-title">
            Investissez dans votre réussite
          </h2>
          <p className="lp-section-subtitle">
            Sans engagement. Annulable à tout moment en 1 clic.
          </p>
        </div>

        <div className="lp-pricing-grid">
          {/* Free Tier */}
          <div className="lp-pricing-card">
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(241, 245, 249, 0.7)' }}>Découverte</div>
            <div className="lp-price-val">
              0€ <span className="lp-price-period">/mois</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'rgba(241, 245, 249, 0.65)', margin: '0 0 1.5rem 0' }}>
              Pour tester la puissance de l'IA sur vos premiers cours.
            </p>

            <div className="lp-pricing-features">
              {[
                'Dossiers & cours organisés',
                'Flashcards & QCM d\'entraînement',
                'Répétition espacée (Leitner)',
                'Recherche transversale',
                'Jusqu\'à 10 cours enregistrés',
                '5 générations IA quotidiennes'
              ].map((item, idx) => (
                <div key={idx} className="lp-pricing-item">
                  <CheckCircle size={15} color="#34d399" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={onGetStarted} className="lp-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Commencer gratuitement
            </button>
          </div>

          {/* Premium Tier */}
          <div className="lp-pricing-card popular">
            <span className="lp-popular-badge">Recommandé</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f472b6' }}>Premium Élite</div>
            <div className="lp-price-val">
              9,99€ <span className="lp-price-period">/mois</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'rgba(241, 245, 249, 0.8)', margin: '0 0 1.5rem 0' }}>
              Moins qu'un café par semaine pour viser les premières places.
            </p>

            <div className="lp-pricing-features">
              {[
                'Tous les avantages du plan Découverte',
                'Cours & polycopiés illimités',
                'Générations IA Sofia prioritaires & illimitées',
                'Importation illimitée d\'annales officielles',
                'Explications pédagogiques approfondies',
                'Support prioritaire 7j/7'
              ].map((item, idx) => (
                <div key={idx} className="lp-pricing-item" style={{ color: '#ffffff', fontWeight: 600 }}>
                  <CheckCircle size={15} color="#f472b6" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={onGetStarted} className="lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Passer au Premium <ChevronRight size={18} />
            </button>
            <p style={{ fontSize: '0.75rem', color: 'rgba(241, 245, 249, 0.6)', textAlign: 'center', marginTop: '1rem' }}>
              Apple Pay · Carte Bancaire · Résiliable en 1 clic
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION (Texte Blanc Haute Visibilité) ── */}
      <section className="lp-section">
        <div className="lp-cta-box">
          <h2 className="lp-cta-title">
            Prêt à révolutionner vos sessions de révision ?
          </h2>
          <p className="lp-cta-desc">
            Rejoignez dès aujourd'hui les étudiants qui préparent leurs examens avec Sof.IA.
          </p>
          <button onClick={onGetStarted} className="lp-btn-primary" style={{ padding: '1.15rem 2.85rem', fontSize: '1.05rem' }}>
            Créer mon compte gratuit <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 2rem', textAlign: 'center', color: 'rgba(241, 245, 249, 0.5)', fontSize: '0.85rem' }}>
        <p>© 2026 Sof.IA — Plateforme d'apprentissage IA pour les filières exigeantes.</p>
      </footer>
    </div>
  );
}
