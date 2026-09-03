import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Boxes,
  Building2,
  Database,
  Eye,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import "@/about.css";

const principles = [
  { id: "clarity", icon: Eye, label: "Qartësi", number: "01", title: "Teknologjia duhet ta bëjë laboratorin më të kuptueshëm.", text: "Informacioni operacional organizohet sipas universitetit, laboratorit dhe zonës. Çdo ekip sheh kontekstin që i duhet, pa zhurmë dhe pa humbur gjurmueshmërinë.", points: ["Status i qartë i aseteve", "Alarmet në kontekst", "Pamje e përbashkët operative"] },
  { id: "security", icon: LockKeyhole, label: "Siguri", number: "02", title: "Izolimi institucional nuk është një shtesë.", text: "Identiteti i universitetit verifikohet në server dhe çdo kërkesë kufizohet sipas rolit, lejeve dhe laboratorëve të caktuar.", points: ["Sesione HTTP-only", "Kontroll i lejeve në server", "Izolim i të dhënave tenant"] },
  { id: "reality", icon: Radio, label: "Realitet", number: "03", title: "Digital Twin duhet të pasqyrojë sistemin real.", text: "Zonat, pajisjet dhe sensorët vijnë nga konfigurimi i laboratorit. Telemetria dhe simulimet përditësojnë pamjen, në vend të demonstrimeve statike.", points: ["Të dhëna realtime", "Skenë 3D sipas zonave", "Asete të lidhura me sensorë"] },
];

const journey = [
  ["01", "Identiteti institucional", "Universiteti regjistrohet, shqyrtohet dhe aktivizohet në një hapësirë të izoluar."],
  ["02", "Modeli operacional", "Ekipi ndërton laboratorët, zonat, asetet, sensorët dhe përgjegjësitë."],
  ["03", "Sistemi live", "Simulimet dhe telemetria sjellin statusin aktual në dashboard dhe Digital Twin."],
  ["04", "Vendime të dokumentuara", "Alarmet, mirëmbajtja, energjia dhe raportet krijojnë historikun operacional."],
];

const history = [
  {
    year: "1970",
    metric: "13",
    metricLabel: "Misioni që lindi idenë",
    title: "Apollo 13 — një binjak i thjeshtë në Tokë.",
    text: "NASA përdori simulatorë tokësorë që pasqyronin anijen kozmike, për të provuar zgjidhje ndërsa ekuipazhi ishte në rrezik. Ishte hera e parë që një kopje e drejtuar nga të dhënat shpëtoi një sistem real.",
    tag: "Simulimi i drejtuar nga të dhënat",
  },
  {
    year: "1991",
    metric: "1:1",
    metricLabel: "Bota reale, e pasqyruar",
    title: "‘Mirror Worlds’ — realiteti brenda softuerit.",
    text: "David Gelernter përshkroi një model softuerik që pasqyron një sistem fizik në kohë reale. Koncepti i një pasqyre të gjallë digjitale mori formë intelektuale.",
    tag: "Koncepti akademik",
  },
  {
    year: "2002",
    metric: "3",
    metricLabel: "Fizik · Digjital · Lidhja",
    title: "Michael Grieves e emërton modelin.",
    text: "Në menaxhimin e ciklit jetësor të produktit u prezantua struktura me tri pjesë: objekti fizik, dyfishi digjital dhe rrjedha e të dhënave që i lidh. Kjo mbetet baza edhe sot.",
    tag: "Modeli konceptual",
  },
  {
    year: "2010",
    metric: "2010",
    metricLabel: "Termi merr emrin zyrtar",
    title: "NASA e quan zyrtarisht ‘Digital Twin’.",
    text: "Një raport teknologjik i NASA-s e përcaktoi termin dhe përdorimin për simulim të integruar shumëfizik të mjeteve, duke e nxjerrë konceptin nga laboratorët në praktikë.",
    tag: "Standardizimi",
  },
  {
    year: "2017",
    metric: "Top 10",
    metricLabel: "Tendencë kryesore teknologjike",
    title: "Sensorët e lirë e hapin për të gjithë.",
    text: "IoT-ja uli koston e matjes dhe Gartner e renditi binjakun digjital ndër tendencat kryesore. Nga aeronautika, ai kaloi te fabrikat, ndërtesat dhe infrastruktura.",
    tag: "Përhapja industriale",
  },
  {
    year: "2021",
    metric: "∞",
    metricLabel: "Realtime bëhet standard",
    title: "Cloud, 3D dhe rrjedha live bashkohen.",
    text: "Vizualizimi 3D në shfletues, transmetimi realtime dhe ruajtja në cloud e bënë binjakun digjital të arritshëm për organizata të çdo madhësie — jo vetëm për ato të mëdhatë.",
    tag: "Qasje e demokratizuar",
  },
  {
    year: "2026",
    metric: "01",
    metricLabel: "Binjaku digjital i laboratorit",
    title: "CampusLab Twin — historia vjen te universiteti.",
    text: "Zonat, asetet, sensorët dhe vendimet e një laboratori universitar bashkohen në një model të vetmin, të izoluar sipas institucionit dhe të gjurmueshëm nga çdo alarm te çdo raport.",
    tag: "Sot",
  },
];

