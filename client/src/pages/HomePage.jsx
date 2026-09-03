import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Building2,
  Cpu,
  Layers,
  Radio,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { HeroCarousel } from "@/components/HeroCarousel.jsx";
import "@/home.css";

const capabilities = [
  {
    icon: Building2,
    number: "01",
    title: "Laboratorë të organizuar",
    text: "Menaxhoni zonat, pajisjet dhe ekipet e çdo laboratori në një hapësirë të qartë institucionale.",
  },
  {
    icon: Radio,
    number: "02",
    title: "Monitorim në kohë reale",
    text: "Ndiqni sensorët, alarmet, konsumin dhe simulimet pa humbur kontekstin operacional.",
  },
  {
    icon: Cpu,
    number: "03",
    title: "Digital Twin operacional",
    text: "Shikoni laboratorin në 3D dhe lidheni çdo aset me statusin dhe telemetrinë përkatëse.",
  },
];

const tourModes = [
  {
    id: "space",
    icon: Building2,
    label: "Hapësira",
    eyebrow: "01 / STRUKTURA",
    title: "Laboratori bëhet një sistem i lexueshëm.",
    text: "Zonat dhe asetet marrin vendin e tyre real, të ruajtura si një model i vetëm institucional.",
    tags: ["Zona", "Asete", "Përgjegjësi"],
  },
  {
    id: "signal",
    icon: Waves,
    label: "Sinjali",
    eyebrow: "02 / TELEMETRIA",
    title: "Çdo sensor tregon një histori live.",
    text: "Sinjalet udhëtojnë nga pajisja te monitorimi bashkë me kohën, zonën dhe kontekstin operacional.",
    tags: ["Sensorë", "Lexime", "Kontekst"],
  },
  {
    id: "alert",
    icon: BellRing,
    label: "Reagimi",
    eyebrow: "03 / VEPRIMI",
    title: "Problemi tregon vetë ku ndodhet.",
    text: "Kur një prag tejkalohet, zona dhe aseti përkatës evidentohen që ekipi të veprojë menjëherë.",
    tags: ["Alarme", "Prioritet", "Gjurmim"],
  },
];

const ecosystem = [
  {
    tag: "01 / HAPËSIRA",
    title: "Laboratori bëhet i lexueshëm.",
    text: "Zonat fizike kthehen në një strukturë digjitale që ruan dimensionet, pajisjet dhe përgjegjësitë.",
  },
  {
    tag: "02 / SINJALI",
    title: "Të dhënat marrin kontekst.",
    text: "Çdo lexim lidhet me sensorin, asetin dhe zonën ku ka ndodhur, pa humbur historikun.",
  },
  {
    tag: "03 / VEPRIMI",
    title: "Ekipi sheh çfarë ka rëndësi.",
    text: "Alarmet, mirëmbajtja dhe energjia shndërrohen në punë të qarta dhe të gjurmueshme.",
  },
];

