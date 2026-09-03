import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  Box,
  Building2,
  ChevronDown,
  Cpu,
  Database,
  Gauge,
  Radio,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

const modules = [
  { number: "01", icon: Building2, title: "Laboratorët", label: "Struktura", text: "Organizoni laboratorët dhe zonat sipas hapësirës reale të universitetit.", detail: "Çdo laborator mban identitetin, zonat, dimensionet dhe marrëdhëniet e veta me pajisjet dhe sensorët." },
  { number: "02", icon: Cpu, title: "Pajisjet", label: "Inventari", text: "Një regjistër operacional për çdo aset fizik.", detail: "Statusi, vendndodhja, mirëmbajtja dhe lidhjet me sensorët qëndrojnë në të njëjtin kontekst." },
  { number: "03", icon: Radio, title: "Sensorët", label: "Sinjali", text: "Telemetri live e lidhur me zonën dhe pajisjen e duhur.", detail: "Leximet e simuluara dhe realtime ushqejnë monitorimin, alarmet dhe historikun analitik." },
  { number: "04", icon: Box, title: "Digital Twin", label: "Pamja", text: "Laboratori fizik shndërrohet në një model interaktiv 3D.", detail: "Zonat, pajisjet dhe sensorët paraqiten sipas konfigurimit të laboratorit të zgjedhur." },
  { number: "05", icon: BellRing, title: "Operacionet", label: "Reagimi", text: "Alarmet dhe mirëmbajtja bëhen punë të qarta.", detail: "Ekipet shohin rëndësinë, burimin, statusin dhe historinë e çdo ngjarjeje operative." },
  { number: "06", icon: BarChart3, title: "Analitika", label: "Vendimi", text: "Energjia dhe performanca kthehen në informacion të përdorshëm.", detail: "Filtrat sipas laboratorit dhe asetit ruajnë kontekstin e raporteve dhe matjeve historike." },
];

const flow = [
  ["08:00", "Sensori", "Temperatura regjistrohet", "Leximi lidhet automatikisht me zonën dhe laboratorin."],
  ["08:00", "Monitorimi", "Gjendja përditësohet live", "Dashboard-i pasqyron vlerën e re dhe kohën e përditësimit."],
  ["08:01", "Rregulli", "Pragu kontrollohet", "Sistemi e krahason leximin me konfigurimin operacional."],
  ["08:01", "Alarmi", "Ekipi njoftohet", "Ngjarja shfaq burimin, rëndësinë dhe zonën ku kërkohet reagim."],
  ["08:04", "Mirëmbajtja", "Veprimi dokumentohet", "Ndërhyrja ruhet në historikun e pajisjes për gjurmueshmëri."],
];

const faqs = [
  ["A është Digital Twin i njëjtë për çdo laborator?", "Jo. Pamja ndërtohet nga zonat, pajisjet dhe sensorët e laboratorit të zgjedhur."],
  ["A mund të përdoren të dhëna testuese?", "Po. Universitetet dhe simulimet testuese mbështeten për konfigurim, trajnim dhe verifikim të rrjedhave."],
  ["Si ndahen të dhënat e universiteteve?", "Kërkesat kufizohen sipas universitetit, rolit dhe lejeve të përdoruesit në server."],
  ["Çfarë ndodh kur sensori nuk dërgon të dhëna?", "Gjendja offline paraqitet në monitorim dhe Digital Twin, së bashku me kohën e fundit të përditësimit."],
];

