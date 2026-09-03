import { ArrowRight, Building2, Cpu, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { HeroCarousel } from "@/components/HeroCarousel.jsx";

const capabilities = [
  { icon: Building2, number: "01", title: "Laboratorë të organizuar", text: "Menaxhoni zonat, pajisjet dhe ekipet e çdo laboratori në një hapësirë të qartë institucionale." },
  { icon: Radio, number: "02", title: "Monitorim në kohë reale", text: "Ndiqni sensorët, alarmet, konsumin dhe simulimet pa humbur kontekstin operacional." },
  { icon: Cpu, number: "03", title: "Digital Twin operacional", text: "Shikoni laboratorin në 3D dhe lidheni çdo aset me statusin dhe telemetrinë përkatëse." },
];

export function HomePage() {
  return <main className="home-v2">
    <HeroCarousel />
    <section className="home-proof" aria-label="Pikat kryesore të platformës"><div className="site-container home-proof-inner"><p><span>Një platformë</span> për gjithë ciklin operacional</p><dl><div><dt>Izolim</dt><dd>Të dhëna sipas universitetit</dd></div><div><dt>Realtime</dt><dd>Sensorë dhe alarme live</dd></div><div><dt>3D</dt><dd>Digital Twin sipas zonave</dd></div></dl></div></section>
    <section className="home-product-section"><div className="site-container"><header className="home-v2-heading"><div><p className="eyebrow">Nga hapësira fizike te vendimi</p><h2>Gjithçka që ndodh në laborator, në një pamje të vetme.</h2></div><p>CampusLab Twin bashkon administrimin, telemetrinë dhe vizualizimin 3D në një sistem të ndërtuar për universitetet moderne.</p></header><div className="home-capability-grid">{capabilities.map(({icon:Icon,number,title,text})=><article key={number}><div><span>{number}</span><Icon size={22}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="home-showcase"><div className="site-container home-showcase-grid"><div className="home-showcase-image"><img src="/images/laboratori-automatizimit.png" alt="Pamje e laboratorit të automatizimit në CampusLab Twin"/><span><i/> Sistem operacional aktiv</span></div><div className="home-showcase-copy"><p className="eyebrow">Digital Twin dinamik</p><h2>Një model që reflekton laboratorin tuaj real.</h2><p>Zonat, asetet dhe sensorët paraqiten sipas konfigurimit të secilit laborator. Të dhënat e simulimit përditësojnë statuset dhe pamjen operative.</p><ul><li><ShieldCheck size={17}/> Qasje dhe role të kontrolluara</li><li><Radio size={17}/> Telemetri dhe ngjarje realtime</li><li><Sparkles size={17}/> Vizualizim interaktiv sipas zonave</li></ul><Link className="home-inline-link" to="/funksionalitetet">Eksploro platformën <ArrowRight size={17}/></Link></div></div></section>
    <section className="home-steps"><div className="site-container home-steps-grid"><div><p className="eyebrow">Fillim i thjeshtë</p><h2>Nga regjistrimi te laboratori juaj digjital.</h2></div><ol><li><b>01</b><span><strong>Regjistroni universitetin</strong><small>Krijoni kërkesën institucionale ose një universitet testues.</small></span></li><li><b>02</b><span><strong>Konfiguroni laboratorët</strong><small>Shtoni zonat, pajisjet, sensorët dhe përdoruesit.</small></span></li><li><b>03</b><span><strong>Monitoroni operacionet</strong><small>Aktivizoni simulimin dhe ndiqni sistemin në kohë reale.</small></span></li></ol></div></section>
    <section className="home-final-cta"><div className="site-container"><div><p className="eyebrow">CampusLab Twin</p><h2>Ndërtoni laboratorin digjital të universitetit tuaj.</h2></div><div><Button asChild size="lg"><Link to="/regjistrohu">Regjistro Universitetin <ArrowRight size={18}/></Link></Button><Link to="/kycu">Kam një llogari</Link></div></div></section>
  </main>;
}