export function HomePage() {
  const [introVisible, setIntroVisible] = useState(
    () => sessionStorage.getItem("campuslab-home-intro") !== "seen",
  );
  const [tour, setTour] = useState(0);
  const activeTour = tourModes[tour];
  const TourIcon = activeTour.icon;

  useEffect(() => {
    const elements = [...document.querySelectorAll(".home-reveal")];
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.14, rootMargin: "0px 0px -40px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!introVisible) return undefined;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        setIntroVisible(false);
        sessionStorage.setItem("campuslab-home-intro", "seen");
      },
      reducedMotion ? 80 : 1700,
    );
    return () => window.clearTimeout(timer);
  }, [introVisible]);

  return (
    <main className="home-v2">
      {introVisible && (
        <div
          className="home-intro-loader"
          role="status"
          aria-label="CampusLab Twin po ngarkohet"
        >
          <div className="loader-symbol">
            <span>CT</span>
            <i />
            <i />
            <i />
          </div>
          <strong>CampusLab Twin</strong>
          <p>Po lidhim laboratorin me binjakun digjital…</p>
          <div className="loader-progress">
            <i />
          </div>
          <small>HAPËSIRA · SENSORË · INTELIGJENCË</small>
        </div>
      )}

      <HeroCarousel />

      <section className="home-proof" aria-label="Pikat kryesore të platformës">
        <div className="site-container home-proof-inner">
          <p>
            <span>Një platformë</span> për gjithë ciklin operacional
          </p>
          <dl>
            <div>
              <dt>Izolim</dt>
              <dd>Të dhëna sipas universitetit</dd>
            </div>
            <div>
              <dt>Realtime</dt>
              <dd>Sensorë dhe alarme live</dd>
            </div>
            <div>
              <dt>3D</dt>
              <dd>Digital Twin sipas zonave</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="home-word-stream" aria-label="Aftësitë e platformës">
        <div>
          {Array.from({ length: 2 }).map((_, group) => (
            <span key={group} className="word-stream-group">
              <span>Digital Twin</span>
              <i>◆</i>
              <span>Sensorë live</span>
              <i>◆</i>
              <span>Mirëmbajtje</span>
              <i>◆</i>
              <span>Analitikë</span>
              <i>◆</i>
              <span>Siguri</span>
              <i>◆</i>
              <span>Energji</span>
              <i>◆</i>
            </span>
          ))}
        </div>
      </section>

      <section className="home-product-section home-reveal">
        <div className="site-container">
          <header className="home-v2-heading">
            <div>
              <p className="eyebrow">Nga hapësira fizike te vendimi</p>
              <h2>Gjithçka që ndodh në laborator, në një pamje të vetme.</h2>
            </div>
            <p>
              CampusLab Twin bashkon administrimin, telemetrinë dhe vizualizimin
              3D në një sistem të ndërtuar për universitetet moderne.
            </p>
          </header>
          <div className="home-capability-grid">
            {capabilities.map(({ icon: Icon, number, title, text }) => (
              <article
                key={number}
                style={{ "--delay": `${Number(number) * 90}ms` }}
              >
                <div>
                  <span>{number}</span>
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="capability-arrow">
                  <ArrowUpRight size={18} />
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-tour home-reveal">
        <div className="site-container">
          <header>
            <div>
              <p className="eyebrow">Prekeni sistemin</p>
              <h2>Shikoni si mendon laboratori.</h2>
            </div>
            <nav aria-label="Modaliteti i platformës">
              {tourModes.map((mode, index) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={tour === index ? "active" : ""}
                    onClick={() => setTour(index)}
                    aria-pressed={tour === index}
                  >
                    <Icon size={15} />
                    {mode.label}
                  </button>
                );
              })}
            </nav>
          </header>
          <div className={`home-tour-stage mode-${activeTour.id}`}>
            <div className="home-tour-visual" aria-hidden="true">
              <span className="tour-orbit" />
              <span className="tour-core">
                <TourIcon size={26} />
              </span>
              <i className="tour-node n1" />
              <i className="tour-node n2" />
              <i className="tour-node n3" />
              <span className="tour-beam b1" />
              <span className="tour-beam b2" />
            </div>
            <aside key={activeTour.id}>
              <span className="tour-eyebrow">{activeTour.eyebrow}</span>
              <h3>{activeTour.title}</h3>
              <p>{activeTour.text}</p>
              <ul>
                {activeTour.tags.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/si-funksionon">
                Shiko si funksionon <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="home-ecosystem home-reveal">
        <div className="site-container">
          <header>
            <p className="eyebrow">Sistemet tona punojnë së bashku</p>
            <h2>
              Një ekosistem.
              <br />
              Gjithçka e lidhur.
            </h2>
          </header>
          <div className="home-ecosystem-cards">
            {ecosystem.map(({ tag, title, text }) => (
              <article key={tag}>
                <span>{tag}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight size={18} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-showcase home-reveal">
        <div className="site-container home-showcase-grid">
          <div className="home-showcase-image">
            <img
              src="/images/laboratori-automatizimit.png"
              alt="Pamje e laboratorit të automatizimit në CampusLab Twin"
            />
            <span>
              <i /> Sistem operacional aktiv
            </span>
          </div>
          <div className="home-showcase-copy">
            <p className="eyebrow">Digital Twin dinamik</p>
            <h2>Një model që reflekton laboratorin tuaj real.</h2>
            <p>
              Zonat, asetet dhe sensorët paraqiten sipas konfigurimit të secilit
              laborator. Të dhënat e simulimit përditësojnë statuset dhe pamjen
              operative.
            </p>
            <ul>
              <li>
                <ShieldCheck size={17} /> Qasje dhe role të kontrolluara
              </li>
              <li>
                <Radio size={17} /> Telemetri dhe ngjarje realtime
              </li>
              <li>
                <Layers size={17} /> Vizualizim interaktiv sipas zonave
              </li>
            </ul>
            <Link className="home-inline-link" to="/funksionalitetet">
              Eksploro platformën <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-steps home-reveal">
        <div className="site-container home-steps-grid">
          <div>
            <p className="eyebrow">Fillim i thjeshtë</p>
            <h2>Nga regjistrimi te laboratori juaj digjital.</h2>
          </div>
          <ol>
            <li>
              <b>01</b>
              <span>
                <strong>Regjistroni universitetin</strong>
                <small>
                  Krijoni kërkesën institucionale ose një universitet testues.
                </small>
              </span>
              <ArrowRight />
            </li>
            <li>
              <b>02</b>
              <span>
                <strong>Konfiguroni laboratorët</strong>
                <small>Shtoni zonat, pajisjet, sensorët dhe përdoruesit.</small>
              </span>
              <ArrowRight />
            </li>
            <li>
              <b>03</b>
              <span>
                <strong>Monitoroni operacionet</strong>
                <small>
                  Aktivizoni simulimin dhe ndiqni sistemin në kohë reale.
                </small>
              </span>
              <ArrowRight />
            </li>
          </ol>
        </div>
      </section>

      <section className="home-final-cta home-reveal">
        <div className="site-container">
          <div>
            <p className="eyebrow">CampusLab Twin</p>
            <h2>Ndërtoni laboratorin digjital të universitetit tuaj.</h2>
          </div>
          <div>
            <Button asChild size="lg">
              <Link to="/regjistrohu">
                Regjistro Universitetin <ArrowRight size={18} />
              </Link>
            </Button>
            <Link to="/kycu">Kam një llogari</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
