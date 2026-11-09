import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#0a0a0c',
        color: '#e4e4e7',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '2.5rem 2rem 5rem',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Navigation retour */}
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              window.location.href = '/';
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            color: '#a1a1aa',
            fontSize: '0.84rem',
            cursor: 'pointer',
            marginBottom: '2rem',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = '#3f3f46';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a1a1aa';
            e.currentTarget.style.borderColor = '#27272a';
          }}
        >
          <ArrowLeft size={15} />
          Retour à l'accueil
        </button>

        {/* En-tête sobre et standard */}
        <header style={{ borderBottom: '1px solid #27272a', paddingBottom: '1.75rem', marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}
          >
            Mentions Légales, CGU, CGV et Politique de Confidentialité (RGPD)
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.88rem' }}>
            Dernière mise à jour : 9 novembre 2026 • Plateforme Sof.IA
          </p>
        </header>

        {/* Corps du texte légal complet */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', fontSize: '0.92rem', lineHeight: 1.75, color: '#d4d4d8' }}>
          
          {/* Article 1 */}
          <section style={{ borderBottom: '1px solid #1f1f23', paddingBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f5', marginBottom: '1rem' }}>
              Article 1. Mentions Légales
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>1.1. Éditeur de la plateforme :</strong> La plateforme web et applicative accessible depuis <code>sofia-study.vercel.app</code> (ci-après désignée « Sof.IA ») est éditée par Aaron Karsenti, agissant à titre individuel et indépendant en qualité de créateur du service.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>1.2. Contact officiel & Support :</strong> Pour toute demande technique, commerciale, juridique ou réclamation, le contact s'effectue exclusivement par voie électronique à l'adresse suivante :{' '}
              <a href="mailto:sofia.study.app@gmail.com" style={{ color: '#ffffff', textDecoration: 'underline' }}>
                sofia.study.app@gmail.com
              </a>.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>1.3. Hébergement :</strong>
              <br />
              • L'infrastructure d'hébergement web et de diffusion applicative est assurée par <strong>Vercel Inc.</strong>, situé au 340 S Lemon Ave #4133 Walnut, CA 91789, USA.
              <br />
              • L'infrastructure de base de données relationnelle et d'authentification sécurisée est fournie par <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapour (région d'hébergement Cloud UE).
            </p>
          </section>

          {/* Article 2 */}
          <section style={{ borderBottom: '1px solid #1f1f23', paddingBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f5', marginBottom: '1rem' }}>
              Article 2. Conditions Générales d'Utilisation (CGU)
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>2.1. Objet du service :</strong> Sof.IA fournit aux étudiants et apprenants des outils d'assistance aux révisions académiques, comprenant l'organisation de bibliothèques de cours, la génération de fiches mémoires selon l'algorithme de répétition espacée (SM-2), l'entraînement sur des annales d'examens et un module de synthèse par intelligence artificielle.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>2.2. Responsabilité pédagogique de l'utilisateur :</strong> Les synthèses, réponses générées, indices et corrections d'entraînements proposés par le système d'intelligence artificielle constituent une assistance pédagogique méthodologique. Malgré la rigueur appliquée, l'éditeur ne saurait être tenu responsable d'inexactitudes ou d'omissions. L'utilisateur demeure seul responsable de la vérification de ses connaissances au regard des supports officiels émis par ses enseignants ou jurys d'examens.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>2.3. Propriété intellectuelle des contenus importés :</strong> L'utilisateur conserve l'intégralité des droits de propriété intellectuelle sur les polycopiés, fiches de synthèse ou documents PDF qu'il téléverse sur son espace privé. Sof.IA n'acquiert aucun droit de propriété ni de cession sur les documents personnels de ses utilisateurs.
            </p>
          </section>

          {/* Article 3 */}
          <section style={{ borderBottom: '1px solid #1f1f23', paddingBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f5', marginBottom: '1rem' }}>
              Article 3. Conditions Générales de Vente (CGV) & Abonnements
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>3.1. Formules tarifaires :</strong> Sof.IA propose une formule gratuite standard (5 crédits IA par jour, accès illimité aux répétitions SM-2 créées) ainsi qu'un abonnement payant « Premium » mensuel sans engagement (50 crédits IA par jour, déblocage de l'import d'annales et de la recherche globale). Les prix applicables sont indiqués toutes taxes comprises (TTC) au moment de la commande.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>3.2. Traitement sécurisé des paiements :</strong> La souscription et l'encaissement des transactions sont traités via la plateforme internationale sécurisée <strong>Payhip</strong> et ses prestataires de paiement certifiés (PayPal et Stripe). Sof.IA ne collecte, ne traite ni ne stocke aucune coordonnée bancaire ou numéro de carte de paiement sur ses propres serveurs.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>3.3. Droit de rétractation et exécution immédiate :</strong> Conformément à l'article L. 221-28 13° du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture d'un contenu numérique non fourni sur un support matériel dont l'exécution a commencé après accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation. Les avantages de l'abonnement Premium étant immédiatement activés dès validation du règlement par Payhip, l'accès au service est instantané.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>3.4. Modalités de résiliation :</strong> L'abonnement Premium est souscrit sans engagement de durée. Le client peut y mettre un terme à tout moment, en 1 clic :
              <br />
              • Via le lien de gestion automatique fourni par email par Payhip lors de la confirmation d'achat.
              <br />
              • Ou sur simple demande écrite formulée auprès du support à <strong>sofia.study.app@gmail.com</strong>.
              <br />
              La résiliation prend effet au terme de la période mensuelle en cours ; aucun prélèvement ultérieur ne sera effectué.
            </p>
          </section>

          {/* Article 4 : RGPD */}
          <section style={{ borderBottom: '1px solid #1f1f23', paddingBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f5', marginBottom: '1rem' }}>
              Article 4. Protection des Données Personnelles (RGPD)
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              Conformément au Règlement Général sur la Protection des Données (Règlement UE 2016/679 dit « RGPD ») et à la loi Informatique et Libertés :
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>4.1. Données collectées :</strong> Les données collectées sont strictement limitées à ce qui est nécessaire au fonctionnement du service : adresse email d'authentification, mot de passe chiffré (géré par Supabase Auth), état d'avancement des répétitions espacées, historique d'entraînement et statut de souscription.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>4.2. Finalité du traitement et absence de revente :</strong> Ces données sont traitées pour la gestion de votre compte, la personnalisation de vos révisions et l'exécution du contrat. <strong>Vos données personnelles ne font l'objet d'aucune vente, location ou transmission commerciale à des tiers</strong>.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>4.3. Cookies et traceurs :</strong> Sof.IA n'emploie aucun traceur publicitaire intrusif. Seuls sont utilisés les jetons de session d'authentification techniques indispensables au maintien de la connexion de l'utilisateur.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>4.4. Droits des utilisateurs (accès, rectification, suppression) :</strong> Vous disposez à tout moment d'un droit d'accès, de rectification, de portabilité et de suppression intégrale de l'ensemble de vos données. Pour exercer ce droit ou solliciter l'effacement immédiat et définitif de votre compte et de toutes vos révisions, il vous suffit d'adresser votre demande par courriel à :{' '}
              <a href="mailto:sofia.study.app@gmail.com" style={{ color: '#ffffff', textDecoration: 'underline' }}>
                sofia.study.app@gmail.com
              </a>. Le traitement est effectué sous 48 heures ouvrées.
            </p>
          </section>

          {/* Article 5 */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f5', marginBottom: '1rem' }}>
              Article 5. Droit Applicable et Litiges
            </h2>
            <p>
              Les présentes conditions sont régies et interprétées selon le droit français. En cas de réclamation ou litige survenant à l'occasion de l'utilisation du service ou d'un paiement, l'utilisateur et l'éditeur s'engagent à rechercher prioritairement une solution amiable en contactant le support à <code>sofia.study.app@gmail.com</code>.
            </p>
          </section>

        </main>

        <footer style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid #27272a', fontSize: '0.8rem', color: '#71717a', textAlign: 'center' }}>
          Sof.IA • Application web d'aide aux études • Contact support : sofia.study.app@gmail.com
        </footer>
      </div>
    </div>
  );
}
