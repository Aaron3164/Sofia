import React, {
    startTransition,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import type { CSSProperties } from "react"

interface LandingPageProps {
    onGetStarted?: () => void
    appUrl?: string
    style?: CSSProperties
}

export default function LandingPage(props: LandingPageProps) {
    const { onGetStarted, appUrl, style } = props
    const [flashRevealed, setFlashRevealed] = useState(false)
    const [qcmChoice, setQcmChoice] = useState<"A" | "B" | null>(null)

    const handleAction = useCallback(
        (event?: React.MouseEvent) => {
            if (onGetStarted) {
                if (event) event.preventDefault()
                onGetStarted()
            }
        },
        [onGetStarted]
    )

    const css = useMemo(
        () => `
.sofia-landing, .sofia-landing * { box-sizing: border-box; }
.sofia-landing {
  --bg:#FFFCFD; --pink:#DF216C; --plum:#302135; --muted:#827581; --line:#EFDFE7; --pale:#FBEFF4;
  background:var(--bg); color:var(--plum); width:100%; min-height:100vh; height:100%; overflow-y:auto; font-family:Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; overflow-x:hidden;
}
.sofia-landing a { color:inherit; text-decoration:none; }
.sofia-landing button { font:inherit; color:inherit; }
.sofia-landing .container { width:min(1104px, calc(100% - 32px)); margin:0 auto; }
.sofia-landing .section { padding:80px 0; }
.sofia-landing .pill { border:1px solid var(--line); border-radius:999px; padding:12px 20px; display:inline-flex; align-items:center; gap:8px; font-weight:600; cursor:pointer; }
.sofia-landing .btn-primary { background:var(--pink); color:#fff; border-color:var(--pink); }
.sofia-landing .btn-secondary { background:#fff; color:var(--plum); }
.sofia-landing .btn-outline { background:transparent; color:var(--pink); border-color:var(--pink); }
.sofia-landing .header { padding:20px 0; border-bottom:1px solid #f5e7ee; position:sticky; top:0; z-index:50; backdrop-filter: blur(10px); background:rgba(255,252,253,.94); width:100%; }
.sofia-landing .header .container { width:min(1240px, calc(100% - 48px)); }
.sofia-landing .header-inner { display:flex; justify-content:space-between; align-items:center; width:100%; gap:24px; }
.sofia-landing .logo { font-size:38px; font-weight:850; color:var(--pink); letter-spacing:-0.035em; cursor:pointer; display:inline-flex; align-items:center; gap:14px; }
.sofia-landing .logo-img { width:46px; height:46px; border-radius:12px; object-fit:contain; box-shadow: 0 4px 14px rgba(223,33,108,0.12); }
.sofia-landing .header-right { display:flex; align-items:center; gap:24px; }
.sofia-landing .tagline { color:var(--muted); font-weight:600; font-size:15px; }
.sofia-landing h1,.sofia-landing h2,.sofia-landing h3,.sofia-landing h4,.sofia-landing p { margin:0; }
.sofia-landing .hero { display:grid; grid-template-columns:1fr 520px; gap:44px; align-items:center; position:relative; }
.sofia-landing .hero-glow { position:absolute; right:80px; top:10px; width:440px; height:440px; border-radius:50%; background:radial-gradient(circle,#ffd7e8 0%,rgba(255,215,232,0) 70%); filter:blur(6px); pointer-events:none;}
.sofia-landing .h1 { font-size:clamp(42px,8vw,80px); line-height:1.02; letter-spacing:-0.045em; max-width:14ch; }
.sofia-landing .hero-copy > p { color:var(--muted); margin-top:20px; max-width:52ch; line-height:1.6; }
.sofia-landing .cta-row { margin-top:30px; display:flex; flex-wrap:wrap; gap:12px; }
.sofia-landing .note { margin-top:16px; color:var(--muted); font-size:14px; }
.sofia-landing .visual { position:relative; width:520px; height:470px; }
.sofia-landing .card { border:1px solid var(--line); border-radius:24px; background:#fff; box-shadow:0 16px 42px rgba(223,33,108,.08); }
.sofia-landing .sheet { width:330px; height:360px; padding:28px; transform:rotate(-9deg); position:absolute; left:20px; top:30px; }
.sofia-landing .float { width:300px; height:230px; padding:24px; background:var(--pink); color:#fff; transform:rotate(8deg); position:absolute; right:10px; top:210px; animation:sofiaFloatY 7s ease-in-out infinite; }
.sofia-landing .float .eyebrow { color:#ffd5e6; }
.sofia-landing .float h3 { font-size:26px; line-height:1.1; letter-spacing:-0.02em; margin-top:12px; }
.sofia-landing .chip { position:absolute; left:180px; bottom:26px; border-radius:999px; border:1px solid var(--line); background:#fff; padding:10px 16px; font-size:12px; font-weight:700; letter-spacing:.04em; }
.sofia-landing .eyebrow { color:var(--pink); font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
.sofia-landing .overview-grid { margin-top:28px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.sofia-landing .overview-card { padding:28px; min-height:260px; display:flex; flex-direction:column; gap:14px; transition:transform .3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .3s ease, border-color .3s ease; }
.sofia-landing .overview-card:hover { transform:scale(1.03) translateY(-4px); box-shadow:0 18px 40px rgba(223,33,108,.14); border-color:#f5b0cd; z-index:2; }
.sofia-landing .overview-card.pink { background:#fff4f9; }
.sofia-landing .annales-banner { margin-top:16px; padding:24px 28px; display:flex; justify-content:space-between; align-items:center; transition:transform .3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .3s ease; }
.sofia-landing .annales-banner:hover { transform:scale(1.015) translateY(-2px); box-shadow:0 12px 30px rgba(223,33,108,.12); }
.sofia-landing .feature-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:24px; }
.sofia-landing .feature-card { padding:28px; min-height:360px; }
.sofia-landing .feature-a { background:#fff2f8; } .sofia-landing .feature-b { background:#f5f2ff; }

/* ── 3D FLIP FLASHCARD INTERACTIVE ── */
.sofia-landing .flip-container {
  perspective: 1000px;
  width: 100%;
  min-height: 220px;
  cursor: pointer;
  user-select: none;
  margin-top: 16px;
}
.sofia-landing .flip-inner {
  position: relative;
  width: 100%;
  min-height: 220px;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
  transform-style: preserve-3d;
}
.sofia-landing .flip-inner.is-flipped {
  transform: rotateY(180deg);
}
.sofia-landing .flip-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  padding: 22px;
  border: 1px solid var(--line);
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  box-shadow: 0 10px 25px rgba(223,33,108,.06);
}
.sofia-landing .flip-front {
  transform: rotateY(0deg);
}
.sofia-landing .flip-back {
  transform: rotateY(180deg);
  background: #fff8fb;
  border-color: #f7bbd4;
}
.sofia-landing .flip-hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--pink);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 12px;
}

/* ── REFINED QCM STYLING ── */
.sofia-landing .qcm-card {
  margin-top: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 25px rgba(48,33,53,.04);
}
.sofia-landing .qcm-option {
  width: 100%;
  text-align: left;
  margin-top: 10px;
  background: #faf8fa;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 550;
  color: var(--plum);
  transition: all 0.2s ease;
}
.sofia-landing .qcm-option:hover {
  border-color: #f2bad2;
  background: #fff4f9;
  transform: translateX(3px);
}
.sofia-landing .qcm-option.selected-correct {
  border-color: #10b981;
  background: #ecfdf5;
  color: #065f46;
}
.sofia-landing .qcm-option.selected-wrong {
  border-color: #f43f5e;
  background: #fff1f2;
  color: #9f1239;
}
.sofia-landing .qcm-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--line);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.sofia-landing .qcm-feedback {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
}
.sofia-landing .qcm-feedback.correct {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.sofia-landing .qcm-feedback.wrong {
  background: #fff1f2;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.sofia-landing .two-col { display:grid; grid-template-columns:1fr 1fr; gap:30px; align-items:center; }
.sofia-landing .benefits { margin-top:18px; display:grid; gap:10px; }
.sofia-landing .benefit { display:flex; gap:10px; align-items:flex-start; color:var(--muted); }

/* ── TALLER & CHIANTE SOURCE SHEET ── */
.sofia-landing .sheets { position:relative; min-height:480px; }
.sofia-landing .sheet-back {
  position:absolute;
  top:10px;
  left:20px;
  transform:rotate(-6deg);
  width:320px;
  min-height:430px;
  padding:22px 24px;
  background:#fff;
  border:1px solid #e5d7df;
  box-shadow: 0 14px 34px rgba(48,33,53,.07);
}
.sofia-landing .sheet-back .dense-text {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #7b6e7d;
  font-family: ui-serif, Georgia, Cambria, serif;
}
.sofia-landing .sheet-front {
  position:absolute;
  top:110px;
  left:130px;
  transform:rotate(5deg);
  width:320px;
  padding:24px;
  box-shadow: 0 20px 48px rgba(223,33,108,.16);
  border: 1.5px solid #f2bad2;
  z-index: 2;
}
.sofia-landing .highlight { margin-top:14px; background:#ffe7f1; color:var(--pink); border-radius:10px; padding:10px 12px; font-weight:700; }
.sofia-landing .pale-section { background:var(--pale); }
.sofia-landing .synth-wrap { display:grid; grid-template-columns:1fr 1fr; gap:30px; align-items:center; }
.sofia-landing .small-tilt { position:absolute; width:170px; padding:14px; border-radius:16px; border:1px solid var(--line); background:#fff; }
.sofia-landing .small-tilt-a { top:20px; left:10px; transform:rotate(-8deg); }
.sofia-landing .small-tilt-b { top:28px; left:205px; transform:rotate(7deg); }
.sofia-landing .synth-left { min-height:320px; position:relative; }
.sofia-landing .synth-main { position:absolute; left:70px; top:90px; width:360px; padding:24px; }
.sofia-landing .search-visual { margin-top:18px; border-radius:14px; border:1px solid var(--line); background:#fff; padding:14px 16px; color:#655766; }

/* ── EXACT AGENDA AS IN SCREEN 4 ── */
.sofia-landing .agenda-container {
  background: #fbf7f2;
  border: 1px solid #ebdcd0;
  border-radius: 28px;
  padding: 36px 32px 30px;
  max-width: 500px;
  margin: 0 auto;
}
.sofia-landing .agenda-title {
  font-size: 26px;
  font-weight: 800;
  color: #26192a;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}
.sofia-landing .agenda-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sofia-landing .agenda-item {
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 15px;
  background: #fff;
  border: 1px solid rgba(220, 205, 195, 0.5);
  box-shadow: 0 4px 14px rgba(48, 33, 53, 0.04);
}
.sofia-landing .agenda-date {
  font-weight: 700;
  font-size: 13.5px;
  color: #7b6e7d;
  min-width: 58px;
  letter-spacing: 0.02em;
}
.sofia-landing .agenda-desc {
  font-weight: 600;
  color: #2b1c2e;
}
.sofia-landing .agenda-item.highlighted {
  background: #DF216C;
  color: #ffffff;
  border: none;
  transform: rotate(-1.5deg) scale(1.02);
  box-shadow: 0 10px 28px rgba(223, 33, 108, 0.35);
  z-index: 2;
  position: relative;
}
.sofia-landing .agenda-item.highlighted .agenda-date {
  color: #ffccd9;
}
.sofia-landing .agenda-item.highlighted .agenda-desc {
  color: #ffffff;
  font-weight: 700;
}
.sofia-landing .agenda-footer-note {
  margin-top: 24px;
  font-size: 13.5px;
  color: #8c7e8e;
  font-weight: 500;
}

/* ── EXACT SECTION "ET TOUT CE QU'IL TE FAUT AUTOUR" AS SCREEN 5 ── */
.sofia-landing .columns3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
  margin-top: 36px;
}
.sofia-landing .columns3-col {
  border-top: 1.5px solid #f0e2ea;
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sofia-landing .columns3-tag {
  color: #DF216C;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0;
}
.sofia-landing .columns3-title {
  font-size: 24px;
  font-weight: 800;
  color: #2b1a30;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0;
}
.sofia-landing .columns3-desc {
  color: #6a5d6d;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}

.sofia-landing .prices { margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:stretch; }
.sofia-landing .price-card { padding:28px; display:flex; flex-direction:column; min-height:100%; }
.sofia-landing .price-card ul { margin:18px 0 22px; padding-left:18px; color:#5f5462; line-height:1.5; flex:1; }
.sofia-landing .price-card li { padding:12px 0; border-top:1px solid #f0e6ec; }
.sofia-landing .price-card li:first-child { border-top:none; padding-top:0; }
.sofia-landing .price-value { margin-top:6px; font-size:64px; font-weight:700; line-height:.95; letter-spacing:-0.03em; }
.sofia-landing .premium { background:#fff1f7; border:1px solid #f2bad2; }
.sofia-landing .badge { align-self:flex-start; border-radius:999px; background:#DF216C; color:#fff; padding:6px 10px; font-size:11px; font-weight:700; margin-bottom:10px; }
.sofia-landing .closing { text-align:center; background:var(--pale); border-radius:24px; padding:56px 20px; }
.sofia-landing footer { padding:26px 0 40px; color:var(--muted); display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.sofia-landing [data-reveal] { opacity:0; transform:translateY(18px); transition:opacity .6s ease, transform .6s ease; }
.sofia-landing .is-visible { opacity:1 !important; transform:none !important; }
@keyframes sofiaFloatY { 0%,100%{ transform:rotate(8deg) translateY(0) } 50%{ transform:rotate(8deg) translateY(-10px)}}
.sofia-landing .hero > *, .sofia-landing .two-col > *, .sofia-landing .synth-wrap > *, .sofia-landing .feature-grid > *, .sofia-landing .overview-grid > *, .sofia-landing .prices > *, .sofia-landing .columns3 > * { min-width:0; }
.sofia-landing [id] { scroll-margin-top:120px; }
@media (max-width: 1024px){
  .sofia-landing .hero,.sofia-landing .two-col,.sofia-landing .synth-wrap{ grid-template-columns:1fr; }
  .sofia-landing .visual{ margin:0 auto; max-width:100%; transform:scale(.92); transform-origin:top center;}
  .sofia-landing .overview-grid,.sofia-landing .columns3,.sofia-landing .prices,.sofia-landing .feature-grid{ grid-template-columns:1fr 1fr; }
}
@media (max-width: 760px){
  .sofia-landing .header-inner{ grid-template-columns:1fr; text-align:left; }
  .sofia-landing .tagline{ text-align:left; }
  .sofia-landing .section{ padding:56px 0; }
  .sofia-landing .overview-grid,.sofia-landing .columns3,.sofia-landing .prices,.sofia-landing .feature-grid{ grid-template-columns:1fr; }
  .sofia-landing .visual{ width:100%; min-width:0; height:400px; transform:none; left:0; }
  .sofia-landing .sheet{ width:min(75%,330px); left:3%; top:30px; }
  .sofia-landing .float{ width:min(70%,300px); right:0; top:180px; }
  .sofia-landing .chip{ left:auto; right:4px; bottom:8px; }
  .sofia-landing .sheet-back,.sofia-landing .sheet-front{ width:70%; }
  .sofia-landing .sheet-back{ left:0; }
  .sofia-landing .sheet-front{ left:auto; right:0; }
  .sofia-landing .small-tilt{ width:42%; }
  .sofia-landing .small-tilt-a{ left:0; top:18px; }
  .sofia-landing .small-tilt-b{ left:auto; right:0; top:22px; }
  .sofia-landing .synth-main{ width:90%; left:5%; }
}
@media (prefers-reduced-motion: reduce){
  .sofia-landing *{ animation:none !important; transition:none !important; scroll-behavior:auto !important; }
  .sofia-landing [data-reveal]{ opacity:1; transform:none; }
}
`,
        []
    )

    const onAnchorClick = useCallback(
        (event: React.MouseEvent<HTMLAnchorElement>) => {
            const href = event.currentTarget.getAttribute("href")
            if (!href || !href.startsWith("#")) return
            if (
                typeof window !== "undefined" &&
                typeof document !== "undefined"
            ) {
                const el = document.querySelector(href)
                if (el) {
                    event.preventDefault()
                    const reduceMotion = window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    ).matches
                    el.scrollIntoView({
                        behavior: reduceMotion ? "auto" : "smooth",
                        block: "start",
                    })
                }
            }
        },
        []
    )

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined")
            return
        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
        const nodes = Array.from(
            document.querySelectorAll<HTMLElement>(
                ".sofia-landing [data-reveal]"
            )
        )
        if (reduced || !("IntersectionObserver" in window)) {
            nodes.forEach((n) => n.classList.add("is-visible"))
            return
        }
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible")
                        observer.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.16 }
        )
        nodes.forEach((n) => observer.observe(n))
        return () => observer.disconnect()
    }, [])

    const icon = useCallback((path: string) => {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d={path}
                    fill="none"
                    stroke="#DF216C"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        )
    }, [])

    return (
        <main
            className="sofia-landing"
            style={{ position: "relative", ...style }}
        >
            <style>{css}</style>
            <header className="header">
                <div className="container header-inner">
                    <div className="logo" onClick={handleAction}>
                        <img src="/sofia-logo.png" alt="Logo Sof.IA" className="logo-img" />
                        <span>sof.ia</span>
                    </div>
                    <div className="header-right">
                        <div className="tagline">
                            Un peu d’IA. Beaucoup de déclics.
                        </div>
                        {onGetStarted ? (
                            <button className="pill btn-outline focusable" onClick={handleAction} type="button">
                                Ouvrir Sofia
                            </button>
                        ) : (
                            <a className="pill btn-outline focusable" href={appUrl}>
                                Ouvrir Sofia
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <section className="section">
                <div className="container hero">
                    <div className="hero-glow" />
                    <div data-reveal className="hero-copy">
                        <h1 className="h1">Moins subir. Mieux retenir.</h1>
                        <p>
                            Tes cours sont denses. Tes révisions n’ont pas à
                            l’être. Avec Sofia, transforme tes PDF en supports
                            pour comprendre, t’entraîner et avancer.
                        </p>
                        <div className="cta-row">
                            {onGetStarted ? (
                                <button
                                    className="pill btn-primary focusable"
                                    onClick={handleAction}
                                    type="button"
                                >
                                    Commencer avec Sofia
                                </button>
                            ) : (
                                <a
                                    className="pill btn-primary focusable"
                                    href={appUrl}
                                >
                                    Commencer avec Sofia
                                </a>
                            )}
                            <a
                                className="pill btn-secondary focusable"
                                href="#fonctionnalites"
                                onClick={onAnchorClick}
                            >
                                Découvrir les outils
                            </a>
                        </div>
                        <p className="note">
                            Tes sources. Ton rythme. Ton espace de révision.
                        </p>
                    </div>
                    <div className="visual" aria-hidden="true" data-reveal>
                        <article className="card sheet">
                            <p className="eyebrow">TON COURS, EN CLAIR</p>
                            <h3 style={{ marginTop: 14, fontSize: 24 }}>
                                La mémoire à long terme
                            </h3>
                            <p
                                style={{
                                    marginTop: 14,
                                    color: "#6c5f6f",
                                    lineHeight: 1.55,
                                }}
                            >
                                Comprendre, encoder, retrouver : trois étapes
                                pour ancrer une connaissance.
                            </p>
                        </article>
                        <article className="card float">
                            <p className="eyebrow">
                                LE PETIT TEST QUI CHANGE TOUT
                            </p>
                            <h3>
                                Et si tu essayais de te souvenir, sans relire ?
                            </h3>
                        </article>
                        <div className="chip">PDF • 24 PAGES</div>
                    </div>
                </div>
            </section>

            <section id="fonctionnalites" className="section">
                <div className="container" data-reveal>
                    <p className="eyebrow">
                        UN SEUL ESPACE. TOUTES TES RÉVISIONS.
                    </p>
                    <h2
                        style={{
                            marginTop: 10,
                            fontSize: "clamp(30px,5vw,54px)",
                            letterSpacing: "-0.03em",
                        }}
                    >
                        De la première lecture au jour J.
                    </h2>
                    <div className="overview-grid">
                        {[
                            [
                                "#flashcards",
                                "Flashcards actives",
                                "Teste ta mémoire en continu, sans relire passivement.",
                                "pink",
                                "M4 12h16M12 4v16M6 8h12M6 16h12",
                            ],
                            [
                                "#qcm",
                                "QCM & examens blancs",
                                "Transforme tes notions en entraînements réalistes.",
                                "",
                                "M4 6h16M4 12h10M4 18h7",
                            ],
                            [
                                "#resumes",
                                "Résumés essentiels",
                                "Dégage les points clés d’un cours dense en quelques secondes.",
                                "",
                                "M6 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
                            ],
                            [
                                "#recherche-transversale",
                                "Recherche transversale",
                                "Relie plusieurs cours pour bâtir une synthèse solide.",
                                "pink",
                                "M3 12h4l3 8h10l4-8M10 20h4",
                            ],
                            [
                                "#planning",
                                "Planning de révision",
                                "Espace tes séances pour avancer sereinement.",
                                "",
                                "M7 3v4M17 3v4M4 9h16M5 6h14a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1z",
                            ],
                            [
                                "#bibliotheque",
                                "Bibliothèque cloud",
                                "Retrouve tes supports dans un espace clair et structuré.",
                                "",
                                "M4 5h16v14H4zM9 5v14M14 5v14",
                            ],
                        ].map(([href, title, desc, tone, path]) => (
                            <a
                                key={String(title)}
                                href={String(href)}
                                onClick={onAnchorClick}
                                className={`card overview-card ${tone}`}
                                data-reveal
                            >
                                {icon(String(path))}
                                <h3
                                    style={{
                                        fontSize: 22,
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    {title}
                                </h3>
                                <p
                                    style={{
                                        color: "#6a5d6d",
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {desc}
                                </p>
                            </a>
                        ))}
                    </div>
                    <a
                        className="card annales-banner focusable"
                        href="#annales"
                        onClick={onAnchorClick}
                        data-reveal
                    >
                        <strong>Et pour le jour J ? Les annales aussi.</strong>
                        <span style={{ color: "#DF216C", fontWeight: 700 }}>
                            Voir
                        </span>
                    </a>
                </div>
            </section>

            <section className="section">
                <div className="container" data-reveal>
                    <h2
                        style={{
                            fontSize: "clamp(30px,5vw,52px)",
                            letterSpacing: "-0.03em",
                        }}
                    >
                        Fais travailler ta mémoire. Pas ton surligneur.
                    </h2>
                    <div className="feature-grid">
                        <article
                            className="card feature-card feature-a"
                            id="flashcards"
                        >
                            <p className="eyebrow">01 / FLASHCARDS</p>
                            <h3 style={{ marginTop: 8, fontSize: 28 }}>
                                Le déclic au bout des doigts.
                            </h3>
                            <div 
                                className="flip-container"
                                onClick={() => startTransition(() => setFlashRevealed(v => !v))}
                                role="button"
                                tabIndex={0}
                                aria-label="Retourner la flashcard"
                            >
                                <div className={`flip-inner ${flashRevealed ? 'is-flipped' : ''}`}>
                                    {/* Recto */}
                                    <div className="flip-face flip-front">
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#DF216C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                                Question
                                            </span>
                                            <p style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: '#302135', lineHeight: 1.4 }}>
                                                Qu’est-ce que le rappel actif ?
                                            </p>
                                        </div>
                                        <div className="flip-hint">
                                            <span>↻ Cliquer pour retourner la carte</span>
                                        </div>
                                    </div>
                                    {/* Verso */}
                                    <div className="flip-face flip-back">
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#DF216C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                                Réponse
                                            </span>
                                            <p style={{ marginTop: 10, fontSize: 16, fontWeight: 600, color: '#302135', lineHeight: 1.5 }}>
                                                Retrouver une information de mémoire, sans regarder son cours.
                                            </p>
                                        </div>
                                        <div className="flip-hint">
                                            <span>✓ Réponse validée</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>

                        <article
                            className="card feature-card feature-b"
                            id="qcm"
                        >
                            <p className="eyebrow">02 / QCM & EXAMENS BLANCS</p>
                            <h3 style={{ marginTop: 8, fontSize: 28 }}>
                                Mieux vaut se tromper ici.
                            </h3>
                            <div className="qcm-card">
                                <p style={{ fontWeight: 700, color: '#302135', fontSize: 16 }}>
                                    Pour mieux retenir, tu choisis…
                                </p>
                                <button
                                    className={`qcm-option focusable ${qcmChoice === 'A' ? 'selected-wrong' : ''}`}
                                    type="button"
                                    onClick={() =>
                                        startTransition(() => setQcmChoice("A"))
                                    }
                                    aria-pressed={qcmChoice === "A"}
                                >
                                    <span className="qcm-badge">A</span>
                                    <span>Relire cinq fois le même cours</span>
                                </button>
                                <button
                                    className={`qcm-option focusable ${qcmChoice === 'B' ? 'selected-correct' : ''}`}
                                    type="button"
                                    onClick={() =>
                                        startTransition(() => setQcmChoice("B"))
                                    }
                                    aria-pressed={qcmChoice === "B"}
                                >
                                    <span className="qcm-badge">B</span>
                                    <span>Se tester et espacer ses révisions</span>
                                </button>

                                {qcmChoice === 'A' && (
                                    <div className="qcm-feedback wrong" aria-live="polite">
                                        ✕ Pas optimal : la relecture seule donne une illusion trompeuse de maîtrise.
                                    </div>
                                )}
                                {qcmChoice === 'B' && (
                                    <div className="qcm-feedback correct" aria-live="polite">
                                        ✓ Exact : rappel actif + répétition espacée = apprentissage durable.
                                    </div>
                                )}
                                {qcmChoice === null && (
                                    <p style={{ marginTop: 12, fontSize: 13, color: '#827581', fontWeight: 500 }}>
                                        Choisis une réponse pour tester ta méthode.
                                    </p>
                                )}
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section id="resumes" className="section">
                <div className="container two-col">
                    <div data-reveal>
                        <p className="eyebrow">
                            RÉSUMÉS / DE LA DENSITÉ À LA CLARTÉ
                        </p>
                        <h2
                            style={{
                                marginTop: 10,
                                fontSize: "clamp(30px,5vw,50px)",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            Le cours est long. Le fil devient évident.
                        </h2>
                        <p
                            style={{
                                marginTop: 14,
                                color: "#6a5d6d",
                                lineHeight: 1.6,
                            }}
                        >
                            Sofia transforme tes PDF en résumés structurés. Les
                            notions clés ressortent, les idées s’organisent et
                            tu retrouves une base claire pour réviser.
                        </p>
                        <div className="benefits">
                            {[
                                "1. Concepts essentiels repérés",
                                "2. Structure lisible en quelques secondes",
                                "3. L’essentiel avant de se tester",
                            ].map((item) => (
                                <div key={item} className="benefit">
                                    <strong style={{ color: "#302135" }}>
                                        {item}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="sheets" data-reveal aria-hidden="true">
                        <article className="card sheet-back">
                            <p className="eyebrow">SOURCE</p>
                            <div className="dense-text">
                                <p style={{ fontWeight: 700, color: '#4a3b4e', marginBottom: 6 }}>
                                    Chapitre IV — Neurophysiologie de la mémoire
                                </p>
                                <p style={{ marginBottom: 6 }}>
                                    L'apprentissage synaptique implique une potentialisation à long terme (LTP) au sein des circuits hippocampiques CA1 et CA3.
                                </p>
                                <p style={{ marginBottom: 6 }}>
                                    La consolidation mnésique requiert une réactivation nocturne synchrone durant les phases de sommeil à ondes lentes, favorisant le transfert néocortical graduel.
                                </p>
                                <p style={{ marginBottom: 6 }}>
                                    Facteurs d'interférence proactive et rétroactive selon les contextes d'encodage multimodal et de rappel indicé sous contrainte...
                                </p>
                                <p style={{ color: '#b0a3b0', fontSize: 11 }}>
                                    [... 42 pages de polycopié brut ...]
                                </p>
                            </div>
                        </article>
                        <article className="card sheet-front">
                            <p className="eyebrow">TA FICHE</p>
                            <h4 style={{ marginTop: 8, fontSize: 24 }}>
                                L’ESSENTIEL
                            </h4>
                            <p style={{ marginTop: 8, color: "#6a5d6d" }}>
                                Mémoriser en 3 idées.
                            </p>
                            <div className="highlight">
                                Encoder. Consolider. Retrouver.
                            </div>
                            <p
                                style={{
                                    marginTop: 12,
                                    fontSize: 14,
                                    color: "#6a5d6d",
                                }}
                            >
                                Exemple : se tester sans support renforce
                                l’accès au souvenir.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <section
                id="recherche-transversale"
                className="section pale-section"
            >
                <div className="container synth-wrap">
                    <div className="synth-left" data-reveal aria-hidden="true">
                        <div className="small-tilt small-tilt-a">
                            <p className="eyebrow">Neurosciences</p>
                            <p>Encodage multimodal</p>
                        </div>
                        <div className="small-tilt small-tilt-b">
                            <p className="eyebrow">Psychologie</p>
                            <p>Récupération active</p>
                        </div>
                        <article className="card synth-main">
                            <h3 style={{ fontSize: 28 }}>
                                Comment se construit un souvenir ?
                            </h3>
                            <p style={{ marginTop: 12, color: "#6a5d6d" }}>
                                Sofia croise plusieurs cours pour créer une
                                réponse claire et argumentée.
                            </p>
                        </article>
                    </div>
                    <div data-reveal>
                        <p className="eyebrow">
                            03 / RECHERCHE GLOBALE & SYNTHÈSES
                        </p>
                        <h2
                            style={{
                                marginTop: 10,
                                fontSize: "clamp(30px,5vw,48px)",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            Tes idées ne vivent pas dans un seul PDF.
                        </h2>
                        <div className="search-visual">
                            🔎 “Quels liens entre encodage, sommeil et rappel
                            actif ?”
                        </div>
                        <p
                            style={{
                                marginTop: 14,
                                color: "#6a5d6d",
                                lineHeight: 1.6,
                            }}
                        >
                            La recherche transversale relie tes sources, compare
                            les notions et t’aide à bâtir des réponses de
                            synthèse plus solides.
                        </p>
                    </div>
                </div>
            </section>

            <section id="planning" className="section">
                <div className="container two-col">
                    <div data-reveal>
                        <p className="eyebrow">
                            04 / PLANIFICATION DES RÉVISIONS
                        </p>
                        <h2
                            style={{
                                marginTop: 10,
                                fontSize: "clamp(30px,5vw,48px)",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            Un peu aujourd’hui. Plus serein demain.
                        </h2>
                        <p
                            style={{
                                marginTop: 14,
                                color: "#6a5d6d",
                                lineHeight: 1.6,
                            }}
                        >
                            Sofia t’aide à répartir tes efforts: comprendre,
                            mémoriser, puis te tester avec régularité.
                        </p>
                    </div>
                    <article className="agenda-container" data-reveal>
                        <h3 className="agenda-title">Chaque session a sa place.</h3>
                        <div className="agenda-stack">
                            <div className="agenda-item">
                                <span className="agenda-date">LUN 12</span>
                                <span className="agenda-desc">Comprendre / Fiche de synthèse</span>
                            </div>
                            <div className="agenda-item highlighted">
                                <span className="agenda-date">MER 14</span>
                                <span className="agenda-desc">Mémoriser / Session flashcards</span>
                            </div>
                            <div className="agenda-item">
                                <span className="agenda-date">VEN 16</span>
                                <span className="agenda-desc">Se tester / QCM d’entraînement</span>
                            </div>
                        </div>
                        <p className="agenda-footer-note">
                            Exemple de semaine, à ton rythme.
                        </p>
                    </article>
                </div>
            </section>

            <section className="section">
                <div className="container" data-reveal>
                    <h2
                        style={{
                            fontSize: "clamp(30px,5vw,48px)",
                            letterSpacing: "-0.03em",
                            fontWeight: 800,
                        }}
                    >
                        Et tout ce qu’il te faut autour.
                    </h2>
                    <div className="columns3">
                        <div className="columns3-col" id="resumes-col">
                            <p className="columns3-tag">05 / RÉSUMÉS</p>
                            <h3 className="columns3-title">Va droit à l’essentiel.</h3>
                            <p className="columns3-desc">
                                Transforme les pages denses en fiches de synthèse pour retrouver le fil et les notions clés.
                            </p>
                        </div>
                        <div className="columns3-col" id="bibliotheque">
                            <p className="columns3-tag">06 / BIBLIOTHÈQUE CLOUD</p>
                            <h3 className="columns3-title">Une place pour chaque cours.</h3>
                            <p className="columns3-desc">
                                Centralise tes sources dans ton espace. Tes supports ne sont plus dispersés entre dix dossiers.
                            </p>
                        </div>
                        <div className="columns3-col" id="annales">
                            <p className="columns3-tag">07 / ANNALES</p>
                            <h3 className="columns3-title">Comprends aussi tes erreurs.</h3>
                            <p className="columns3-desc">
                                Travaille les sujets des années précédentes avec des corrections pour éclaircir les points qui coincent.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="tarifs" className="section">
                <div className="container" data-reveal>
                    <h2
                        style={{
                            fontSize: "clamp(30px,5vw,46px)",
                            letterSpacing: "-0.03em",
                        }}
                    >
                        Choisis ton rythme de révision.
                    </h2>
                    <p style={{ marginTop: 10, color: "#6a5d6d" }}>
                        Sans engagement de durée. Annulation immédiate en un
                        clic.
                    </p>
                    <div className="prices">
                        <article className="card price-card">
                            <h3>Découverte</h3>
                            <p className="price-value">
                                0€
                                <span style={{ fontSize: 16, fontWeight: 500 }}>
                                    /mois
                                </span>
                            </p>
                            <ul>
                                <li>Dossiers & cours organisés</li>
                                <li>Flashcards & QCM d’entraînement</li>
                                <li>Répétition espacée (Leitner)</li>
                                <li>Recherche transversale</li>
                                <li>Jusqu’à 10 cours enregistrés</li>
                                <li>10 générations IA quotidiennes</li>
                            </ul>
                            {onGetStarted ? (
                                <button
                                    className="pill btn-secondary focusable"
                                    onClick={handleAction}
                                    type="button"
                                >
                                    Commencer gratuitement
                                </button>
                            ) : (
                                <a
                                    className="pill btn-secondary focusable"
                                    href={appUrl}
                                >
                                    Commencer gratuitement
                                </a>
                            )}
                        </article>
                        <article className="card price-card premium">
                            <span className="badge">RECOMMANDÉ</span>
                            <h3>Premium Élite</h3>
                            <p className="price-value">
                                9,99€
                                <span style={{ fontSize: 16, fontWeight: 500 }}>
                                    /mois
                                </span>
                            </p>
                            <ul>
                                <li>Tous les avantages du plan Découverte</li>
                                <li>Cours & polycopiés illimités</li>
                                <li>
                                    Générations IA Sofia prioritaires &
                                    illimitées
                                </li>
                                <li>
                                    Importation illimitée d’annales officielles
                                </li>
                                <li>Explications pédagogiques approfondies</li>
                                <li>Support prioritaire 7j/7</li>
                            </ul>
                            {onGetStarted ? (
                                <button
                                    className="pill btn-primary focusable"
                                    onClick={handleAction}
                                    type="button"
                                >
                                    Passer au Premium
                                </button>
                            ) : (
                                <a
                                    className="pill btn-primary focusable"
                                    href={appUrl}
                                >
                                    Passer au Premium
                                </a>
                            )}
                        </article>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="closing" data-reveal>
                        <h2
                            style={{
                                fontSize: "clamp(30px,5vw,44px)",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            Ton prochain déclic commence ici.
                        </h2>
                        <div
                            className="cta-row"
                            style={{ justifyContent: "center", marginTop: 20 }}
                        >
                            {onGetStarted ? (
                                <button
                                    className="pill btn-primary focusable"
                                    onClick={handleAction}
                                    type="button"
                                >
                                    Créer mon espace de révision
                                </button>
                            ) : (
                                <a
                                    className="pill btn-primary focusable"
                                    href={appUrl}
                                >
                                    Créer mon espace de révision
                                </a>
                            )}
                        </div>
                    </div>
                    <footer>
                        <strong style={{ color: "#DF216C" }}>sof.ia</strong>
                        <span>
                            L’IA prépare le terrain. Le déclic, c’est toi.
                        </span>
                    </footer>
                </div>
            </section>
        </main>
    )
}
