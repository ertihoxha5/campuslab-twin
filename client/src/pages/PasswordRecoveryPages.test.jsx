import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { ForgotPasswordPage } from "./ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./ResetPasswordPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { post: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rikuperimi i fjalëkalimit", () => {
  it("dërgon email-in te API dhe shfaq përgjigjen e sigurt", async () => {
    api.post.mockResolvedValue({
      data: {
        message:
          "Nëse email-i i përket një llogarie aktive, udhëzimet do të dërgohen.",
      },
    });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email-i institucional"), {
      target: { value: "arta@universiteti.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dërgo udhëzimet" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/auth/forgot-password", {
        email: "arta@universiteti.test",
      }),
    );
    expect(
      screen.getByText(/Nëse email-i i përket një llogarie aktive/),
    ).toBeInTheDocument();
  });

  it("nuk dërgon fjalëkalime që nuk përputhen", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/rivendos-fjalekalimin?token=abcdefghijklmnopqrstuvwxyz123456",
        ]}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Fjalëkalimi i ri"), {
      target: { value: "Fjalekalim!2026" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmoni fjalëkalimin"), {
      target: { value: "TjeterFjalekalim!2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ruaj fjalëkalimin" }));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText("Fjalëkalimet nuk përputhen.")).toBeInTheDocument();
  });

  it("dërgon token-in dhe fjalëkalimin e ri te API", async () => {
    const token = "abcdefghijklmnopqrstuvwxyz123456";
    api.post.mockResolvedValue({
      data: { message: "Fjalëkalimi u ndryshua me sukses." },
    });
    render(
      <MemoryRouter initialEntries={[`/rivendos-fjalekalimin?token=${token}`]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    for (const label of ["Fjalëkalimi i ri", "Konfirmoni fjalëkalimin"]) {
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: "Fjalekalim!2026" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Ruaj fjalëkalimin" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/auth/reset-password", {
        token,
        password: "Fjalekalim!2026",
        confirmPassword: "Fjalekalim!2026",
      }),
    );
    expect(
      screen.getByRole("link", { name: "Vazhdo te kyçja" }),
    ).toBeInTheDocument();
  });
});
