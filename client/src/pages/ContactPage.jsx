import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

const topics = [
  { id: "registration", icon: Building2, label: "Regjistrimi", subject: "Regjistrimi i universitetit" },
  { id: "platform", icon: Sparkles, label: "Platforma", subject: "Pyetje rreth CampusLab Twin" },
  { id: "support", icon: Headphones, label: "Mbështetja", subject: "Kërkesë për mbështetje" },
];

const questions = [
  ["A mund ta regjistroj një universitet testues?", "Po. Formulari i regjistrimit pranon edhe institucione testuese për konfigurim dhe verifikim të sistemit."],
  ["A aktivizohet universiteti menjëherë?", "Kërkesa ruhet në pritje dhe shqyrtohet nga administratori i platformës para aktivizimit."],
  ["Ku duhet të raportoj një problem teknik?", "Zgjidhni “Mbështetja” në formular dhe përfshini faqen, veprimin dhe mesazhin e gabimit."],
];

export function ContactPage() {
  const [topic, setTopic] = useState(topics[0]);
  const [openQuestion, setOpenQuestion] = useState(0);

  useEffect(() => {
    const elements = [...document.querySelectorAll(".contact-reveal")];
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function createEmail(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [
      `Emri: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Universiteti: ${data.get("university") || "Nuk është specifikuar"}`,
      `Tema: ${topic.label}`,
      "",
      String(data.get("message")),
    ].join("\n");
    window.location.href = `mailto:info@campuslab.local?subject=${encodeURIComponent(topic.subject)}&body=${encodeURIComponent(body)}`;
  }

  return <main className="contact-premium">
    <section className="contact-hero"><div className="site-container"><div className="contact-hero-copy"><p className="eyebrow">Kontakti</p><h1>Le ta fillojmë me një <em>përshëndetje.</em></h1><p>Për regjistrim institucional, pyetje rreth platformës ose mbështetje teknike—na tregoni çfarë ju duhet.</p><div className="contact-presence"><span><i /> Ekipi është i disponueshëm</span><small>Përgjigje zakonisht brenda një dite pune</small></div></div><div className="contact-hero-art" aria-hidden="true"><div className="contact-orb"><Mail /></div><span className="contact-message one">Përshëndetje!</span><span className="contact-message two">Si mund t’ju ndihmojmë?</span><i className="contact-spark spark-one">✦</i><i className="contact-spark spark-two">✦</i><div className="contact-route"><b>Ju</b><i /><b>CampusLab Twin</b></div></div></div></section>

    <section className="contact-strip" aria-hidden="true"><div><span>Një pyetje</span><i>•</i><span>Një bisedë</span><i>•</i><span>Një hap përpara</span><i>•</i><span>Një pyetje</span><i>•</i><span>Një bisedë</span><i>•</i><span>Një hap përpara</span><i>•</i></div></section>

    <section className="contact-studio contact-reveal"><div className="site-container"><div className="contact-studio-intro"><p className="eyebrow">Shkruani ekipit</p><h2>Çfarë dëshironi të diskutoni?</h2><p>Zgjidhni temën dhe plotësoni detajet. Butoni përfundimtar hap aplikacionin tuaj të email-it me mesazhin të përgatitur.</p><div className="contact-direct"><Mail /><span><small>Email direkt</small><a href="mailto:info@campuslab.local">info@campuslab.local</a></span></div><div className="contact-trust"><ShieldCheck /><span><strong>Të dhënat tuaja mbeten në kontrollin tuaj.</strong><small>Ky formular nuk i ruan të dhënat në platformë.</small></span></div></div><div className="contact-form-shell"><div className="contact-topic-picker" role="group" aria-label="Tema e kontaktit">{topics.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={topic.id === item.id ? "active" : ""} onClick={() => setTopic(item)} aria-pressed={topic.id === item.id}><Icon /><span>{item.label}</span><Check /></button>; })}</div><form onSubmit={createEmail}><div className="contact-field-row"><label><span>Emri dhe mbiemri</span><input name="name" required autoComplete="name" placeholder="Emri juaj" /></label><label><span>Email</span><input name="email" type="email" required autoComplete="email" placeholder="emri@universiteti.edu" /></label></div><label><span>Universiteti <small>Opsionale</small></span><input name="university" autoComplete="organization" placeholder="Emri i institucionit" /></label><label><span>Mesazhi</span><textarea name="message" required rows="6" placeholder="Na tregoni shkurt çfarë ju duhet..." /></label><div className="contact-form-foot"><small><MessageSquareText /> Tema: {topic.label}</small><Button type="submit" size="lg">Përgatit email-in <Send size={17} /></Button></div></form></div></div></section>

    <section className="contact-paths contact-reveal"><div className="site-container"><header><p className="eyebrow">Rruga më e shpejtë</p><h2>Ndoshta nuk keni nevojë të prisni.</h2></header><div><article><span>01</span><Building2 /><h3>Dëshironi të filloni?</h3><p>Regjistroni universitetin real ose testues drejtpërdrejt në platformë.</p><Link to="/regjistrohu">Fillo regjistrimin <ArrowRight /></Link></article><article><span>02</span><Headphones /><h3>Keni problem me qasjen?</h3><p>Përdorni rikuperimin e fjalëkalimit ose na dërgoni mesazhin e gabimit.</p><Link to="/harrova-fjalekalimin">Rikupero qasjen <ArrowRight /></Link></article><article><span>03</span><Sparkles /><h3>Dëshironi ta kuptoni sistemin?</h3><p>Shikoni rrugëtimin nga regjistrimi deri te monitorimi live.</p><Link to="/si-funksionon">Si funksionon <ArrowRight /></Link></article></div></div></section>

    <section className="contact-details contact-reveal"><div className="site-container"><div className="contact-detail-lead"><p className="eyebrow">CampusLab Twin</p><h2>Afër ekipit që mban laboratorin në funksion.</h2></div><div className="contact-detail-grid"><article><Clock3 /><span><small>Orari</small><strong>Hënë – Premte</strong><p>09:00 – 17:00</p></span></article><article><MapPin /><span><small>Zona kohore</small><strong>Europe/Tirane</strong><p>UTC+1 / UTC+2</p></span></article><article><Mail /><span><small>Kontakti</small><strong>info@campuslab.local</strong><p>Për të gjitha kërkesat</p></span></article></div></div></section>

    <section className="contact-faq contact-reveal"><div className="site-container"><header><p className="eyebrow">Para se të shkruani</p><h2>Tri përgjigje të shpejta.</h2></header><div>{questions.map(([question, answer], index) => <article key={question} className={openQuestion === index ? "open" : ""}><button type="button" onClick={() => setOpenQuestion(openQuestion === index ? -1 : index)} aria-expanded={openQuestion === index}><span>{String(index + 1).padStart(2, "0")}</span><strong>{question}</strong><ChevronDown /></button><div><p>{answer}</p></div></article>)}</div></div></section>

    <section className="contact-closing contact-reveal"><div className="site-container"><span><i /> Jemi këtu</span><h2>Një laborator më i qartë fillon me një bisedë të mirë.</h2><a href="mailto:info@campuslab.local">info@campuslab.local <ArrowRight /></a></div></section>
  </main>;
}
