import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Box,
  Building2,
  Check,
  ChevronRight,
  CircleGauge,
  FlaskConical,
  Leaf,
  Menu,
  Moon,
  Radio,
  ShieldCheck,
  Sun,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const navigation = [
  { to: "/", label: "Kryefaqja", end: true },
  { to: "/rreth-nesh", label: "Rreth nesh" },
  { to: "/funksionalitetet", label: "Funksionalitetet" },
  { to: "/si-funksionon", label: "Si funksionon" },
  { to: "/kontakti", label: "Kontakti" },
];

const features = [
  {
    icon: Box,
    title: "Digital Twin 3D",
    text: "Eksploroni laboratorin virtual dhe gjeni pajisjet, sensorët dhe alarmet në kontekstin e tyre real.",
  },
  {
    icon: Radio,
    title: "Monitorim në kohë reale",
    text: "Ndiqni temperaturën, CO₂, energjinë dhe gjendjen e pajisjeve nga një burim i vetëm.",
  },
  {
    icon: ShieldCheck,
    title: "Izolim institucional",
    text: "Çdo universitet punon në hapësirën e vet të mbrojtur me role dhe leje të përcaktuara.",
  },
  {
    icon: Wrench,
    title: "Mirëmbajtje e planifikuar",
    text: "Organizoni kontrollet, kalibrimet dhe riparimet përpara se problemet të bëhen kritike.",
  },
  {
    icon: Zap,
    title: "Energjia nën kontroll",
    text: "Kuptoni konsumin sipas laboratorit dhe pajisjes me histori dhe rekomandime të qarta.",
  },
  {
    icon: BarChart3,
    title: "Analitikë dhe raporte",
    text: "Ktheni të dhënat e simuluara në vendime, krahasime dhe raporte të gatshme për prezantim.",
  },
];

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      className="icon-button"
      type="button"
      onClick={onToggle}
      aria-label={
        isDark ? "Aktivizo pamjen e çelët" : "Aktivizo pamjen e errët"
      }
      title={isDark ? "Pamja e çelët" : "Pamja e errët"}
    >
      {isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}

function SiteHeader({ theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <FlaskConical size={20} aria-hidden="true" />
          </span>
          <span>
            CampusLab
            <strong>Twin</strong>
          </span>
        </Link>

        <nav
          className={`main-navigation ${menuOpen ? "is-open" : ""}`}
          aria-label="Navigimi kryesor"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Button asChild className="desktop-action">
            <Link to="/kontakti">
              Kërko demonstrim
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
          <button
            className="icon-button menu-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Mbyll menunë" : "Hap menunë"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">
              <FlaskConical size={20} aria-hidden="true" />
            </span>
            <span>
              CampusLab
              <strong>Twin</strong>
            </span>
          </Link>
          <p>Infrastruktura laboratorike, e kuptueshme në çdo moment.</p>
        </div>
        <div className="footer-links">
          <p className="footer-label">Platforma</p>
          <Link to="/funksionalitetet">Funksionalitetet</Link>
          <Link to="/si-funksionon">Si funksionon</Link>
          <Link to="/rreth-nesh">Rreth nesh</Link>
        </div>
        <div className="footer-links">
          <p className="footer-label">Kontakti</p>
          <a href="mailto:info@campuslab.local">info@campuslab.local</a>
          <span>Prishtinë · Tiranë</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 CampusLab Twin</span>
        <span>Të dhënat demonstruese janë të simuluara.</span>
      </div>
    </footer>
  );
}

