import { useState, useRef } from 'react';
import { 
  ArrowRight, Sparkles, Brain, Zap, CheckCircle, Clock, Search, 
  Shield, Star, ChevronRight, Layers, FileText, Award, Check
} from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'flashcard' | 'mcq' | 'resume' | 'annale'>('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // 3D Parallax Tilt effect on interactive preview card
  const mockupRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6; // max 6deg
    const rotateY = ((x - centerX) / centerX) * 6;  // max 6deg

    mockupRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  };

  const handleMouseLeave = () => {
    if (!mockupRef.current) return;
    mockupRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  const features = [
    {
      icon: <Zap size={24} color="#a855f7" />,
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.25)',
      title: 'Flashcards de Haute Précision',
      desc: 'Extraction chirurgicale des notions clés depuis vos polycopiés et PDF. Fiches recto-verso optimisées pour la mémorisation active.',
    },
    {
      icon: <Brain size={24} color="#38bdf8" />,
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.25)',
      title: 'Examens Blancs & Pièges ECNi',
      desc: 'Génération de QCM à choix multiples et cas cliniques sans jamais recycler les mêmes énoncés. Détecte et cible vos lacunes.',
    },
    {
      icon: <Search size={24} color="#ec4899" />,
      bg: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.25)',
      title: 'Recherche Globale Transversale',
      desc: 'Interrogez l\'ensemble de vos semestres et cours en 1 seconde. Synthèse croisée rédigée avec citations des cours d\'origine.',
    },
    {
      icon: <Award size={24} color="#eab308" />,
      bg: 'rgba(234, 179, 8, 0.12)',
      border: 'rgba(234, 179, 8, 0.25)',
      title: 'Import & Analyse d\'Annales Officielles',
      desc: 'Reconnaissance mot pour mot des sujets d\'examen et de leurs corrigés officiels. Association automatique des schémas et images.',
    },
    {
      icon: <Clock size={24} color="#10b981" />,
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.25)',
      title: 'Répétition Espacée Intelligente',
      desc: 'Planning automatique basé sur la courbe de l\'oubli d\'Ebbinghaus et l\'algorithme de Leitner. Révisez exactement ce qu\'il faut, quand il faut.',
    },
    {
      icon: <Layers size={24} color="#818cf8" />,
      bg: 'rgba(129, 140, 248, 0.12)',
      border: 'rgba(129, 140, 248, 0.25)',
      title: 'Bibliothèque Cloud Structurée',
      desc: 'Classement de vos dossiers par spécialité ou matière. Synchronisation cloud instantanée et consultation fluide sur tous vos appareils.',
    },
  ];

  return (
    <div className="lp-container">
      {/* ── 3D AMBIENT BACKGROUND GLOW ── */}
      <div className="lp-bg-glow">
        <div className="lp-glow-orb lp-glow-1" />
        <div className="lp-glow-orb lp-glow-2" />
        <div className="lp-glow-orb lp-glow-3" />
        <div className="lp-grid-overlay" />
      </div>

      {/* ── NAVBAR ── */}
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
          <span className="lp-title-sub">Maîtrisez chaque détail.</span>
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
            Explorer le produit en 3D
          </a>
        </div>

        <div className="lp-trust-row">
          <div className="lp-trust-item">
            <CheckCircle size={14} color="#10b981" />
            <span>Essai gratuit sans CB</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-item">
            <Shield size={14} color="#a855f7" />
            <span>Données privées & chiffrées</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-item">
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={12} fill="#eab308" color="#eab308" />
              ))}
            </div>
            <span>4.9/5 par les étudiants de santé & droit</span>
          </div>
        </div>
      </section>

      {/* ── 3D PERSPECTIVE PRODUCT SHOWCASE ── */}
      <section id="demo" className="lp-mockup-wrapper">
        <div 
          ref={mockupRef}
          className="lp-mockup-3d"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header Bar */}
          <div className="lp-mockup-header">
            <div className="lp-mockup-dots">
              <span className="lp-mockup-dot lp-dot-red" />
              <span className="lp-mockup-dot lp-dot-yellow" />
              <span className="lp-mockup-dot lp-dot-green" />
            </div>
            <div className="lp-mockup-title">
              <Sparkles size={13} color="#c084fc" />
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
              <Zap size={14} /> Flashcards Répétition Espacée
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
              <FileText size={14} /> Fiche Synthétique IA
            </button>
            <button 
              className={`lp-mockup-tab-btn ${activeTab === 'annale' ? 'active' : ''}`}
              onClick={() => setActiveTab('annale')}
            >
              <Award size={14} /> Importation d'Annales
            </button>
          </div>

          {/* Body Viewer */}
          <div className="lp-mockup-body">
            {activeTab === 'flashcard' && (
              <div 
                className="lp-card-3d-scene" 
                onClick={() => setIsFlipped(!isFlipped)}
                title="Cliquez pour retourner la carte"
              >
                <div className={`lp-card-3d ${isFlipped ? 'flipped' : ''}`}>
                  {/* Front */}
                  <div className="lp-card-side lp-card-front">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="lp-card-tag lp-tag-purple">Question Recto</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Item 231 · Électrocardiogramme</span>
                    </div>
                    <div className="lp-card-content">
                      Quels sont les 3 critères diagnostiques majeurs d'un syndrome coronarien avec sus-décalage (STEMI) sur l'ECG ?
                    </div>
                    <div className="lp-card-instruction">
                      <span>💡 Cliquez sur la carte ou appuyez pour retourner</span>
                      <span style={{ color: '#c084fc', fontWeight: 600 }}>Voir la réponse →</span>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="lp-card-side lp-card-back">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="lp-card-tag lp-tag-cyan">Explication Verso</span>
                      <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Formulation Sofia IA</span>
                    </div>
                    <div className="lp-card-content" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}>1. <strong>Sus-décalage du segment ST</strong> persistant ≥ 1 mm dans au moins 2 dérivations contiguës.</p>
                      <p style={{ margin: '0 0 0.5rem 0' }}>2. <strong>Image en miroir</strong> (sous-décalage réciproque) dans le territoire opposé.</p>
                      <p style={{ margin: 0 }}>3. <strong>Onde de Pardee</strong> englobant le segment ST et l'onde T.</p>
                    </div>
                    <div className="lp-card-instruction">
                      <span>Répétition espacée programmée dans : <strong style={{ color: '#34d399' }}>+4 jours</strong></span>
                      <span style={{ color: '#38bdf8' }}>← Revenir à la question</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mcq' && (
              <div className="lp-mcq-demo">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="lp-card-tag lp-tag-purple">QCM Entraînement Concours</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Difficulté : Avancée</span>
                </div>
                <h4 style={{ color: '#f8fafc', fontSize: '1.08rem', fontWeight: 700, margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                  Concernant la prise en charge immédiate d'une embolie pulmonaire à haut risque, quelle est la mesure thérapeutique prioritaire ?
                </h4>
                <div>
                  {[
                    "A. Anticoagulation par AVK à dose efficace d'emblée",
                    "B. Thrombolyse intraveineuse systémique en l'absence de contre-indication absolue",
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
                          border: isSelected ? '2px solid #a855f7' : '2px solid #475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isSelected ? '#a855f7' : 'transparent',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={12} color="white" />}
                        </div>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {isSelected && isCorrect && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80' }}>
                            ✓ Bonne réponse !
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'resume' && (
              <div style={{ maxWidth: '640px', width: '100%', textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#c084fc', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <FileText size={16} /> Synthèse Pédagogique Structurée
                </div>
                <h3 style={{ color: '#ffffff', fontSize: '1.25rem', margin: '0 0 1rem 0' }}>Fiche Récapitulative : Insuffisance Cardiaque</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.7', margin: '0 0 1rem 0' }}>
                  • <strong>Définition :</strong> Incapacité du myocarde à assurer un débit sanguin suffisant aux besoins métaboliques périphériques.<br />
                  • <strong>Biomarqueurs clés :</strong> Dosage du BNP (&gt; 35 pg/mL) ou NT-proBNP (&gt; 125 pg/mL) pour éliminer le diagnostic en urgence.<br />
                  • <strong>Traitement de fond (Les 4 Piliers) :</strong> Bêta-bloquants, IEC/ARA2 ou ARNI (Sacubitril/Valsartan), Anti-aldostérone, et Inhibiteurs SGLT2.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>
                  <Sparkles size={13} /> Généré et sourcé automatiquement d'après votre polycopié
                </div>
              </div>
            )}

            {activeTab === 'annale' && (
              <div style={{ maxWidth: '640px', width: '100%', textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#eab308', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <Award size={16} /> Module Annales & Concours
                </div>
                <h3 style={{ color: '#ffffff', fontSize: '1.25rem', margin: '0 0 1rem 0' }}>Extraction Mot Pour Mot d'Annales PDF</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.7', margin: '0 0 1.25rem 0' }}>
                  Glissez n'importe quel sujet d'annale officiel (ECNi, Barreau, partiels universitaires). 
                  Sof.IA détecte automatiquement :
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.86rem', color: '#e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={15} color="#4ade80" /> Cases à cocher & grilles
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={15} color="#4ade80" /> Clichés radio & schémas
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={15} color="#4ade80" /> Explication détaillée par item
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={15} color="#4ade80" /> Entraînement chronométré
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3D GRID FEATURES SECTION ── */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-badge">
            <Sparkles size={12} />
            <span>Architecture & Précision</span>
          </div>
          <h2 className="lp-section-title">
            Tout l'arsenal indispensable pour surclasser vos partiels
          </h2>
          <p className="lp-section-subtitle">
            Aucun gadget superflu. Des fonctionnalités taillées sur-mesure pour assimiler des masses de connaissances en un temps record.
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

      {/* ── PRICING SECTION ── */}
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
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>Découverte</div>
            <div className="lp-price-val">
              0€ <span className="lp-price-period">/mois</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
              Pour découvrir la puissance de l'IA sur vos premiers cours.
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
                  <CheckCircle size={15} color="#10b981" />
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
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc' }}>Premium Élite</div>
            <div className="lp-price-val">
              9,99€ <span className="lp-price-period">/mois</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: '0 0 1.5rem 0' }}>
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
                <div key={idx} className="lp-pricing-item" style={{ color: '#f1f5f9', fontWeight: 600 }}>
                  <CheckCircle size={15} color="#a855f7" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={onGetStarted} className="lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Passer au Premium <ChevronRight size={18} />
            </button>
            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '1rem' }}>
              Apple Pay · Carte Bancaire · Résiliable en 1 clic
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ── */}
      <section className="lp-section">
        <div className="lp-cta-box">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, color: '#ffffff', marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
            Prêt à révolutionner vos sessions de révision ?
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '1.1rem', maxWidth: '580px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Rejoignez dès aujourd'hui les étudiants qui préparent leurs examens avec Sof.IA.
          </p>
          <button onClick={onGetStarted} className="lp-btn-primary" style={{ padding: '1.15rem 2.75rem', fontSize: '1.05rem' }}>
            Créer mon compte gratuit <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        <p>© 2026 Sof.IA — Plateforme d'apprentissage IA pour les filières exigeantes.</p>
      </footer>
    </div>
  );
}
