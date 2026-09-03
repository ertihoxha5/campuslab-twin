import { Activity, CheckCircle2, Radio, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo.jsx";

export function AuthPageShell({ eyebrow, title, description, children, asideTitle, asideItems = [], variant = "login" }) {
  return (
    <main className={`auth-page auth-${variant}-page`}>
      <section className="auth-shell">
        <aside className="auth-context" aria-label="Informacion mbi CampusLab Twin">
          <Link className="auth-brand" to="/" aria-label="CampusLab Twin — Kryefaqja"><BrandLogo /><span><strong>CampusLab Twin</strong><small>Digital laboratory operations</small></span></Link>
          <div className="auth-context-copy">
            <p className="auth-context-kicker">CampusLab Twin</p>
            <h2>{asideTitle}</h2>
            <ul>
              {asideItems.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}
            </ul>
          </div>
          <div className="auth-live-scene" aria-hidden="true">
            <div className="auth-radar"><span><Activity /></span><i className="radar-node node-one"><Radio /></i><i className="radar-node node-two"><Zap /></i><i className="radar-node node-three"><ShieldCheck /></i></div>
            <div className="auth-live-readout"><span><i /> LIVE</span><strong>Laboratori i lidhur</strong><small>Sinjalet po monitorohen</small></div>
          </div>
          <p className="auth-security-note"><ShieldCheck size={16} /> Lidhje e sigurt dhe izolim i të dhënave për çdo universitet.</p>
        </aside>
        <div className="auth-card">
          <header>
            <p className="ui-page-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
