import { PageIntro } from "@/components/PageIntro.jsx";

export function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="Rreth nesh"
        title="Një themel digjital për laboratorët universitarë."
        description="CampusLab Twin po ndërtohet për t’i dhënë çdo universiteti një hapësirë të veçantë, të sigurt dhe të kuptueshme për administrimin e laboratorëve."
      />
      <section className="content-section compact-top">
        <div className="site-container editorial-grid">
          <h2>Qëllimi ynë</h2>
          <div>
            <p>
              Të zvogëlojmë kompleksitetin operacional pa fshehur informacionin
              që u duhet ekipeve universitare.
            </p>
            <p>
              Platforma zhvillohet hap pas hapi, me sigurinë dhe izolimin
              institucional si parakushte për çdo funksion të ri.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
