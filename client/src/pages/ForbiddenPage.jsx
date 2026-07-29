import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <section className="workspace-error-state">
      <span>403</span>
      <h1>Nuk keni leje për këtë faqe</h1>
      <p>Roli juaj nuk e lejon hapjen e këtij seksioni.</p>
      <Link to="/aplikacioni">Kthehu te përmbledhja</Link>
    </section>
  );
}