export function AboutPage() {
  const [active, setActive] = useState(principles[0]);
  const [era, setEra] = useState(history.length - 1);
  const activeEra = history[era];

  useEffect(() => {
    const elements = [...document.querySelectorAll(".about-reveal")];
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -45px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <main className="about-premium">
    <section className="about-hero">
      <div className="site-container about-hero-grid">
        <div className="about-hero-copy"><p className="eyebrow">Rreth CampusLab Twin · Historia</p><h1>Historia e binjakut digjital, deri te laboratori juaj.</h1><p>Nga një kopje e drejtuar nga të dhënat në vitin 1970, te një model i gjallë i laboratorit universitar sot. Kjo është rruga që na solli këtu.</p><div><Button asChild size="lg"><Link to="/regjistrohu">Regjistro Universitetin <ArrowRight size={18} /></Link></Button><Link to="/funksionalitetet">Zbulo platformën <ArrowDownRight size={16} /></Link></div></div>
        <div className="about-hero-visual" aria-label="Laborator universitar i lidhur me CampusLab Twin"><img src="/images/laboratory-research.jpg" alt="Laborator modern kërkimor" /><div className="about-visual-index"><span>1970</span><small>Ideja e parë</small></div><div className="about-visual-index second"><span>2026</span><small>Laboratori juaj</small></div><div className="about-visual-card"><span>Vizioni ynë</span><strong>Një Digital Twin i besueshëm për çdo laborator universitar.</strong></div><div className="about-orbit about-orbit-one" /><div className="about-orbit about-orbit-two" /></div>
      </div><div className="about-scroll-cue"><span>Shfleto historinë</span><i /></div>
    </section>

    <section className="about-word-stream" aria-hidden="true"><div><span>1970</span><i>•</i><span>Mirror Worlds</span><i>•</i><span>PLM</span><i>•</i><span>NASA</span><i>•</i><span>IoT</span><i>•</i><span>Realtime</span><i>•</i><span>CampusLab Twin</span><i>•</i><span>1970</span><i>•</i><span>Mirror Worlds</span><i>•</i></div></section>

    <section className="about-manifesto about-reveal"><div className="site-container"><span>01 — Pse ekzistojmë</span><blockquote>Laboratorët prodhojnë dije. Sistemet e tyre operative duhet të prodhojnë <em>qartësi.</em></blockquote><div><p>Pajisjet, sensorët, njerëzit dhe proceset shpesh menaxhohen në vende të ndryshme. Kjo e fsheh pamjen e plotë dhe e vonon reagimin.</p><p>CampusLab Twin i bashkon në një strukturë të vetme, pa cenuar sigurinë, pronësinë institucionale ose përgjegjësinë njerëzore.</p></div></div></section>

    <section className="about-history about-reveal">
      <div className="site-container">
        <header>
          <div><p className="eyebrow">02 — Historia</p><h2>Gjysmë shekulli që të çon te një ide e vetme.</h2></div>
          <p>Binjaku digjital nuk lindi si produkt. Lindi si nevojë — për të kuptuar një sistem real pa qenë brenda tij. Klikoni një vit për ta parë.</p>
        </header>

        <div className="about-history-track" role="tablist" aria-label="Vitet e historisë">
          {history.map((item, index) => (
            <button
              key={item.year}
              type="button"
              role="tab"
              aria-selected={era === index}
              className={era === index ? "active" : ""}
              onClick={() => setEra(index)}
            >
              <span>{item.year}</span>
              <i />
            </button>
          ))}
          <div className="about-history-progress" aria-hidden="true">
            <i style={{ "--p": `${(era / (history.length - 1)) * 100}%` }} />
          </div>
        </div>

        <div className="about-history-stage" key={activeEra.year}>
          <div className="about-history-metric" aria-hidden="true">
            <strong>{activeEra.metric}</strong>
            <small>{activeEra.metricLabel}</small>
            <span className="about-history-motif"><i /><i /><i /><b /></span>
          </div>
          <div className="about-history-detail">
            <span className="about-history-year">{activeEra.year} · {activeEra.tag}</span>
            <h3>{activeEra.title}</h3>
            <p>{activeEra.text}</p>
            <div className="about-history-nav">
              <button type="button" onClick={() => setEra((value) => Math.max(0, value - 1))} disabled={era === 0} aria-label="Viti i mëparshëm"><ArrowRight size={16} /> Më herët</button>
              <button type="button" onClick={() => setEra((value) => Math.min(history.length - 1, value + 1))} disabled={era === history.length - 1} aria-label="Viti tjetër">Më vonë <ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="about-principles about-reveal"><div className="site-container"><header><p className="eyebrow">Parimet e produktit</p><h2>Çfarë nuk negociojmë.</h2></header><div className="about-principles-grid"><nav aria-label="Zgjidh një parim">{principles.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={active.id === item.id ? "active" : ""} onClick={() => setActive(item)} aria-pressed={active.id === item.id}><b>{item.number}</b><Icon size={19} /><span>{item.label}</span><ArrowRight size={16} /></button>; })}</nav><article key={active.id}><span>Parimi / {active.label}</span><h3>{active.title}</h3><p>{active.text}</p><ul>{active.points.map((point) => <li key={point}><ShieldCheck size={16} />{point}</li>)}</ul><strong className="about-principle-number">{active.number}</strong></article></div></div></section>

    <section className="about-system about-reveal"><div className="site-container about-system-grid"><div><p className="eyebrow">Si lidhet sistemi</p><h2>Nga institucioni te sinjali.</h2><p>Arkitektura ndjek mënyrën reale si organizohet universiteti. Kjo e mban çdo të dhënë në kontekst dhe çdo veprim të gjurmueshëm.</p></div><div className="about-system-map"><div className="system-node primary"><Building2 /><span><strong>Universiteti</strong><small>Identitet dhe qasje</small></span><em>01</em></div><i /><div className="system-branch"><div className="system-node"><Boxes /><span><strong>Laboratorët</strong><small>Zona dhe hapësira</small></span></div><div className="system-node"><Database /><span><strong>Asetet</strong><small>Pajisje dhe histori</small></span></div><div className="system-node"><Radio /><span><strong>Sensorët</strong><small>Sinjale realtime</small></span></div><div className="system-node"><Users /><span><strong>Ekipet</strong><small>Role dhe përgjegjësi</small></span></div></div><div className="system-live"><i /><span>Struktura operative është aktive</span><Sparkles size={15} /></div></div></div></section>

    <section className="about-journey about-reveal"><div className="site-container"><header><p className="eyebrow">Modeli operacional</p><h2>Një rrugëtim, jo vetëm një dashboard.</h2></header><ol>{journey.map(([number, title, text]) => <li key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div><ArrowRight /></li>)}</ol></div></section>

    <section className="about-belief about-reveal"><div className="site-container"><div><p className="eyebrow">Ajo që besojmë</p><h2>Teknologjia më e mirë i jep vëmendje asaj që ka rëndësi.</h2></div><aside><strong>CampusLab Twin</strong><p>Ndërtuar për universitetet, administratorët, teknikët dhe ekipet që mbajnë laboratorët në funksion.</p><div><span>Një platformë</span><span>Çdo laborator</span></div></aside></div></section>

    <section className="about-cta about-reveal"><div className="site-container"><div><p className="eyebrow">Hapi i ardhshëm</p><h2>Silleni laboratorin tuaj në një pamje të vetme.</h2></div><Button asChild size="lg"><Link to="/regjistrohu">Fillo regjistrimin <ArrowRight size={18} /></Link></Button></div></section>
  </main>;
}
