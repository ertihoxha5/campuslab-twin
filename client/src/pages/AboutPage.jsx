import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, Boxes, Building2, Database, Eye, LockKeyhole, Radio, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

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

export function AboutPage() {
  const [active, setActive] = useState(principles[0]);

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
        <div className="about-hero-copy"><p className="eyebrow">Rreth CampusLab Twin</p><h1>Laboratorë më të mençur. Vendime më të qarta.</h1><p>Një shtresë operative digjitale që lidh hapësirën, pajisjet dhe njerëzit—që çdo universitet ta kuptojë laboratorin e vet në kohë reale.</p><div><Button asChild size="lg"><Link to="/regjistrohu">Regjistro Universitetin <ArrowRight size={18} /></Link></Button><Link to="/funksionalitetet">Zbulo platformën <ArrowDownRight size={16} /></Link></div></div>
        <div className="about-hero-visual" aria-label="Laborator universitar i lidhur me CampusLab Twin"><img src="/images/laboratory-research.jpg" alt="Laborator modern kërkimor" /><div className="about-visual-index"><span>01</span><small>Hapësira fizike</small></div><div className="about-visual-index second"><span>02</span><small>Sistemi digjital</small></div><div className="about-visual-card"><span>Vizioni ynë</span><strong>Një Digital Twin i besueshëm për çdo laborator universitar.</strong></div><div className="about-orbit about-orbit-one" /><div className="about-orbit about-orbit-two" /></div>
      </div><div className="about-scroll-cue"><span>Shfleto historinë</span><i /></div>
    </section>

    <section className="about-word-stream" aria-hidden="true"><div><span>Universiteti</span><i>•</i><span>Laboratori</span><i>•</i><span>Zona</span><i>•</i><span>Aseti</span><i>•</i><span>Sensori</span><i>•</i><span>Vendimi</span><i>•</i><span>Universiteti</span><i>•</i><span>Laboratori</span><i>•</i></div></section>

    <section className="about-manifesto about-reveal"><div className="site-container"><span>01 — Pse ekzistojmë</span><blockquote>Laboratorët prodhojnë dije. Sistemet e tyre operative duhet të prodhojnë <em>qartësi.</em></blockquote><div><p>Pajisjet, sensorët, njerëzit dhe proceset shpesh menaxhohen në vende të ndryshme. Kjo e fsheh pamjen e plotë dhe e vonon reagimin.</p><p>CampusLab Twin i bashkon në një strukturë të vetme, pa cenuar sigurinë, pronësinë institucionale ose përgjegjësinë njerëzore.</p></div></div></section>

    <section className="about-story about-reveal"><div className="site-container about-story-grid"><div className="about-story-sticky"><p className="eyebrow">Nga fragmentimi te kontrolli</p><h2>Një realitet fizik. Një burim i vetëm informacioni.</h2><p>Platforma nuk e zëvendëson laboratorin. Ajo e bën atë të dukshëm, të matshëm dhe më të lehtë për t’u menaxhuar.</p></div><div className="about-story-cards"><article><span>Pa CampusLab Twin</span><h3>Të dhëna të shpërndara.</h3><p>Inventari, alarmet dhe mirëmbajtja jetojnë në procese të ndara, pa kontekst të përbashkët.</p><div className="story-fragments"><i /><i /><i /><i /></div></article><article><span>Me CampusLab Twin</span><h3>Një pamje operative.</h3><p>Çdo sinjal lidhet me laboratorin, zonën dhe asetin që e ka prodhuar.</p><div className="story-connected"><i /><b /><i /></div></article><article><span>Rezultati</span><h3>Veprim me siguri.</h3><p>Ekipi e di çfarë ndodhi, ku ndodhi dhe cili është hapi i ardhshëm.</p><div className="story-result"><ShieldCheck /><span>Gati për veprim</span></div></article></div></div></section>

    <section className="about-principles about-reveal"><div className="site-container"><header><p className="eyebrow">Parimet e produktit</p><h2>Çfarë nuk negociojmë.</h2></header><div className="about-principles-grid"><nav aria-label="Zgjidh një parim">{principles.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={active.id === item.id ? "active" : ""} onClick={() => setActive(item)} aria-pressed={active.id === item.id}><b>{item.number}</b><Icon size={19} /><span>{item.label}</span><ArrowRight size={16} /></button>; })}</nav><article key={active.id}><span>Parimi / {active.label}</span><h3>{active.title}</h3><p>{active.text}</p><ul>{active.points.map((point) => <li key={point}><ShieldCheck size={16} />{point}</li>)}</ul><strong className="about-principle-number">{active.number}</strong></article></div></div></section>

    <section className="about-system about-reveal"><div className="site-container about-system-grid"><div><p className="eyebrow">Si lidhet sistemi</p><h2>Nga institucioni te sinjali.</h2><p>Arkitektura ndjek mënyrën reale si organizohet universiteti. Kjo e mban çdo të dhënë në kontekst dhe çdo veprim të gjurmueshëm.</p></div><div className="about-system-map"><div className="system-node primary"><Building2 /><span><strong>Universiteti</strong><small>Identitet dhe qasje</small></span><em>01</em></div><i /><div className="system-branch"><div className="system-node"><Boxes /><span><strong>Laboratorët</strong><small>Zona dhe hapësira</small></span></div><div className="system-node"><Database /><span><strong>Asetet</strong><small>Pajisje dhe histori</small></span></div><div className="system-node"><Radio /><span><strong>Sensorët</strong><small>Sinjale realtime</small></span></div><div className="system-node"><Users /><span><strong>Ekipet</strong><small>Role dhe përgjegjësi</small></span></div></div><div className="system-live"><i /><span>Struktura operative është aktive</span><Sparkles size={15} /></div></div></div></section>

    <section className="about-journey about-reveal"><div className="site-container"><header><p className="eyebrow">Modeli operacional</p><h2>Një rrugëtim, jo vetëm një dashboard.</h2></header><ol>{journey.map(([number, title, text]) => <li key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div><ArrowRight /></li>)}</ol></div></section>

    <section className="about-belief about-reveal"><div className="site-container"><div><p className="eyebrow">Ajo që besojmë</p><h2>Teknologjia më e mirë i jep vëmendje asaj që ka rëndësi.</h2></div><aside><strong>CampusLab Twin</strong><p>Ndërtuar për universitetet, administratorët, teknikët dhe ekipet që mbajnë laboratorët në funksion.</p><div><span>Një platformë</span><span>Çdo laborator</span></div></aside></div></section>

    <section className="about-cta about-reveal"><div className="site-container"><div><p className="eyebrow">Hapi i ardhshëm</p><h2>Silleni laboratorin tuaj në një pamje të vetme.</h2></div><Button asChild size="lg"><Link to="/regjistrohu">Fillo regjistrimin <ArrowRight size={18} /></Link></Button></div></section>
  </main>;
}
