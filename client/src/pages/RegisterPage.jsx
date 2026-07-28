import { useState } from "react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

export function RegisterPage() {
  const [state, setState] = useState({
    loading: false,
    message: "",
    error: false,
  });

  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, message: "", error: false });
    const data = new FormData(event.currentTarget);
    data.set("acceptsTerms", data.get("acceptsTerms") ? "true" : "false");

    try {
      const result = await api.post(
        "/api/public/university-registrations",
        data,
      );
      event.currentTarget.reset();
      setState({ loading: false, message: result.data.message, error: false });
    } catch (error) {
      setState({ loading: false, message: error.message, error: true });
    }
  }

  return (
    <section className="form-page">
      <div className="form-shell">
        <p className="eyebrow">Regjistrimi institucional</p>
        <h1>Regjistro Universitetin</h1>
        <p>Kërkesa juaj do të ruhet në pritje për shqyrtim.</p>
        <form className="registration-form" onSubmit={submit}>
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
            />
          </label>
          <label>
            Fjalëkalimi
            <input name="password" type="password" minLength="12" required />
          </label>
          <label>
            Konfirmo fjalëkalimin
            <input
              name="confirmPassword"
              type="password"
              minLength="12"
              required
            />
          </label>
          <label className="check-field wide">
            <input name="acceptsTerms" type="checkbox" required /> Pranoj
            kushtet e përdorimit.
          </label>
          {state.message && (
            <p
              className={`form-message wide ${state.error ? "error" : "success"}`}
              role="status"
            >
              {state.message}
            </p>
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
