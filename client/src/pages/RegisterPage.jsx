import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import {
  prepareRegistrationData,
  validateRegistrationForm,
} from "@/pages/registration-form-data.js";

export function RegisterPage() {
  const formRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [state, setState] = useState({
    loading: false,
    message: "",
    error: false,
    details: null,
  });

  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  function updateLogoPreview(event) {
    const file = event.target.files?.[0];
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
    setState({ loading: false, message: "", error: false, details: null });
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
    setState({ loading: false, message: "", error: false, details: null });
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const clientError = validateRegistrationForm(form);
    if (clientError) {
      setState({
        loading: false,
        message: clientError,
        error: true,
        details: null,
      });
      return;
    }

    setState({ loading: true, message: "", error: false, details: null });
    const data = prepareRegistrationData(form);

    try {
      const result = await api.post(
        "/api/public/university-registrations",
        data,
      );
      form.reset();
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview("");
      setState({
        loading: false,
        message: result.data.message,
        error: false,
        details: null,
      });
    } catch (error) {
      setState({
        loading: false,
        message: error.message,
        error: true,
        details: error.details ?? null,
      });
    }
  }

  return (
    <section className="form-page">
      <div className="form-shell">
        <p className="eyebrow">Regjistrimi institucional</p>
        <h1>Regjistro Universitetin</h1>
        <p>
          Kërkesa juaj do të ruhet në pritje për shqyrtim. Për testim mund të
          përdorni një faqe dhe email me të njëjtin domain <code>.test</code>.
        </p>
        <div className="test-form-action">
          <Button type="button" variant="outline" onClick={fillTestUniversity}>
            Plotëso universitet testues
          </Button>
          <span>Nuk kërkon domain real dhe nuk dërgon logo.</span>
        </div>
        <form ref={formRef} className="registration-form" onSubmit={submit}>
          <label className="wide">
            Emri i universitetit
            <input name="universityName" required minLength="3" />
          </label>
          <label>
            Shkurtesa
            <input name="acronym" required minLength="2" />
          </label>
          <label>
            Lloji i institucionit
            <select name="institutionType" required>
              <option value="">Zgjidhni</option>
              <option value="public">Publik</option>
              <option value="private">Privat</option>
            </select>
          </label>
          <label>
            Qyteti
            <input name="city" required />
          </label>
          <label>
            Adresa
            <input name="address" required />
          </label>
          <label className="wide">
            Faqja zyrtare
            <input
              name="officialWebsite"
              type="url"
              placeholder="https://universiteti.edu"
              required
            />
          </label>
          <label className="wide">
            Përshkrimi
            <textarea name="description" rows="4" />
          </label>
          <label>
            Emri i përfaqësuesit
            <input name="representativeName" required />
          </label>
          <label>
            Email-i institucional
            <input name="representativeEmail" type="email" required />
          </label>
          <label>
            Telefoni
            <input name="representativePhone" type="tel" />
          </label>
          <label>
            Logoja
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-describedby="logo-help"
              onChange={updateLogoPreview}
            />
            <span id="logo-help" className="field-help">
              Opsionale · JPG, PNG ose WebP · maksimumi 2 MB
            </span>
          </label>
          {logoPreview && (
            <div className="logo-preview" aria-live="polite">
              <img src={logoPreview} alt="Pamja paraprake e logos" />
              <span>Pamja paraprake</span>
            </div>
          )}
          <label>
            Fjalëkalimi
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength="12"
              aria-describedby="password-help"
              required
            />
            <span id="password-help" className="field-help">
              Të paktën 12 karaktere, me shkronjë të madhe, të vogël, numër dhe
              simbol.
            </span>
          </label>
          <label>
            Konfirmo fjalëkalimin
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength="12"
              required
            />
          </label>
          <label className="check-field wide">
            <input name="acceptsTerms" type="checkbox" required /> Pranoj
            kushtet e përdorimit.
          </label>
          {state.message && (
            <div className="wide" role="status">
              <p
                className={`form-message ${state.error ? "error" : "success"}`}
              >
                {state.message}
              </p>
              {state.details && (
                <ul className="form-error-list">
                  {Object.values(state.details)
                    .flat()
                    .map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                </ul>
              )}
            </div>
          )}
          <div className="wide">
            <Button type="submit" size="lg" disabled={state.loading}>
              {state.loading ? "Po dërgohet…" : "Dërgo kërkesën"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