export function FeaturesPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const elements = [...document.querySelectorAll(".ecosystem-reveal")];
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

  const ActiveIcon = modules[activeModule].icon;

  return <main className="ecosystem-page">
    <section className="ecosystem-hero"><div className="site-container"><p className="eyebrow">Platforma CampusLab Twin</p><h1>Një ekosistem.<br /><em>Çdo sinjal i lidhur.</em></h1><div className="ecosystem-hero-bottom"><p>Gjashtë shtresa operative punojnë si një sistem i vetëm—nga hapësira fizike te vendimi i dokumentuar.</p><a href="#ekosistemi">Shfleto ekosistemin <span><ArrowRight size={17} /></span></a></div><div className="ecosystem-orbit" aria-hidden="true"><span className="orbit-core"><Activity /></span>{modules.map(({ icon: Icon, title }, index) => <i key={title} style={{ "--index": index }}><Icon /><small>{title}</small></i>)}</div></div></section>

    <section className="ecosystem-ticker" aria-hidden="true"><div><span>Laboratorët</span><i>•</i><span>Pajisjet</span><i>•</i><span>Sensorët</span><i>•</i><span>Digital Twin</span><i>•</i><span>Operacionet</span><i>•</i><span>Analitika</span><i>•</i><span>Laboratorët</span><i>•</i><span>Pajisjet</span><i>•</i></div></section>

    <section className="ecosystem-problem ecosystem-reveal"><div className="site-container"><header><span>Problemi</span><h2>Laboratori punon në një vend. Informacioni jeton në shumë të tjerë.</h2></header><div className="problem-trail"><article><b>PAJISJA</b><strong>Punon në laborator.</strong><small>Statusi i saj mbetet lokal.</small></article><i /><article><b>SENSORI</b><strong>Dërgon një lexim.</strong><small>Pa zonë, sinjali humb kontekstin.</small></article><i /><article><b>EKIPI</b><strong>Duhet të reagojë.</strong><small>Por informacioni mbërrin i fragmentuar.</small></article></div></div></section>

    <section className="ecosystem-modules ecosystem-reveal" id="ekosistemi"><div className="site-container"><header><p className="eyebrow">Ekosistemi operacional</p><h2>Gjashtë module.<br />Jo gjashtë produkte.</h2><p>Në qendër është laboratori juaj. Çdo modul shton kontekst në të njëjtin burim informacioni.</p></header><div className="module-selector"><nav aria-label="Modulet e platformës">{modules.map((module, index) => { const Icon = module.icon; return <button type="button" key={module.title} className={activeModule === index ? "active" : ""} onClick={() => setActiveModule(index)} aria-pressed={activeModule === index}><b>{module.number}</b><Icon /><span>{module.title}</span></button>; })}</nav><article key={modules[activeModule].title}><div><span>{modules[activeModule].label}</span><ActiveIcon /></div><h3>{modules[activeModule].title}</h3><strong>{modules[activeModule].text}</strong><p>{modules[activeModule].detail}</p><Link to="/regjistrohu">Fillo konfigurimin <ArrowRight size={17} /></Link><b className="module-watermark">{modules[activeModule].number}</b></article></div></div></section>

    <section className="ecosystem-flow ecosystem-reveal"><div className="site-container"><header><p className="eyebrow">Si lidhet</p><h2>Një mëngjes në laborator. Një lexim.</h2><p>Kjo nuk është skemë organizative. Është rruga që bën një sinjal nga sekonda kur matet deri te veprimi i ekipit.</p></header><div className="flow-layout"><aside><div><Radio /><span>LIVE</span></div><strong>24.8°C</strong><small>SENS-TEMP-01</small><i /></aside><ol>{flow.map(([time, source, title, text], index) => <li key={`${time}-${source}`}><b>{index + 1}</b><div><span>{time} · {source}</span><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></div></section>

    <section className="ecosystem-feature ecosystem-reveal"><div className="site-container feature-split"><div className="feature-image"><img src="/images/laboratori-automatizimit.png" alt="Digital Twin i laboratorit të automatizimit" /><span><i /> Digital Twin aktiv</span></div><div className="feature-copy"><p className="eyebrow">Digital Twin / Pamja</p><h2>Jo një plan statik. Një laborator që reagon.</h2><p>Zonat dhe asetet ndërtohen nga konfigurimi real i laboratorit. Telemetria ndryshon statuset, shënuesit dhe informacionin operacional në skenën 3D.</p><ul><li><Box /> Model sipas laboratorit</li><li><Radio /> Sensorë dhe pajisje të lidhura</li><li><Gauge /> Gjendje operative live</li><li><ShieldCheck /> Qasje sipas rolit</li></ul></div></div></section>

    <section className="ecosystem-feature alternate ecosystem-reveal"><div className="site-container feature-split"><div className="feature-copy"><p className="eyebrow">Operacionet / Reagimi</p><h2>Nga alarmi te ndërhyrja, pa humbur historinë.</h2><p>Alarmet, mirëmbajtja dhe raportet janë pjesë e së njëjtës rrjedhë. Ekipi sheh çfarë ndodhi dhe dokumenton atë që bëri.</p><ul><li><BellRing /> Alarme sipas rëndësisë</li><li><Wrench /> Mirëmbajtje e gjurmueshme</li><li><Zap /> Konsum energjie në kontekst</li><li><Database /> Historik dhe raporte</li></ul></div><div className="ops-visual"><div className="ops-status"><span><i /> Sistem aktiv</span><strong>Operacionet sot</strong></div><article><BellRing /><span><b>Temperaturë e lartë</b><small>Zona e Robotikës · tani</small></span><em>Kritik</em></article><article><Wrench /><span><b>Mirëmbajtja u caktua</b><small>Tekniku · 08:04</small></span><em className="ok">Në proces</em></article><article><ShieldCheck /><span><b>Ndërhyrja u dokumentua</b><small>Historiku i asetit · 08:22</small></span><em className="done">Mbyllur</em></article></div></div></section>

    <section className="ecosystem-proof ecosystem-reveal"><div className="site-container"><p className="eyebrow">Një strukturë e vetme</p><h2>Sistemi nuk shton zhurmë.<br />Ai lidh atë që tashmë ekziston.</h2><div><article><strong>1</strong><span>universitet</span><p>Identitet dhe izolim institucional.</p></article><article><strong>∞</strong><span>laboratorë</span><p>Secili me zonat dhe asetet e veta.</p></article><article><strong>LIVE</strong><span>telemetri</span><p>Lexime dhe ngjarje në kontekst.</p></article><article><strong>1</strong><span>burim vendimi</span><p>Monitorim, veprim dhe historik.</p></article></div></div></section>

    <section className="ecosystem-faq ecosystem-reveal"><div className="site-container"><header><p className="eyebrow">Pyetje të drejtpërdrejta</p><h2>Përgjigje pa zbukurime.</h2></header><div>{faqs.map(([question, answer], index) => <article key={question} className={openFaq === index ? "open" : ""}><button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{String(index + 1).padStart(2, "0")}</span><strong>{question}</strong><ChevronDown /></button><div><p>{answer}</p></div></article>)}</div></div></section>

    <section className="ecosystem-cta ecosystem-reveal"><div className="site-container"><div><p className="eyebrow">Për universitetet</p><h2>Ekosistemi mund të bëhet sistemi juaj.</h2><p>Filloni me një universitet testues dhe ndërtoni laboratorët tuaj hap pas hapi.</p></div><Button asChild size="lg"><Link to="/regjistrohu">Regjistro Universitetin <ArrowRight size={18} /></Link></Button></div></section>
  </main>;
}
