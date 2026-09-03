import { useEffect, useRef, useState } from "react";
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
  const [paused, setPaused] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!paused) setActive((value) => (value + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [paused]);

  const move = (direction) => {
    setActive((value) => (value + direction + slides.length) % slides.length);
  };

  const moveLight = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--pointer-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--pointer-y",
      `${event.clientY - bounds.top}px`,
    );
  };

  return (
    <section
      ref={heroRef}
      className="hero-carousel"
      aria-roledescription="carousel"
      onPointerMove={moveLight}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
      <div className="hero-magic-light" aria-hidden="true" />
      <div className="site-container hero-content">
        <p className="hero-eyebrow">
          <span /> Platformë operative për universitetet
        </p>
        <h1>Laboratori juaj, i kuptueshëm në çdo moment.</h1>
        <p>
          Monitoroni hapësirat, pajisjet dhe sensorët në kohë reale përmes një
          Digital Twin të ndërtuar sipas laboratorit tuaj.
        </p>
        <div className="hero-actions">
          <Button asChild size="lg">
            <Link to="/regjistrohu">
              Regjistro Universitetin <ArrowRight size={18} />
            </Link>
          </Button>
          <Button asChild size="lg" className="hero-secondary">
            <Link to="/funksionalitetet">Shiko platformën</Link>
          </Button>
        </div>
        <dl className="hero-facts">
          <div>
            <dt>Realtime</dt>
            <dd>Sensorë &amp; alarme live</dd>
          </div>
          <div>
            <dt>3D</dt>
            <dd>Digital Twin sipas zonave</dd>
          </div>
          <div>
            <dt>Multi-tenant</dt>
            <dd>Të dhëna sipas universitetit</dd>
          </div>
        </dl>
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
        <button type="button" onClick={() => move(1)} aria-label="Fotoja tjetër">
          <ChevronRight size={19} />
        </button>
      </div>
      <span className="hero-credit">{slides[active].credit}</span>
    </section>
  );
}
