import { Mail } from "lucide-react";
import { PageIntro } from "@/components/PageIntro.jsx";

export function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Kontakti"
        title="Flisni me ekipin e CampusLab Twin."
        description="Për pyetje rreth regjistrimit institucional ose qasjes në platformë, na shkruani."
      />
      <section className="content-section compact-top">
        <div className="site-container contact-card">
          <Mail size={24} />
          <div>
            <span>Email</span>
            <a href="mailto:info@campuslab.local">info@campuslab.local</a>
          </div>
        </div>
      </section>
    </>
  );
}
