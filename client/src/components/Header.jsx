import { useState } from "react";
import { FlaskConical, Menu, Moon, Sun, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

const navigation = [
  { to: "/", label: "Kryefaqja", end: true },
  { to: "/rreth-nesh", label: "Rreth nesh" },
  { to: "/funksionalitetet", label: "Platforma" },
  { to: "/si-funksionon", label: "Si funksionon" },
  { to: "/kontakti", label: "Kontakti" },
];

export function Header({ theme, onToggleTheme }) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link className="brand" to="/" onClick={closeMenu}>
          <span className="brand-icon">
            <FlaskConical size={19} aria-hidden="true" />
          </span>
          <span>
            CampusLab <strong>Twin</strong>
          </span>
        </Link>

        <nav
          className={`main-nav ${open ? "is-open" : ""}`}
          aria-label="Navigimi kryesor"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mobile-nav-actions">
            <Button asChild variant="outline">
              <Link to="/kycu" onClick={closeMenu}>
                Kyçu
              </Link>
            </Button>
            <Button asChild>
              <Link to="/regjistrohu" onClick={closeMenu}>
                Regjistro Universitetin
              </Link>
            </Button>
          </div>
        </nav>

        <div className="header-actions">
          <button
            className="icon-control"
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === "dark"
                ? "Aktivizo pamjen e çelët"
                : "Aktivizo pamjen e errët"
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button asChild variant="outline" className="header-login">
            <Link to="/kycu">Kyçu</Link>
          </Button>
          <Button asChild className="header-register">
            <Link to="/regjistrohu">Regjistro Universitetin</Link>
          </Button>
          <button
            className="icon-control menu-toggle"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Mbyll menunë" : "Hap menunë"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
