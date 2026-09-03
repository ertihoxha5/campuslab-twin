import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  BellRing,
  Box,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  Cpu,
  Radio,
  ShieldCheck,
  UserRoundCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

const stages = [
  { number: "01", icon: Building2, label: "Regjistrimi", title: "Universiteti krijon kërkesën.", text: "Plotësohen të dhënat institucionale dhe të përfaqësuesit. Mund të regjistrohet edhe një universitet testues.", owner: "Universiteti", result: "Kërkesë në pritje" },
  { number: "02", icon: UserRoundCheck, label: "Aktivizimi", title: "Platforma verifikon qasjen.", text: "Administratori i platformës shqyrton kërkesën dhe, pas aprovimit, aktivizohet hapësira private e universitetit.", owner: "Platforma", result: "Tenant aktiv" },
  { number: "03", icon: Box, label: "Modelimi", title: "Laboratorët marrin strukturë.", text: "Administratori shton laboratorët, vizaton zonat dhe përcakton mënyrën si organizohet secila hapësirë.", owner: "Admin universiteti", result: "Hapësirë digjitale" },
  { number: "04", icon: Cpu, label: "Lidhja", title: "Asetet lidhen me zonat.", text: "Pajisjet dhe sensorët regjistrohen në laboratorin përkatës, me pozicion, status dhe marrëdhënie operative.", owner: "Ekipi teknik", result: "Inventar i lidhur" },
  { number: "05", icon: Activity, label: "Aktivizimi live", title: "Të dhënat fillojnë të lëvizin.", text: "Simulimet ose burimet realtime krijojnë lexime që shfaqen në monitorim, analitikë dhe Digital Twin.", owner: "Sistemi", result: "Telemetri live" },
  { number: "06", icon: BellRing, label: "Veprimi", title: "Sinjali bëhet vendim.", text: "Pragjet krijojnë alarme, ndërhyrjet kalojnë në mirëmbajtje dhe rezultati ruhet në historikun operacional.", owner: "Ekipi operacional", result: "Veprim i dokumentuar" },
];

const roles = [
  { icon: ShieldCheck, role: "Admini i platformës", does: "Shqyrton regjistrimet dhe administron hapësirën e platformës.", sees: "Universitetet dhe kërkesat institucionale" },
  { icon: Users, role: "Admini i universitetit", does: "Konfiguron laboratorët, përdoruesit, pajisjet dhe sensorët.", sees: "Vetëm të dhënat e universitetit të vet" },
  { icon: Wrench, role: "Tekniku", does: "Monitoron gjendjen dhe dokumenton ndërhyrjet operative.", sees: "Laboratorët e lejuar sipas rolit" },
];

