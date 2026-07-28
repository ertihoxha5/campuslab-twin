import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

const slides = [
  {
    image: "/images/laboratory-students.jpg",
    alt: "Studentë duke punuar në një laborator universitar",
    credit: "Foto: cottonbro studio / Pexels",
  },
  {
    image: "/images/laboratory-interior.jpg",
    alt: "Ambient i pastër i një laboratori shkencor",
    credit: "Foto: Polina Tankilevitch / Pexels",
  },
  {
    image: "/images/laboratory-research.jpg",
    alt: "Pajisje kërkimore në një laborator universitar të avancuar",
    credit: "Foto: Daniel Miksha / Unsplash",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(interval);
  }, []);

  const move = (direction) => {
    setActive((value) => (value + direction + slides.length) % slides.length);
  };

  return (
    <section className="hero-carousel" aria-roledescription="carousel">
      <div className="hero-slides">
        {slides.map((slide, index) => (
          <img
            key={slide.image}
            className={index === active ? "is-active" : ""}
            src={slide.image}
            alt={index === active ? slide.alt : ""}
            aria-hidden={index !== active}
          />
        ))}
      </div>
      <div className="hero-overlay" />
      <div className="site-container hero-content">
        <p className="hero-eyebrow">CampusLab Twin</p>
        <h1>Laboratorë më të qartë. Vendime më të sigurta.</h1>
        <p>
          Një platformë për regjistrim institucional dhe qasje të sigurt në
          hapësirën e çdo universiteti.
        </p>
        <div className="hero-actions">
          <Button asChild size="lg">
            <Link to="/regjistrohu">
              Regjistro Universitetin <ArrowRight size={18} />
            </Link>
          </Button>
          <Button asChild size="lg" className="hero-secondary">
            <Link to="/kycu">Kyçu</Link>
          </Button>
        </div>
      </div>
      <div className="hero-controls">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Fotoja e mëparshme"
        >
          <ChevronLeft size={19} />
        </button>
        <div className="hero-dots">
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              className={index === active ? "is-active" : ""}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Shfaq fotografinë ${index + 1}`}
              aria-current={index === active}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Fotoja tjetër"
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <span className="hero-credit">{slides[active].credit}</span>
    </section>
  );
}
