import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1>Faqja nuk u gjet.</h1>
      <Button asChild>
        <Link to="/">Kthehu në kryefaqe</Link>
      </Button>
    </section>
  );
}
