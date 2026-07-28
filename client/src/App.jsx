import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Link, Route, Routes } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

function HomePage() {
  const [apiStatus, setApiStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/api/health", { signal: controller.signal })
      .then(() => setApiStatus("connected"))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setApiStatus("unavailable");
        }
      });

    return () => controller.abort();
  }, []);

  const statusLabel = {
    loading: "Po lidhet...",
    connected: "API aktive",
    unavailable: "API e palidhur",
  }[apiStatus];

  return (
    <main className="page-shell">
      <nav className="navigation" aria-label="Navigimi kryesor">
        <Link className="brand" to="/" aria-label="CampusLab Twin — Kryefaqja">
          <span className="brand-mark">
            <FlaskConical size={20} aria-hidden="true" />
          </span>
          CampusLab Twin
        </Link>
        <span
          className="status-badge"
          data-status={apiStatus}
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </nav>

      <section className="hero">
        <p className="eyebrow">Digital Twin për universitetet</p>
        <h1>Laboratorë më të zgjuar, më të sigurt dhe më efikasë.</h1>
        <p className="hero-copy">
          CampusLab Twin lidh hapësirat, pajisjet dhe të dhënat laboratorike në
          një pamje të vetme digjitale.
        </p>
        <Button asChild size="lg">
          <a href="mailto:info@campuslab.local">
            Mëso më shumë
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </Button>
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
