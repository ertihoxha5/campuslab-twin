import { useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, FlaskConical, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/client.js";
import { AuthPageShell } from "@/components/AuthPageShell.jsx";
import { Button } from "@/components/ui/button.jsx";
import { prepareRegistrationData, validateRegistrationForm } from "@/pages/registration-form-data.js";

const initialState = { loading: false, message: "", error: false, details: null };

export function RegisterPage() {
  const formRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [state, setState] = useState(initialState);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function updateLogoPreview(event) {
    const file = event.target.files?.[0];
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
    setState(initialState);
  }

  function fillTestUniversity() {
    const form = formRef.current;
    if (!form) return;
    const suffix = Date.now().toString().slice(-6);
    const values = {
      universityName: `Universiteti Testues ${suffix}`,
      acronym: `UT${suffix}`,
      institutionType: "private",
      city: "Prishtinë",
      address: "Rruga Testuese 10",
      officialWebsite: `https://universiteti-${suffix}.test`,
      description: "Regjistrim testues për verifikimin e CampusLab Twin.",
      representativeName: "Përfaqësues Testues",
      representativeEmail: `admin@universiteti-${suffix}.test`,
      representativePhone: "+383 44 000 000",
      password: "TestCampusLab!2026",
      confirmPassword: "TestCampusLab!2026",
    };
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name);
      if (field) field.value = value;
    }
    form.elements.namedItem("acceptsTerms").checked = true;
    form.elements.namedItem("logo").value = "";
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview("");
    setState(initialState);
    setProgress(100);
  }

  function updateProgress(event) {
    const required = [...event.currentTarget.querySelectorAll("[required]")];
    const completed = required.filter((field) => field.type === "checkbox" ? field.checked : field.value.trim()).length;
    setProgress(Math.round((completed / required.length) * 100));
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const clientError = validateRegistrationForm(form);
    if (clientError) {
      setState({ loading: false, message: clientError, error: true, details: null });
      return;
    }
    setState({ loading: true, message: "", error: false, details: null });
    try {
      const result = await api.post("/api/public/university-registrations", prepareRegistrationData(form));
      form.reset();
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview("");
      setProgress(0);
      setState({ loading: false, message: result.data.message, error: false, details: null });
    } catch (error) {
      setState({ loading: false, message: error.message, error: true, details: error.details ?? null });
    }
  }

  return (
    <AuthPageShell
      variant="registration"
      eyebrow="Regjistrimi institucional"
      title="Regjistro universitetin"
      description="Plotësoni të dhënat institucionale. Kërkesa shqyrtohet nga administratori i platformës para aktivizimit."
      asideTitle="Niseni me të dhëna reale ose testuese."
      asideItems={["Universitetet testuese pranohen me domain .test", "Të dhënat verifikohen para aktivizimit", "Administratori krijohet pas aprovimit"]}
    >
      <div className="registration-progress"><div><span>Progresi i kërkesës</span><strong>{progress}%</strong></div><i><b style={{ width: `${progress}%` }} /></i><small>{progress === 100 ? "Gati për verifikim" : "Plotësoni fushat e detyrueshme"}</small></div>
      <div className="registration-test-callout">
        <FlaskConical size={19} />
        <div><strong>Po testoni sistemin?</strong><p>Gjeneroni automatikisht një universitet të vlefshëm me domain të rezervuar.</p></div>
        <Button type="button" variant="outline" size="sm" onClick={fillTestUniversity}>Plotëso testin</Button>
      </div>

      <form ref={formRef} className="registration-form auth-registration-form" onSubmit={submit} onInput={updateProgress}>
        <fieldset data-step="01">
          <legend><Building2 size={17} /> Institucioni</legend>
          <div className="registration-fields">
            <label className="wide">Emri i universitetit<input name="universityName" required minLength="3" /></label>
            <label>Shkurtesa<input name="acronym" required minLength="2" /></label>
            <label>Lloji i institucionit<select name="institutionType" required><option value="">Zgjidhni</option><option value="public">Publik</option><option value="private">Privat</option></select></label>
            <label>Qyteti<input name="city" required /></label>
            <label>Adresa<input name="address" required /></label>
            <label className="wide">Faqja zyrtare<input name="officialWebsite" type="url" placeholder="https://universiteti.edu" required /></label>
            <label className="wide">Përshkrimi<textarea name="description" rows="3" /></label>
            <label>Logoja<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="logo-help" onChange={updateLogoPreview} /><span id="logo-help" className="field-help">Opsionale · JPG, PNG ose WebP · maksimumi 2 MB</span></label>
            {logoPreview && <div className="logo-preview"><img src={logoPreview} alt="Pamja paraprake e logos" /><span>Pamja paraprake</span></div>}
          </div>
        </fieldset>

        <fieldset data-step="02">
          <legend><UserRound size={17} /> Përfaqësuesi</legend>
          <div className="registration-fields">
            <label>Emri i përfaqësuesit<input name="representativeName" required /></label>
            <label>Email-i institucional<input name="representativeEmail" type="email" required /></label>
            <label>Telefoni<input name="representativePhone" type="tel" /></label>
          </div>
        </fieldset>

        <fieldset data-step="03">
          <legend><ShieldCheck size={17} /> Siguria</legend>
          <div className="registration-fields">
            <label>Fjalëkalimi<input name="password" type="password" autoComplete="new-password" minLength="12" aria-describedby="password-help" required /><span id="password-help" className="field-help">Të paktën 12 karaktere me shkronjë të madhe, të vogël, numër dhe simbol.</span></label>
            <label>Konfirmo fjalëkalimin<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" required /></label>
            <label className="auth-checkbox wide"><input name="acceptsTerms" type="checkbox" required /> Pranoj kushtet e përdorimit dhe përpunimin e të dhënave të kërkesës.</label>
          </div>
        </fieldset>

        {state.message && (
          <div role={state.error ? "alert" : "status"}>
            <p className={`form-message ${state.error ? "error" : "success"}`}>{state.message}</p>
            {state.details && <ul className="form-error-list">{Object.values(state.details).flat().map((detail) => <li key={detail}>{detail}</li>)}</ul>}
          </div>
        )}
        <div className="registration-submit">
          <p>Duke dërguar kërkesën, nuk aktivizohet automatikisht universiteti.</p>
          <Button type="submit" size="lg" disabled={state.loading}>{state.loading ? "Duke dërguar…" : "Dërgo kërkesën"}<ArrowRight size={18} /></Button>
        </div>
      </form>
      <p className="auth-footnote">Keni llogari aktive? <Link to="/kycu">Kthehuni te kyçja</Link></p>
    </AuthPageShell>
  );
}
