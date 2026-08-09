import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { ReportsPage } from "./ReportsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn(), download: vi.fn() },
}));

const report = {
  id: "4",
  universityName: "Universiteti Test",
  laboratoryName: "Laboratori A",
  generatedByName: "Admin Test",
  title: "Raporti i energjisë",
  reportType: "energy",
  periodStart: "2026-08-01T00:00:00.000Z",
  periodEnd: "2026-08-09T00:00:00.000Z",
  parameters: { format: "pdf", dataSource: "mixed" },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({
    permissions: ["reports.view", "reports.generate"],
  });
  api.get.mockImplementation(async (url) => {
    if (url.startsWith("/api/reports?"))
      return { data: { reports: [report], pagination: { total: 1 } } };
    if (url.startsWith("/api/laboratories?"))
      return { data: { laboratories: [{ id: "15", name: "Laboratori A" }] } };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: { report } });
  api.download.mockResolvedValue({
    blob: new Blob(["pdf"]),
    filename: "raporti-4.pdf",
  });
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

describe("ReportsPage", () => {
  it("renders traceable reports and generates the selected format", async () => {
    render(<ReportsPage />);
    expect(await screen.findByText("Raporti i energjisë")).toBeInTheDocument();
    expect(
      screen.getByText("Universiteti Test · Laboratori A"),
    ).toBeInTheDocument();
    expect(screen.getByText("I kombinuar")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Formati"), {
      target: { value: "csv" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gjenero raportin/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1]).toMatchObject({
      format: "csv",
      reportType: "laboratory",
    });
    expect(
      await screen.findByText("Raporti u gjenerua me sukses."),
    ).toBeInTheDocument();
  });

  it("downloads through the protected report endpoint", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<ReportsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /PDF/i }));
    await waitFor(() =>
      expect(api.download).toHaveBeenCalledWith("/api/reports/4/download"),
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("hides generation controls without reports.generate", async () => {
    useAuthStore.getState().setSession({ permissions: ["reports.view"] });
    render(<ReportsPage />);
    await screen.findByText("Raporti i energjisë");
    expect(screen.queryByText("Gjenero raport të ri")).not.toBeInTheDocument();
  });
});
