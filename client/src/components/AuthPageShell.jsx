import { CheckCircle2, ShieldCheck } from "lucide-react";

export function AuthPageShell({ eyebrow, title, description, children, asideTitle, asideItems = [] }) {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-context" aria-label="Informacion mbi CampusLab Twin">
          <div className="auth-context-mark" aria-hidden="true">CT</div>
          <div>
            <p className="auth-context-kicker">CampusLab Twin</p>
            <h2>{asideTitle}</h2>
            <ul>
              {asideItems.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}
            </ul>
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
