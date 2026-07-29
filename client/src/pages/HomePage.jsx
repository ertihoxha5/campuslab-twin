import {
  ArrowRight,
  Building2,
  Check,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
  University,
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeroCarousel } from "@/components/HeroCarousel.jsx";

export function HomePage() {
  return (
    <>
      <HeroCarousel />

      <section className="content-section">
        <div className="site-container statement">
          <p className="eyebrow">Një bazë e besueshme</p>
          <h2>
            Projektuar për institucionet që kërkojnë qartësi dhe kontroll.
          </h2>
          <p>
            CampusLab Twin vendos identitetin institucional, sigurinë e
            llogarive dhe izolimin e të dhënave në qendër të përvojës.
          </p>
        </div>
      </section>

      <section className="principles-section">
        <div className="site-container principles">
          <article>
            <University size={22} />
            <h3>Regjistrim institucional</h3>
            <p>
              Kërkesat verifikojnë email-in zyrtar, faqen e universitetit dhe
              identitetin e përfaqësuesit.
            </p>
          </article>
          <article>
            <LockKeyhole size={22} />
            <h3>Sesione të sigurta</h3>
            <p>
              Qasja përdor cookie HTTP-only, token-a jetëshkurtër dhe rotacion
              të sesionit.
            </p>
          </article>
          <article>
            <ShieldCheck size={22} />
            <h3>Ndarje e qartë</h3>
            <p>
              Llogaritë e universiteteve dhe administrimi i platformës mbeten të
              ndara në çdo hap.
            </p>
          </article>
        </div>
      </section>

      <section className="content-section">
        <div className="site-container home-editorial">
          <div className="home-section-heading">
            <p className="eyebrow">Digital Twin, pa komplikime</p>
            <h2>Një pasqyrë digjitale e laboratorit fizik.</h2>
          </div>
          <div className="home-editorial-copy">
            <p>
              Një Digital Twin lidh strukturën, pajisjet dhe të dhënat e një
              laboratori në një pamje të vetme digjitale. Kjo e bën gjendjen e
              laboratorit më të kuptueshme dhe vendimet më të dokumentuara.
            </p>
            <p>
              CampusLab Twin po ndërtohet me hapa të verifikueshëm. Sot,
              platforma ofron regjistrim institucional, autentikim të sigurt dhe
              izolim të të dhënave ndërmjet universiteteve.
            </p>
            <Link className="text-link" to="/funksionalitetet">
              Shih çfarë është aktive <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-use-cases">
        <div className="site-container">
          <div className="home-section-heading home-section-heading-light">
            <p className="eyebrow">Për kë është platforma</p>
            <h2>Një bazë e përbashkët për laboratorët universitarë.</h2>
          </div>
          <div className="home-use-case-list">
            <article>
              <University size={22} />
              <div>
                <h3>Universitete me disa laboratorë</h3>
                <p>
                  Identitet institucional i verifikuar dhe hapësirë e ndarë për
                  secilin universitet.
                </p>
              </div>
            </article>
            <article>
              <FlaskConical size={22} />
              <div>
                <h3>Ekipe laboratorike</h3>
                <p>
                  Role dhe kufizime sipas laboratorit, të zbatuara nga serveri
                  dhe jo vetëm nga ndërfaqja.
                </p>
              </div>
            </article>
            <article>
              <Building2 size={22} />
              <div>
                <h3>Administrim institucional</h3>
                <p>
                  Një proces i qartë regjistrimi, shqyrtimi dhe aktivizimi të
                  universitetit.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="site-container home-process">
          <div className="home-section-heading">
            <p className="eyebrow">Si fillon</p>
            <h2>Nga kërkesa te një llogari institucionale e sigurt.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Regjistroni universitetin</h3>
                <p>Plotësoni të dhënat zyrtare dhe kontaktin përfaqësues.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Prisni shqyrtimin</h3>
                <p>Kërkesa ruhet në pritje dhe verifikohet para aktivizimit.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Kyçuni në mënyrë të sigurt</h3>
                <p>
                  Vetëm përdoruesit e universiteteve aktive mund të krijojnë
                  sesion.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="home-faq">
        <div className="site-container home-faq-grid">
          <div className="home-section-heading">
            <p className="eyebrow">Pyetje të shpeshta</p>
            <h2>Përpara se të regjistroheni.</h2>
          </div>
          <div>
            <details>
              <summary>A mund të regjistroj një universitet testues?</summary>
              <p>
                Po. Formulari pranon edhe domain-e të rezervuara për testim,
                ndaj mund ta provoni procesin pa përfaqësuar një institucion
                real.
              </p>
            </details>
            <details>
              <summary>A aktivizohet llogaria menjëherë?</summary>
              <p>
                Jo. Kërkesa krijohet me statusin “Në pritje” dhe duhet të
                shqyrtohet përpara kyçjes.
              </p>
            </details>
            <details>
              <summary>
                A mund t’i shohë një universitet të dhënat e tjetrit?
              </summary>
              <p>
                Jo. Identiteti i universitetit merret nga sesioni i verifikuar
                dhe kontrollohet në kërkesat, skedarët dhe lidhjet realtime.
              </p>
            </details>
            <details>
              <summary>A janë funksionet e ardhshme të simuluara këtu?</summary>
              <p>
                Jo. Faqja “Platforma” paraqet vetëm aftësitë që mbështeten nga
                implementimi aktual.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="home-contact">
        <div className="site-container home-contact-inner">
          <Check size={22} />
          <div>
            <p className="eyebrow">Keni një pyetje?</p>
            <h2>Flisni me ekipin e CampusLab Twin.</h2>
          </div>
          <Link className="text-link" to="/kontakti">
            Na kontaktoni <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="simple-cta">
        <div className="site-container">
          <div>
            <p className="eyebrow">Filloni me institucionin tuaj</p>
            <h2>Dërgoni kërkesën e universitetit.</h2>
          </div>
          <Link className="text-link" to="/regjistrohu">
            Hap formularin <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
