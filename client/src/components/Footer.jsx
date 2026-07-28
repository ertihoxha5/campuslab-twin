import { FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-main">
        <div>
          <Link className="brand" to="/">
            <span className="brand-icon">
              <FlaskConical size={19} />
            </span>
            <span>
              CampusLab <strong>Twin</strong>
            </span>
          </Link>
          <p className="footer-summary">
            Bazë e sigurt për menaxhimin e laboratorëve universitarë.
          </p>
        </div>
        <div className="footer-links">
          <span>Platforma</span>
          <Link to="/rreth-nesh">Rreth nesh</Link>
          <Link to="/funksionalitetet">Çfarë ofron</Link>
          <Link to="/si-funksionon">Si funksionon</Link>
        </div>
        <div className="footer-links">
          <span>Filloni</span>
          <Link to="/regjistrohu">Regjistro universitetin</Link>
          <Link to="/kycu">Kyçu</Link>
          <Link to="/kontakti">Kontakti</Link>
        </div>
      </div>
      <div className="site-container footer-bottom">
        <span>© 2026 CampusLab Twin</span>
        <span>Prishtinë · Tiranë</span>
      </div>
    </footer>
  );
}
