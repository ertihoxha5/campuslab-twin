import { Link } from "react-router-dom";

export function WorkspaceNotFoundPage() {
  return (
    <section className="workspace-error-state">
      <span>404</span>
      <h1>Faqja private nuk u gjet</h1>
      <p>Adresa e kërkuar nuk ekziston në hapësirën e universitetit.</p>
      <Link to="/aplikacioni">Kthehu te përmbledhja</Link>
    </section>
  );
}
