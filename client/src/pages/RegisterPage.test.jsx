import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterPage } from "./RegisterPage.jsx";
import {
  prepareRegistrationData,
  validateRegistrationForm,
} from "./registration-form-data.js";

describe("RegisterPage", () => {
  it("does not send an empty optional logo", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="universityName" value="Universiteti Testues" />
      <input name="logo" type="file" />
      <input name="acceptsTerms" type="checkbox" checked />
    `;

    const data = prepareRegistrationData(form);

    expect(data.get("logo")).toBeNull();
    expect(data.get("acceptsTerms")).toBe("true");
  });

  it("fills a valid reserved-domain test university", () => {
    render(<RegisterPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Plotëso universitet testues" }),
    );

    expect(screen.getByLabelText("Faqja zyrtare").value).toMatch(
      /^https:\/\/universiteti-\d+\.test$/,
    );
    expect(screen.getByLabelText("Email-i institucional").value).toMatch(
      /^admin@universiteti-\d+\.test$/,
    );
    expect(screen.getByLabelText(/Pranoj kushtet/)).toBeChecked();
  });

  it("rejects oversized or unsupported logos before upload", () => {
    const form = document.createElement("form");
    const logo = document.createElement("input");
    logo.name = "logo";
    logo.type = "file";
    const password = document.createElement("input");
    password.name = "password";
    password.value = "Fjalekalim!2026";
    const confirmation = document.createElement("input");
    confirmation.name = "confirmPassword";
    confirmation.value = "Fjalekalim!2026";
    form.append(logo, password, confirmation);

    Object.defineProperty(logo, "files", {
      value: [new File(["tekst"], "logo.txt", { type: "text/plain" })],
    });

    expect(validateRegistrationForm(form)).toBe(
      "Logoja duhet të jetë skedar JPG, PNG ose WebP.",
    );
  });

  it("rejects passwords that do not match before submission", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="logo" type="file" />
      <input name="password" value="Fjalekalim!2026" />
      <input name="confirmPassword" value="FjalekalimTjeter!2026" />
    `;

    expect(validateRegistrationForm(form)).toBe("Fjalëkalimet nuk përputhen.");
  });
});
