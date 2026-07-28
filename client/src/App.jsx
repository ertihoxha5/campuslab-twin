import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Box,
  Building2,
  Check,
  ChevronRight,
  FlaskConical,
  Gauge,
  Leaf,
  Menu,
  Moon,
  Radio,
  ShieldCheck,
  Sun,
  Thermometer,
  Users,
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

function ProductStage() {
  return (
    <div
      className="product-stage"
      aria-label="Pamje e platformës CampusLab Twin"
    >
      <div className="stage-window">
        <div className="stage-topbar">
          <div className="stage-wordmark">
            <FlaskConical size={15} aria-hidden="true" />
            CampusLab Twin
          </div>
          <ApiStatus />
          <div className="stage-user" aria-hidden="true">
            AB
          </div>
        </div>

        <div className="stage-workspace">
          <aside className="stage-sidebar" aria-hidden="true">
            <span className="is-active" />
            <span />
            <span />
            <span />
            <span />
          </aside>

          <div className="stage-main">
            <div className="stage-heading">
              <div>
                <span>Digital Twin 3D</span>
                <strong>Laboratori i rrjeteve</strong>
              </div>
              <span className="simulation-chip">Simulim aktiv</span>
            </div>

            <div className="stage-content">
              <div className="stage-lab">
                <span className="stage-wall wall-top" />
                <span className="stage-wall wall-side" />
                <span className="stage-table table-one" />
                <span className="stage-table table-two" />
                <span className="stage-table table-three" />
                <span className="stage-rack" />
                <span className="stage-marker marker-one">23.8°</span>
                <span className="stage-marker marker-two">612 ppm</span>
                <span className="stage-lab-label">LAB-RRK-01</span>
              </div>

              <aside className="stage-insights">
                <p>Gjendja e laboratorit</p>
                <div>
                  <Gauge size={17} aria-hidden="true" />
                  <span>Shëndeti</span>
                  <strong>91%</strong>
                </div>
                <div>
                  <Thermometer size={17} aria-hidden="true" />
                  <span>Temperatura</span>
                  <strong>23.8°C</strong>
                </div>
                <div>
                  <Users size={17} aria-hidden="true" />
                  <span>Persona</span>
                  <strong>18</strong>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <div className="apple-home">
      <section className="apple-hero">
        <div className="container apple-hero-inner">
          <p className="apple-kicker">
            Digital Twin për laboratorët universitarë
          </p>
          <h1>
            Laboratori juaj,
            <br />
            <span>i qartë në çdo moment.</span>
          </h1>
          <p className="apple-hero-copy">
            Monitoroni pajisjet, energjinë dhe kushtet laboratorike në një
            platformë të vetme, të sigurt dhe të thjeshtë për t’u përdorur.
          </p>
          <div className="apple-actions">
            <Button asChild size="lg">
              <Link to="/kontakti">
                Kërko demonstrim
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Button>
            <Link className="apple-text-link" to="/funksionalitetet">
              Shiko funksionalitetet
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="container">
          <ProductStage />
        </div>
      </section>

      <section className="apple-intro">
        <div className="container apple-intro-grid">
          <p className="apple-section-label">Një pamje e vetme</p>
          <div>
            <h2>Çdo sinjal. Çdo pajisje. Një kuptim i përbashkët.</h2>
            <p>
              CampusLab Twin e kthen kompleksitetin e laboratorit në informacion
              të qartë për administratorët, menaxherët dhe teknikët.
            </p>
          </div>
        </div>
      </section>

      <section className="apple-values">
        <div className="container apple-values-grid">
          <article>
            <Radio size={24} aria-hidden="true" />
            <h3>Monitorim i vazhdueshëm</h3>
            <p>
              Vlera të simuluara në kohë reale, me pragje dhe gjendje të
              kuptueshme.
            </p>
          </article>
          <article>
            <ShieldCheck size={24} aria-hidden="true" />
            <h3>Privatësi institucionale</h3>
            <p>
              Të dhënat dhe përdoruesit e çdo universiteti qëndrojnë plotësisht
              të izoluar.
            </p>
          </article>
          <article>
            <Wrench size={24} aria-hidden="true" />
            <h3>Veprim në kohën e duhur</h3>
            <p>
              Alarmet dhe mirëmbajtja lidhen drejtpërdrejt me pajisjen
              përkatëse.
            </p>
          </article>
        </div>
      </section>

      <section className="apple-focus">
        <div className="container apple-focus-inner">
          <div>
            <p className="apple-section-label">Projektuar për qartësi</p>
            <h2>Më pak zhurmë. Më shumë kontroll.</h2>
            <p>
              Nga një laborator i vetëm te një universitet i tërë, çdo rol sheh
              vetëm informacionin që i duhet për të marrë vendimin e radhës.
            </p>
            <Link className="apple-text-link" to="/si-funksionon">
              Si funksionon
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="focus-metrics" aria-label="Të dhëna demonstruese">
            <div>
              <strong>24/7</strong>
              <span>monitorim i simuluar</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>izolim i universitetit</span>
            </div>
          </div>
        </div>
      </section>

      <CallToAction />
    </div>
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
