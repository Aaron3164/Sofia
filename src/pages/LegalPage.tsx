import { ArrowLeft, Shield, FileText, Lock, Mail, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #0f0f10)',
        color: 'var(--text-primary, #f4f4f5)',
        padding: '2rem 1rem 4rem',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Navigation retour */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.9rem',
            borderRadius: '0.6rem',
            backgroundColor: 'var(--bg-secondary, #18181b)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            color: 'var(--text-secondary, #a1a1aa)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginBottom: '1.75rem',
            transition: 'color 0.2s, background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary, #ffffff)';
            e.currentTarget.style.borderColor = 'var(--accent-primary, #e11d48)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary, #a1a1aa)';
            e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.08))';
          }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        {/* En-tête */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '2rem',
              backgroundColor: 'rgba(225, 29, 72, 0.1)',
              border: '1px solid rgba(225, 29, 72, 0.25)',
              color: '#fda4af',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '0.85rem',
            }}
          >
            <Shield size={13} />
            Transparence & Cadre Légal
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: '0.75rem',
            }}
          >
            Mentions Légales & Conditions Générales
          </h1>
          <p style={{ color: 'var(--text-secondary, #a1a1aa)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            Dernière mise à jour : 9 novembre 2026. Ce document encadre l'utilisation de l'application Sof.IA,
            les modalités d'abonnement et la protection de vos données personnelles.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1 : Mentions Légales */}
          <section
            style={{
              padding: '1.75rem',
              borderRadius: '1rem',
              backgroundColor: 'var(--bg-secondary, #18181b)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <FileText size={20} color="var(--accent-primary, #e11d48)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                1. Mentions Légales
              </h2>
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary, #d4d4d8)' }}>
              <p>
                <strong>Éditeur du service :</strong> Sof.IA est un service indépendant d'assistance pédagogique
                numérique développé et édité à titre de projet individuel.
              </p>
              <p>
                <strong>Contact & Support :</strong> Pour toute question, réclamation ou demande d'information,
                l'éditeur est joignable directement par courrier électronique à l'adresse officielle :{' '}
                <a
                  href="mailto:sofia.study.app@gmail.com"
                  style={{ color: '#fda4af', fontWeight: 600, textDecoration: 'underline' }}
                >
                  sofia.study.app@gmail.com
                </a>.
              </p>
              <p>
                <strong>Hébergement de l'application :</strong>
                <br />
                • Interface Web / Déploiement : <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789, USA.
                <br />
                • Base de données & Authentification : <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapour (serveurs conformes Cloud AWS région UE).
              </p>
            </div>
          </section>

          {/* Section 2 : Conditions Générales d'Utilisation (CGU) */}
          <section
            style={{
              padding: '1.75rem',
              borderRadius: '1rem',
              backgroundColor: 'var(--bg-secondary, #18181b)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <Shield size={20} color="var(--accent-primary, #e11d48)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                2. Conditions d'Utilisation (CGU)
              </h2>
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary, #d4d4d8)' }}>
              <p>
                <strong>Objet :</strong> Sof.IA met à disposition des étudiants des outils de révision intégrant
                l'algorithme de répétition espacée SM-2, l'entraînement sur annales et la génération de synthèse
                par intelligence artificielle.
              </p>
              <p>
                <strong>Responsabilité pédagogique :</strong> Les explications, synthèses et réponses générées
                par l'intelligence artificielle constituent une aide à l'apprentissage et un support de révision.
                L'utilisateur reste seul responsable de la vérification de l'exactitude des informations par rapport
                aux cours officiels dispensés par son université ou établissement de formation.
              </p>
              <p>
                <strong>Propriété intellectuelle des documents :</strong> Les documents de cours, polycopiés et PDF
                importés par l'utilisateur demeurent sa stricte propriété. Sof.IA ne revendique aucun droit sur les
                fichiers importés.
              </p>
            </div>
          </section>

          {/* Section 3 : Conditions Générales de Vente (CGV) & Paiements Payhip */}
          <section
            style={{
              padding: '1.75rem',
              borderRadius: '1rem',
              backgroundColor: 'var(--bg-secondary, #18181b)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <HelpCircle size={20} color="var(--accent-primary, #e11d48)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                3. Conditions Générales de Vente (CGV) & Abonnements
              </h2>
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary, #d4d4d8)' }}>
              <p>
                <strong>Offres et Tarifs :</strong> Sof.IA propose un accès Gratuit (5 crédits IA/jour, révisions Anki illimitées)
                ainsi qu'une souscription <strong>Premium</strong> (50 crédits IA/jour, annales et recherche globale débloquées).
                Les tarifs applicables sont ceux affichés en temps réel sur la page de paiement avant confirmation.
              </p>
              <p>
                <strong>Traitement des paiements :</strong> Les transactions sont gérées de façon chiffrée et sécurisée
                par notre plateforme partenaire agréée <strong>Payhip</strong> (et ses processeurs de paiement Stripe / PayPal).
                Sof.IA n'a jamais accès à vos coordonnées bancaires ou numéros de carte de paiement.
              </p>
              <p>
                <strong>Exécution immédiate & Droit de rétractation :</strong> Conformément à l'article L.221-28 13° du
                Code de la consommation relatif aux contenus numériques fournis sur un support immatériel et dont l'exécution
                commence immédiatement après accord préalable exprès du consommateur, l'accès aux fonctionnalités Premium
                est activé dès la confirmation du paiement.
              </p>
              <p>
                <strong>Résiliation sans engagement :</strong> Tout abonnement peut être résilié à tout moment, en 1 clic,
                sans frais ni justification :
                <br />
                • Soit directement depuis le lien <em>« Gérer mon abonnement »</em> inclus dans le courriel de confirmation Payhip.
                <br />
                • Soit en écrivant à{' '}
                <a href="mailto:sofia.study.app@gmail.com" style={{ color: '#fda4af', fontWeight: 600 }}>
                  sofia.study.app@gmail.com
                </a>.
                <br />
                En cas de résiliation, l'accès aux fonctionnalités Premium reste actif jusqu'au terme de la période mensuelle déjà payée.
              </p>
            </div>
          </section>

          {/* Section 4 : Confidentialité & Données Personnelles (RGPD) */}
          <section
            style={{
              padding: '1.75rem',
              borderRadius: '1rem',
              backgroundColor: 'var(--bg-secondary, #18181b)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <Lock size={20} color="var(--accent-primary, #e11d48)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                4. Protection des Données Personnelles (RGPD)
              </h2>
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary, #d4d4d8)' }}>
              <p>
                <strong>Données collectées :</strong> Seules les informations strictement indispensables au fonctionnement
                du compte et des révisions sont conservées (adresse email de connexion, cartes mémoires créées, historique
                d'entraînement et statut de l'abonnement).
              </p>
              <p>
                <strong>Sécurité & Non-revente :</strong> Vos données ne font l'objet d'aucune revente, cession commerciale
                ou profilage publicitaire tiers. Elles sont stockées de façon chiffrée.
              </p>
              <p>
                <strong>Vos droits :</strong> Conformément au Règlement Général sur la Protection des Données (RGPD), vous
                disposez d'un droit permanent d'accès, de rectification, de portabilité et de suppression intégrale de vos données.
                Pour exercer ce droit ou demander la suppression définitive de votre compte, adressez un message à :{' '}
                <a href="mailto:sofia.study.app@gmail.com" style={{ color: '#fda4af', fontWeight: 600 }}>
                  sofia.study.app@gmail.com
                </a>.
              </p>
            </div>
          </section>

          {/* Bloc d'aide & contact direct */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              backgroundColor: 'rgba(225, 29, 72, 0.06)',
              border: '1px solid rgba(225, 29, 72, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                Une question spécifique ou besoin d'assistance ?
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                Notre support vous répond sous 24 à 48 heures ouvrées.
              </div>
            </div>
            <a
              href="mailto:sofia.study.app@gmail.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.6rem',
                backgroundColor: 'var(--accent-primary, #e11d48)',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Mail size={16} />
              Contacter le Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

