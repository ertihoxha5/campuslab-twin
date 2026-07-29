import { Building2, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store.js";

export function UniversityOverviewPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="workspace-overview">
      <div className="workspace-page-heading">
        <p className="eyebrow">Hapësira private</p>
        <h1>Mirë se vini, {user?.fullName?.split(" ")[0]}</h1>
        <p>
          Hapësira e {user?.university.name} është aktive dhe e izoluar nga
          universitetet e tjera.
        </p>
      </div>
      <div className="workspace-onboarding">
        <span>
          <Building2 size={25} />
        </span>
        <div>
          <h2>Struktura e universitetit është gati</h2>
          <p>
            Të dhënat operative do të shfaqen këtu pasi të konfigurohen
            laboratorët në hapin e ardhshëm.
          </p>
        </div>
        <div className="tenant-security-note">
          <ShieldCheck size={18} />
          <span>
            Sesioni dhe të dhënat kufizohen nga serveri për këtë universitet.
          </span>
        </div>
      </div>
    </section>
  );
}
