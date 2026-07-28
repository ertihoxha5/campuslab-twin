import { ArrowRight, FlaskConical } from "lucide-react";
import { Link, Route, Routes } from "react-router-dom";

function HomePage() {
  return (
    <main className="page-shell">
      <nav className="navigation" aria-label="Navigimi kryesor">
        <Link className="brand" to="/" aria-label="CampusLab Twin — Kryefaqja">
          <span className="brand-mark">
            <FlaskConical size={20} aria-hidden="true" />
          </span>
          CampusLab Twin
        </Link>
        <span className="status-badge">Në ndërtim</span>
      </nav>

      <section className="hero">
        <p className="eyebrow">Digital Twin për universitetet</p>
        <h1>Laboratorë më të zgjuar, më të sigurt dhe më efikasë.</h1>
        <p className="hero-copy">
          CampusLab Twin lidh hapësirat, pajisjet dhe të dhënat laboratorike në
          një pamje të vetme digjitale.
        </p>
        <a className="primary-action" href="mailto:info@campuslab.local">
          Mëso më shumë
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="centered-page">
      <p className="eyebrow">404</p>
      <h1>Faqja nuk u gjet.</h1>
      <Link className="text-link" to="/">
        Kthehu në kryefaqe
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
