import { ArrowRight, LockKeyhole, ShieldCheck, University } from "lucide-react";
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
