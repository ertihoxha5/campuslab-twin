import { PageIntro } from "@/components/PageIntro.jsx";

const steps = [
  [
    "01",
    "Plotësoni kërkesën",
    "Jepni të dhënat zyrtare të institucionit dhe përfaqësuesit.",
  ],
  [
    "02",
    "Kërkesa verifikohet",
    "Regjistrimi ruhet në pritje për shqyrtim nga administratori i platformës.",
  ],
  [
    "03",
    "Kyçuni në mënyrë të sigurt",
    "Pas aktivizimit, përdoruesit e universitetit mund të krijojnë sesionin e tyre privat.",
  ],
];

export function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="Si funksionon"
        title="Një hyrje e kontrolluar, nga kërkesa te qasja."
        description="Procesi është i thjeshtë për universitetin dhe i verifikueshëm për platformën."
      />
      <section className="content-section compact-top">
        <div className="site-container process">
          {steps.map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
