import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterPage } from "./RegisterPage.jsx";
import { prepareRegistrationData } from "./registration-form-data.js";

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
});