function SiteLayout({ theme, onToggleTheme, children }) {
  return (
    <>
      <SiteHeader theme={theme} onToggleTheme={onToggleTheme} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}

function ApiStatus() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/api/health", { signal: controller.signal })
      .then(() => setStatus("connected"))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setStatus("unavailable");
        }
      });

    return () => controller.abort();
  }, []);

  const labels = {
    loading: "Po lidhet me platformën",
    connected: "Platforma është aktive",
    unavailable: "Platforma është jashtë linje",
  };

  return (
    <span className="api-status" data-status={status} aria-live="polite">
      <span aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

function TwinPreview() {
  return (
    <div
      className="twin-preview"
      aria-label="Pamje demonstruese e Digital Twin"
    >
      <div className="preview-toolbar">
        <span>LAB-RRK-01</span>
        <span className="live-label">
          <span />
          Simulim aktiv
        </span>
      </div>
      <div className="lab-map">
        <div className="map-room">
          <span className="desk desk-one" />
          <span className="desk desk-two" />
          <span className="desk desk-three" />
          <span className="server-rack" />
          <span className="sensor sensor-one">23.8°</span>
          <span className="sensor sensor-two">612</span>
          <span className="map-label">Laboratori i rrjeteve</span>
        </div>
      </div>
      <div className="preview-metrics">
        <div>
          <Activity size={18} aria-hidden="true" />
          <span>Gjendja</span>
          <strong>91%</strong>
        </div>
        <div>
          <Zap size={18} aria-hidden="true" />
          <span>Energjia</span>
          <strong>4.2 kW</strong>
        </div>
        <div>
          <CircleGauge size={18} aria-hidden="true" />
          <span>Sensorë</span>
          <strong>12/12</strong>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-content">
            <ApiStatus />
            <p className="eyebrow">Digital Twin për universitetet</p>
            <h1>
              Laboratori juaj.
              <br />
              <span>Plotësisht i kuptueshëm.</span>
            </h1>
            <p className="hero-copy">
              Një platformë e vetme për të parë, simuluar dhe përmirësuar çdo
              laborator — nga sensori te vendimi.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link to="/kontakti">
                  Kërko demonstrim
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/si-funksionon">Shih si funksionon</Link>
              </Button>
            </div>
            <div className="trust-row">
              <span>
                <Check size={16} aria-hidden="true" /> Pa pajisje IoT të
                detyrueshme
              </span>
              <span>
                <Check size={16} aria-hidden="true" /> Të dhëna të izoluara
              </span>
            </div>
          </div>
          <TwinPreview />
        </div>
      </section>

      <section className="section section-bordered">
        <div className="container statement-grid">
          <p className="section-index">01 — Platforma</p>
          <div>
            <h2>Jo vetëm të dhëna. Një pasqyrë e laboratorit tuaj.</h2>
            <p className="section-lead">
              CampusLab Twin bashkon hapësirën fizike, pajisjet dhe sinjalet
              digjitale në një sistem që stafi mund ta kuptojë dhe ta përdorë.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Çfarë fitoni</p>
              <h2>Kontroll nga një pamje e vetme.</h2>
            </div>
            <Link className="arrow-link" to="/funksionalitetet">
              Të gjitha funksionalitetet
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="feature-grid">
            {features.slice(0, 3).map((feature, index) => (
              <article className="feature-card" key={feature.title}>
                <span className="card-number">0{index + 1}</span>
                <feature.icon size={25} aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <Link
                  to="/funksionalitetet"
                  aria-label={`Më shumë: ${feature.title}`}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark-panel-section">
        <div className="container impact-panel">
          <div>
            <p className="eyebrow">Vendime më të mira</p>
            <h2>Nga reagimi te parandalimi.</h2>
          </div>
          <div className="impact-list">
            <div>
              <span>01</span>
              <p>Kapni kushtet jonormale para se të bëhen incidente.</p>
            </div>
            <div>
              <span>02</span>
              <p>Planifikoni mirëmbajtjen sipas gjendjes reale të pajisjeve.</p>
            </div>
            <div>
              <span>03</span>
              <p>
                Provoni skenarë të sigurt me të dhëna qartësisht të simuluara.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stats-grid">
          <div>
            <strong>3</strong>
            <span>laboratorë demonstrues</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>monitorim i simuluar</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>izolim ndërmjet universiteteve</span>
          </div>
          <p>Të gjitha shifrat janë pjesë e demonstrimit të prototipit.</p>
        </div>
      </section>

      <CallToAction />
    </>
  );
}

function PageHero({ eyebrow, title, text }) {
  return (
    <section className="page-hero section-bordered">
      <div className="container page-hero-grid">
        <p className="eyebrow">{eyebrow}</p>
        <div>
          <h1>{title}</h1>
          <p>{text}</p>
        </div>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Rreth CampusLab Twin"
        title="Teknologji me një qëllim praktik."
        text="CampusLab Twin është ndërtuar për t’ua bërë infrastrukturën laboratorike më të dukshme, më të sigurt dhe më të lehtë për t’u menaxhuar universiteteve."
      />
      <section className="section">
        <div className="container editorial-grid">
          <p className="section-index">Misioni</p>
          <div>
            <h2>Të zvogëlojmë distancën mes laboratorit fizik dhe vendimit.</h2>
            <p>
              Laboratorët prodhojnë shumë sinjale: temperatura, energji,
              mirëmbajtje, përdorim dhe alarme. Shpesh këto informacione jetojnë
              të ndara. Platforma i lidh në një model të vetëm digjital dhe i
              paraqet në gjuhë të qartë.
            </p>
          </div>
        </div>
        <div className="container values-grid">
          {[
            ["Qartësi", "Çdo metrikë duhet të çojë te një kuptim ose veprim."],
            [
              "Siguri",
              "Izolimi i të dhënave është pjesë e arkitekturës, jo vetëm e ndërfaqes.",
            ],
            [
              "Realizëm",
              "Simulimet shënohen qartë dhe bazohen në marrëdhënie të kuptueshme.",
            ],
            [
              "Përfshirje",
              "Përvoja ndërtohet në shqip dhe për role të ndryshme universitare.",
            ],
          ].map(([title, text], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Funksionalitetet"
        title="Gjithçka që duhet për një laborator të lidhur."
        text="Nga monitorimi i çastit te mirëmbajtja dhe raportimi — çdo modul punon me të njëjtën pamje të sigurt të universitetit."
      />
      <section className="section">
        <div className="container feature-grid full-feature-grid">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span className="card-number">0{index + 1}</span>
              <feature.icon size={25} aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section section-bordered">
        <div className="container split-feature">
          <div>
            <p className="eyebrow">Një burim i vetëm</p>
            <h2>Modulet nuk jetojnë të ndara.</h2>
          </div>
          <ul className="check-list">
            <li>
              <Check size={18} /> Alarmet lidhen me sensorin dhe pajisjen.
            </li>
            <li>
              <Check size={18} /> Mirëmbajtja përditëson gjendjen e pajisjes.
            </li>
            <li>
              <Check size={18} /> Energjia analizohet sipas laboratorit.
            </li>
            <li>
              <Check size={18} /> Raportet ruajnë burimin dhe periudhën.
            </li>
          </ul>
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function HowItWorksPage() {
  const steps = [
    {
      title: "Regjistroni universitetin",
      text: "Institucioni dorëzon të dhënat zyrtare dhe pret verifikimin e administratorit të platformës.",
      icon: Building2,
    },
    {
      title: "Modeloni laboratorët",
      text: "Shtoni hapësirat, zonat, pajisjet dhe pozicionet e sensorëve në modelin digjital.",
      icon: Box,
    },
    {
      title: "Aktivizoni simulimin",
      text: "Gjeneroni të dhëna realiste dhe të riprodhueshme pa kërkuar pajisje fizike IoT.",
      icon: Radio,
    },
    {
      title: "Veproni mbi sinjalet",
      text: "Përdorni alarmet, mirëmbajtjen dhe analitikën për vendime të dokumentuara.",
      icon: Leaf,
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Si funksionon"
        title="Nga hapësira fizike te një sistem i menaxhueshëm."
        text="Një rrjedhë e qartë që e çon universitetin nga regjistrimi te monitorimi, simulimi dhe përmirësimi."
      />
      <section className="section">
        <div className="container process-list">
          {steps.map((step, index) => (
            <article key={step.title}>
              <span className="process-number">0{index + 1}</span>
              <step.icon size={28} aria-hidden="true" />
              <div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Kontakti"
        title="Le ta shohim laboratorin tuaj si një sistem."
        text="Na tregoni për universitetin dhe laboratorët tuaj. Do t’ju përgjigjemi me një demonstrim të përshtatur për rastin tuaj."
      />
      <section className="section">
        <div className="container contact-grid">
          <div>
            <p className="section-index">Na shkruani</p>
            <a className="contact-email" href="mailto:info@campuslab.local">
              info@campuslab.local
              <ArrowRight size={24} aria-hidden="true" />
            </a>
            <p>
              Për demonstrime akademike, bashkëpunime dhe pyetje rreth
              platformës.
            </p>
          </div>
          <div className="contact-details">
            <div>
              <span>Vendndodhja</span>
              <strong>Prishtinë · Tiranë</strong>
            </div>
            <div>
              <span>Koha e përgjigjes</span>
              <strong>Brenda 2 ditëve të punës</strong>
            </div>
            <div>
              <span>Formati</span>
              <strong>Demonstrim online ose në kampus</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CallToAction() {
  return (
    <section className="section cta-section">
      <div className="container cta-inner">
        <div>
          <p className="eyebrow">Gati për hapin tjetër?</p>
          <h2>Shihni laboratorin tuaj në një mënyrë të re.</h2>
        </div>
        <Button asChild size="lg">
          <Link to="/kontakti">
            Kërko demonstrim
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="centered-page">
      <p className="eyebrow">Gabim 404</p>
      <h1>Faqja nuk u gjet.</h1>
      <p>Adresa mund të jetë ndryshuar ose faqja nuk ekziston.</p>
      <Button asChild>
        <Link to="/">Kthehu në kryefaqe</Link>
      </Button>
    </section>
  );
}

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem("campuslab-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("campuslab-theme", theme);
  }, [theme]);

  return (
    <SiteLayout
      theme={theme}
      onToggleTheme={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rreth-nesh" element={<AboutPage />} />
        <Route path="/funksionalitetet" element={<FeaturesPage />} />
        <Route path="/si-funksionon" element={<HowItWorksPage />} />
        <Route path="/kontakti" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteLayout>
  );
}