export function HowItWorksPage() {
  const [activeStage, setActiveStage] = useState(0);
  const ActiveIcon = stages[activeStage].icon;

  useEffect(() => {
    const elements = [...document.querySelectorAll(".how-reveal")];
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

  return <main className="how-page">
    <section className="how-hero"><div className="site-container"><div className="how-hero-copy"><p className="eyebrow">Si funksionon</p><h1>Nga laboratori fizik te <em>vendimi live.</em></h1><p>Një rrjedhë e kontrolluar që e kthen hapësirën, pajisjet dhe sinjalet në një sistem operacional të kuptueshëm.</p><div><Button asChild size="lg"><Link to="/regjistrohu">Fillo me universitetin <ArrowRight size={18} /></Link></Button><a href="#rrugetimi">Shiko të gjithë rrugëtimin <ArrowDown size={16} /></a></div></div><div className="how-hero-system" aria-hidden="true"><span className="how-pulse"><Activity /></span><div className="how-ring ring-one"><i><Building2 /></i><i><Box /></i></div><div className="how-ring ring-two"><i><Cpu /></i><i><Radio /></i><i><BellRing /></i></div><strong>CampusLab<br />Twin</strong><small>6 hapa · 1 sistem</small></div></div></section>

    <section className="how-ticker" aria-hidden="true"><div><span>Regjistro</span><i>→</i><span>Aktivizo</span><i>→</i><span>Modelo</span><i>→</i><span>Lidh</span><i>→</i><span>Monitoro</span><i>→</i><span>Vepro</span><i>→</i><span>Regjistro</span><i>→</i><span>Aktivizo</span><i>→</i></div></section>

    <section className="how-intro how-reveal"><div className="site-container"><span>Procesi i plotë</span><h2>Nuk fillon me një dashboard.<br />Fillon me <em>kontekstin e saktë.</em></h2><div><p>Çdo universitet ka hapësirën e vet të izoluar. Brenda saj, çdo laborator ndërtohet nga zonat dhe asetet e tij reale.</p><p>Kur mbërrin një sinjal, sistemi e di kujt universiteti, laboratori, zone dhe pajisjeje i përket.</p></div></div></section>

    <section className="how-journey how-reveal" id="rrugetimi"><div className="site-container"><header><p className="eyebrow">Rrugëtimi operacional</p><h2>Gjashtë hapa.<br />Nga kërkesa te reagimi.</h2></header><div className="how-stage-layout"><nav aria-label="Hapat e funksionimit">{stages.map((stage, index) => { const Icon = stage.icon; return <button key={stage.number} type="button" onClick={() => setActiveStage(index)} className={activeStage === index ? "active" : ""} aria-pressed={activeStage === index}><b>{stage.number}</b><Icon /><span>{stage.label}</span><ChevronRight /></button>; })}</nav><article key={stages[activeStage].number}><div className="how-stage-top"><span>{stages[activeStage].number} / 06</span><ActiveIcon /></div><p>{stages[activeStage].label}</p><h3>{stages[activeStage].title}</h3><p>{stages[activeStage].text}</p><dl><div><dt>Kush vepron</dt><dd>{stages[activeStage].owner}</dd></div><div><dt>Rezultati</dt><dd><CircleCheck /> {stages[activeStage].result}</dd></div></dl><strong className="how-stage-watermark">{stages[activeStage].number}</strong></article></div></div></section>

    <section className="how-data-story how-reveal"><div className="site-container"><header><p className="eyebrow">Një sinjal, fund më fund</p><h2>Çfarë ndodh kur temperatura rritet?</h2></header><div className="how-data-grid"><article><span><Radio /></span><b>01</b><h3>Sensori mat</h3><p>Një lexim i ri dërgohet nga zona e laboratorit.</p><small>24.8°C · SENS-TEMP-01</small></article><i /><article><span><Activity /></span><b>02</b><h3>Sistemi kupton</h3><p>Leximi lidhet me zonën, pajisjen dhe pragun përkatës.</p><small>Zona e Robotikës</small></article><i /><article><span><BellRing /></span><b>03</b><h3>Ekipi njoftohet</h3><p>Alarmi paraqitet me rëndësi dhe burim të verifikueshëm.</p><small>Paralajmërim aktiv</small></article><i /><article><span><Wrench /></span><b>04</b><h3>Veprimi ruhet</h3><p>Ndërhyrja dokumentohet në historikun e asetit.</p><small>Mirëmbajtje në proces</small></article></div></div></section>

    <section className="how-visual how-reveal"><div className="site-container how-visual-grid"><div className="how-visual-copy"><p className="eyebrow">Nga të dhënat te hapësira</p><h2>Digital Twin nuk është hapi i parë. Është rezultati i lidhjes.</h2><p>Kur laboratorët, zonat, asetet dhe sensorët janë konfiguruar, skena 3D pasqyron laboratorin e zgjedhur dhe gjendjen e tij operative.</p><ul><li><Check /> Zonat përcaktojnë planimetrinë</li><li><Check /> Pajisjet vendosen në laboratorin përkatës</li><li><Check /> Sensorët shfaqin statusin live</li><li><Check /> Alarmet evidentojnë burimin fizik</li></ul><Link to="/funksionalitetet">Eksploro ekosistemin <ArrowRight size={17} /></Link></div><div className="how-visual-image"><img src="/images/laboratori-automatizimit.png" alt="Digital Twin i laboratorit të automatizimit" /><div className="how-live-card"><span><i /> LIVE</span><strong>Zona e Robotikës</strong><small>4 pajisje · 3 sensorë</small></div><div className="how-sensor-dot dot-one"><i /></div><div className="how-sensor-dot dot-two"><i /></div></div></div></section>

    <section className="how-roles how-reveal"><div className="site-container"><header><p className="eyebrow">Kontrolli i qasjes</p><h2>Secili sheh atë që i duhet.<br />Secili vepron aty ku lejohet.</h2></header><div>{roles.map(({ icon: Icon, role, does, sees }, index) => <article key={role}><span>{String(index + 1).padStart(2, "0")}</span><Icon /><h3>{role}</h3><p>{does}</p><small>{sees}</small></article>)}</div></div></section>

    <section className="how-checklist how-reveal"><div className="site-container"><div><p className="eyebrow">Para se të filloni</p><h2>Çfarë ju duhet?</h2></div><ol><li><span>01</span><strong>Të dhënat e universitetit</strong><Check /></li><li><span>02</span><strong>Të paktën një laborator</strong><Check /></li><li><span>03</span><strong>Zonat dhe pajisjet kryesore</strong><Check /></li><li><span>04</span><strong>Sensorë realë ose simulim testues</strong><Check /></li></ol></div></section>

    <section className="how-cta how-reveal"><div className="site-container"><div><p className="eyebrow">Hapi 01</p><h2>Filloni me universitetin tuaj.</h2><p>Regjistroni një institucion real ose testues dhe ndërtoni konfigurimin hap pas hapi.</p></div><div><Button asChild size="lg"><Link to="/regjistrohu">Regjistro Universitetin <ArrowRight size={18} /></Link></Button><Link to="/kontakti">Keni pyetje?</Link></div></div></section>
  </main>;
}
