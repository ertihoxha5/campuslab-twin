import { KeyRound, ScanSearch, Shield, UserRoundCheck } from "lucide-react";
import { PageIntro } from "@/components/PageIntro.jsx";

const capabilities = [
  {
    icon: ScanSearch,
    title: "Verifikim institucional",
    text: "Kontroll i domain-it zyrtar, formatit të të dhënave dhe regjistrimeve të përsëritura.",
  },
  {
    icon: UserRoundCheck,
    title: "Regjistrim me shqyrtim",
    text: "Çdo kërkesë krijohet në pritje dhe nuk fiton qasje automatike në hapësirën private.",
  },
  {
    icon: KeyRound,
    title: "Autentikim modern",
    text: "Sesione HTTP-only, refresh token i rrotulluar dhe rikuperim i sigurt i fjalëkalimit.",
  },
  {
    icon: Shield,
    title: "Arkitekturë multi-university",
    text: "Të dhënat tenant dhe administrimi i platformës ruhen në struktura të ndara.",
  },
];

export function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Platforma sot"
        title="Funksione të implementuara, pa premtime boshe."
        description="Këto janë aftësitë që mbështeten aktualisht nga API-ja e CampusLab Twin."
      />
      <section className="content-section compact-top">
        <div className="site-container capability-grid">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={22} />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
