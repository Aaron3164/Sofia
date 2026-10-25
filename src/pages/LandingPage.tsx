import React, { useState } from 'react';
import { 
  Sparkles, ArrowRight, Brain, Zap, Clock, Search, 
  Layers, Award, CheckCircle, ChevronRight, FileText, Check
} from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'flashcard' | 'mcq' | 'resume' | 'annale'>('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const features = [
    {
      icon: <Zap size={24} color="#f472b6" />,
      bg: 'rgba(244, 114, 182, 0.15)',
      border: 'rgba(244, 114, 182, 0.3)',
      title: 'Flashcards de Haute Précision',
      desc: 'Extraction chirurgicale des notions clés depuis vos polycopiés et PDF. Fiches recto-verso optimisées pour la mémorisation active.',
    },
    {
      icon: <Brain size={24} color="#fb923c" />,
      bg: 'rgba(251, 146, 60, 0.15)',
      border: 'rgba(251, 146, 60, 0.3)',
      title: 'Examens Blancs & Pièges ECNi',
      desc: 'Génération de QCM à choix multiples et cas cliniques sans jamais recycler les mêmes énoncés. Détecte et cible vos lacunes.',
    },
    {
      icon: <Search size={24} color="#f472b6" />,
      bg: 'rgba(244, 114, 182, 0.15)',
      border: 'rgba(244, 114, 182, 0.3)',
      title: 'Recherche Globale Transversale',
      desc: 'Interrogez l\'ensemble de vos semestres et cours en 1 seconde. Synthèse croisée rédigée avec citations des cours d\'origine.',
    },
    {
      icon: <Award size={24} color="#fb923c" />,
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

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onGetStarted();
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="ms-page-container">
      {/* ── CINEMATIC DYNAMIC AURORE BACKGROUND ── */}
      <div className="ms-cinematic-bg">
        <img 
          src="/aurora-cinematic.jpg" 
          alt="Voile cinématique Aurore Boréale" 
          className="ms-aurora-image"
        />
        <div className="ms-aurora-overlay" />
      </div>

      {/* ── NAVIGATION BAR (Liquid Glass) ── */}
      <nav className="ms-nav">
        <div className="ms-nav-inner liquid-glass">
          <div className="ms-nav-left">
            <div className="ms-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Sparkles size={20} color="#f472b6" />
              <span>Sof.IA</span>
            </div>
            <div className="ms-nav-links">
              <button onClick={() => scrollToSection('demo')} className="ms-nav-link">
                Démonstration
              </button>
              <button onClick={() => scrollToSection('features')} className="ms-nav-link">
                Fonctionnalités
              </button>
              <button onClick={() => scrollToSection('pricing')} className="ms-nav-link">
                Tarifs
              </button>
            </div>
          </div>
          <div className="ms-nav-right">
            <button onClick={onGetStarted} className="ms-btn-signup">
              Inscription
            </button>
            <button onClick={onGetStarted} className="ms-btn-login liquid-glass">
              Connexion
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION (Instrument Serif + Liquid Glass Bar) ── */}
      <section className="ms-hero-section">
        <h1 className="ms-heading">
          Conçu pour les <span className="ms-heading-italic">esprits exigeants</span>
        </h1>

        <div className="ms-hero-box">
          {/* Email input bar with liquid-glass */}
          <form onSubmit={handleEmailSubmit} className="ms-email-bar liquid-glass">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Entrez votre e-mail"
              className="ms-email-input"
            />
            <button type="submit" aria-label="Continuer" className="ms-email-btn">
              <ArrowRight size={20} />
            </button>
          </form>

          {/* Subtitle */}
          <p className="ms-subtitle">
            Sof.IA transforme vos centaines de pages de cours en Flashcards actives, 
            QCM corrigés et fiches de synthèse à haute rétention.
          </p>

          <div className="ms-action-row">
            <button 
              type="button" 
              onClick={() => scrollToSection('demo')} 
              className="ms-manifesto-btn liquid-glass"
            >
              Voir la démonstration
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION DÉMONSTRATION INTERACTIVE (Photo Réelle Discrète + Studio Démo) ── */}
      <section id="demo" className="ms-section">
        <div className="ms-section-header">
          <div className="ms-pill-badge liquid-glass">
            <Sparkles size={13} />
            <span>Aperçu en conditions réelles</span>
          </div>
          <h2 className="ms-section-title">
            L'efficacité de révision éprouvée
          </h2>
          <p className="ms-section-subtitle">
            Découvrez comment Sof.IA synthétise vos polycopiés et stimule votre mémorisation active en un clic.
          </p>
        </div>

        <div className="ms-demo-layout">
          {/* Photo Réelle d'Étudiant discrète avec overlay */}
          <div className="ms-student-card liquid-glass">
            <img 
              src="/library-student.jpg" 
              alt="Étudiante en révision dans une bibliothèque" 
              className="ms-student-img"
            />
            <div className="ms-student-gradient" />
            <div className="ms-student-caption">
              <span className="ms-caption-badge">
                Concours & Examens
              </span>
              <h3 className="ms-caption-title">Des sessions calmes et ultra-ciblées</h3>
              <p className="ms-caption-text">
                Idéal pour les étudiants en santé, droit et prépas qui préparent des épreuves à fort coefficient.
              </p>
            </div>
          </div>

          {/* Studio Démo Interactif Sof.IA */}
          <div className="ms-demo-studio liquid-glass">
            {/* Header fenêtre */}
            <div className="ms-studio-header">
              <div className="ms-studio-dots">
                <span className="ms-studio-dot ms-dot-r" />
                <span className="ms-studio-dot ms-dot-y" />
                <span className="ms-studio-dot ms-dot-g" />
              </div>
              <div className="ms-studio-title">
                <Sparkles size={13} color="#f472b6" />
                <span>Sof.IA Studio — Item 88 : Dysphonie.pdf</span>
              </div>
              <div style={{ width: '32px' }} />
            </div>

            {/* Onglets */}
            <div className="ms-studio-tabs">
              <button 
                className={`ms-studio-tab-btn ${activeTab === 'flashcard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('flashcard'); setIsFlipped(false); }}
              >
                <Zap size={14} /> Flashcards
              </button>
              <button 
                className={`ms-studio-tab-btn ${activeTab === 'mcq' ? 'active' : ''}`}
                onClick={() => { setActiveTab('mcq'); setSelectedOption(null); }}
              >
                <Brain size={14} /> Examen Blanc QCM
              </button>
              <button 
                className={`ms-studio-tab-btn ${activeTab === 'resume' ? 'active' : ''}`}
                onClick={() => setActiveTab('resume')}
              >
                <FileText size={14} /> Synthèse
              </button>
              <button 
                className={`ms-studio-tab-btn ${activeTab === 'annale' ? 'active' : ''}`}
                onClick={() => setActiveTab('annale')}
              >
                <Award size={14} /> Annales
              </button>
            </div>

            {/* Corps interactif */}
            <div className="ms-studio-body">
              {activeTab === 'flashcard' && (
                <div 
                  className="ms-flip-container"
                  onClick={() => setIsFlipped(!isFlipped)}
                  title="Cliquez pour retourner la carte"
                >
                  <div className={`ms-flip-card ${isFlipped ? 'is-flipped' : ''}`}>
                    {/* Face Recto */}
                    <div className="ms-flip-face ms-flip-front liquid-glass">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="ms-flashcard-tag">Recto · Question Clé</span>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Item 88 · ORL</span>
                      </div>

                      <div className="ms-flashcard-question">
                        Quelles sont les 4 fonctions physiologiques majeures du larynx à maîtriser pour le concours ?
                      </div>

                      <div style={{ minHeight: '50px', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', fontStyle: 'italic' }}>
                        💡 Réfléchissez à la réponse, puis cliquez pour retourner la carte...
                      </div>

                      <div className="ms-flashcard-footer">
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                          Touchez la carte
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#f472b6', fontWeight: 600 }}>
                          Révéler la réponse ↷
                        </span>
                      </div>
                    </div>

                    {/* Face Verso */}
                    <div className="ms-flip-face ms-flip-back liquid-glass">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="ms-flashcard-tag" style={{ background: 'rgba(168, 85, 247, 0.2)', borderColor: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' }}>
                          Verso · Corrigé & Justification
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Validation Sofia IA</span>
                      </div>

                      <div className="ms-flashcard-answer-box">
                        <p style={{ margin: '0 0 0.5rem 0' }}>1. <strong style={{ color: '#fbcfe8' }}>Phonation</strong> : production de la voix par les cordes vocales.</p>
                        <p style={{ margin: '0 0 0.5rem 0' }}>2. <strong style={{ color: '#fbcfe8' }}>Protection des voies aériennes</strong> lors de la déglutition.</p>
                        <p style={{ margin: '0 0 0.5rem 0' }}>3. <strong style={{ color: '#fbcfe8' }}>Respiration</strong> : conduction et ventilation pulmonaire.</p>
                        <p style={{ margin: 0 }}>4. <strong style={{ color: '#fbcfe8' }}>Fixation thoracique</strong> lors des efforts à glotte fermée.</p>
                      </div>

                      <div className="ms-flashcard-footer">
                        <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                          ✓ Prochaine révision : +4 jours
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#f472b6', fontWeight: 600 }}>
                          ↶ Revenir à la question
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mcq' && (
                <div className="ms-qcm-box liquid-glass">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="ms-flashcard-tag" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.3)' }}>
                      QCM Entraînement Concours
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Item 88 · Dysphonie</span>
                  </div>
                  <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', lineHeight: 1.45 }}>
                    Concernant une dysphonie persistante depuis plus de 4 semaines chez un patient tabagique, quelle est la conduite à tenir indispensable ?
                  </h4>
                  <div>
                    {[
                      "A. Prescription d'une corticothérapie orale et réévaluation à 2 mois",
                      "B. Laryngoscopie indirecte ou nasofibroscopie pour éliminer une tumeur des cordes vocales",
                      "C. Séance d'orthophonie isolée sans examen lourd préalable",
                      "D. Antibiothérapie probabiliste d'emblée"
                    ].map((opt, idx) => {
                      const isCorrect = idx === 1;
                      const isSelected = selectedOption === idx;
                      return (
                        <div 
                          key={idx}
                          className={`ms-qcm-option ${isSelected ? (isCorrect ? 'correct' : '') : ''}`}
                          onClick={() => setSelectedOption(idx)}
                        >
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px',
                            border: isSelected ? '2px solid #f472b6' : '2px solid rgba(255,255,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: isSelected ? '#f472b6' : 'transparent',
                            flexShrink: 0
                          }}>
                            {isSelected && <Check size={12} color="#ffffff" />}
                          </div>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {isSelected && isCorrect && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                              ✓ Exact
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'resume' && (
                <div style={{ width: '100%', maxWidth: '540px', textAlign: 'left', padding: '1.8rem', borderRadius: '1.2rem' }} className="liquid-glass">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f472b6', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    <FileText size={16} /> Synthèse Pédagogique Rapide
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.8rem 0' }}>Points Clés : Dysphonie de l'Adulte</h3>
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem', lineHeight: '1.65', margin: '0 0 1rem 0' }}>
                    • <strong>Drapeau rouge :</strong> Toute dysphonie &gt; 3 semaines chez un sujet exposé au tabac/alcool impose un examen des cordes vocales.<br />
                    • <strong>Causes bénignes fréquentes :</strong> Laryngite aiguë, nodules (surmenage vocal), polype, œdème de Reinke.<br />
                    • <strong>Imagerie :</strong> TDM cervico-thoracique injecté si lésion suspecte ou paralysie récurrentielle sans cause évidente.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fb923c', fontSize: '0.8rem', fontWeight: 650 }}>
                    <Sparkles size={13} /> Extrait automatiquement de votre polycopié de cours
                  </div>
                </div>
              )}

              {activeTab === 'annale' && (
                <div style={{ width: '100%', maxWidth: '540px', textAlign: 'left', padding: '1.8rem', borderRadius: '1.2rem' }} className="liquid-glass">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fb923c', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Award size={16} /> Module Annales d'Examen
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.8rem 0' }}>Analyse des Sujets Officiels</h3>
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem', lineHeight: '1.65', margin: '0 0 1.2rem 0' }}>
                    Importez les annales officielles de votre faculté ou concours. Sof.IA associe chaque énoncé au cours correspondant :
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Barèmes officiels
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Clichés radio & schémas
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Corrigé commenté
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={15} color="#34d399" /> Mode chronométré
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS SECTION ── */}
      <section id="features" className="ms-section">
        <div className="ms-section-header">
          <div className="ms-pill-badge liquid-glass">
            <Sparkles size={13} />
            <span>Architecture & Rigueur Scientifique</span>
          </div>
          <h2 className="ms-section-title">
            Tout l'arsenal pour surclasser vos partiels
          </h2>
          <p className="ms-section-subtitle">
            Chaque outil a été conçu pour absorber des volumes considérables de connaissances sans saturer.
          </p>
        </div>

        <div className="ms-features-grid">
          {features.map((f, i) => (
            <div key={i} className="ms-feature-card liquid-glass">
              <div 
                className="ms-feature-icon" 
                style={{ backgroundColor: f.bg, border: `1px solid ${f.border}` }}
              >
                {f.icon}
              </div>
              <h3 className="ms-feature-name">{f.title}</h3>
              <p className="ms-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TARIFS SECTION ── */}
      <section id="pricing" className="ms-section">
        <div className="ms-section-header">
          <div className="ms-pill-badge liquid-glass">
            <Award size={13} />
            <span>Tarification Transparente</span>
          </div>
          <h2 className="ms-section-title">
            Investissez dans votre réussite
          </h2>
          <p className="ms-section-subtitle">
            Sans engagement de durée. Annulation immédiate en 1 clic.
          </p>
        </div>

        <div className="ms-pricing-grid">
          {/* Free Tier */}
          <div className="ms-pricing-card liquid-glass">
            <div className="ms-price-header">Découverte</div>
            <div className="ms-price-figure">
              0€ <span className="ms-price-period">/mois</span>
            </div>
            <p className="ms-price-desc">
              Pour découvrir la puissance de l'IA sur vos premiers cours et polycopiés.
            </p>

            <div className="ms-features-list">
              {[
                'Dossiers & cours organisés',
                'Flashcards & QCM d\'entraînement',
                'Répétition espacée (Leitner)',
                'Recherche transversale',
                'Jusqu\'à 10 cours enregistrés',
                '5 générations IA quotidiennes'
              ].map((item, idx) => (
                <div key={idx} className="ms-feature-item">
                  <CheckCircle size={15} color="#34d399" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={onGetStarted} className="ms-btn-action secondary">
              Commencer gratuitement
            </button>
          </div>

          {/* Premium Tier */}
          <div className="ms-pricing-card liquid-glass popular">
            <span className="ms-popular-tag">Recommandé</span>
            <div className="ms-price-header" style={{ color: '#f472b6' }}>Premium Élite</div>
            <div className="ms-price-figure">
              9,99€ <span className="ms-price-period">/mois</span>
            </div>
            <p className="ms-price-desc">
              Moins qu'un café par semaine pour viser le haut du classement.
            </p>

            <div className="ms-features-list">
              {[
                'Tous les avantages du plan Découverte',
                'Cours & polycopiés illimités',
                'Générations IA Sofia prioritaires & illimitées',
                'Importation illimitée d\'annales officielles',
                'Explications pédagogiques approfondies',
                'Support prioritaire 7j/7'
              ].map((item, idx) => (
                <div key={idx} className="ms-feature-item">
                  <CheckCircle size={15} color="#f472b6" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={onGetStarted} className="ms-btn-action primary">
              Passer au Premium <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ── */}
      <section className="ms-section" style={{ paddingTop: '2rem' }}>
        <div className="ms-cta-card liquid-glass">
          <h2 className="ms-cta-title">
            Prêt à révolutionner vos sessions de révision ?
          </h2>
          <p className="ms-cta-desc">
            Rejoignez dès aujourd'hui les étudiants qui préparent leurs examens avec Sof.IA.
          </p>
          <button 
            onClick={onGetStarted} 
            className="ms-btn-action primary"
            style={{ width: 'auto', padding: '1rem 2.8rem', display: 'inline-flex', margin: '0 auto' }}
          >
            Créer mon compte gratuit <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── SIMPLE FOOTER ── */}
      <footer className="ms-simple-footer">
        <p style={{ color: '#ffffff' }}>© 2026 Sof.IA — Plateforme d'apprentissage IA pour les filières exigeantes.</p>
      </footer>
    </div>
  );
}
