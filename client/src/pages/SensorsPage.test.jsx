import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { SensorsPage } from "./SensorsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const sensor = {
  id: "31",
  laboratoryId: "15",
  laboratoryName: "Laboratori i Automatizimit",
  zoneId: "3",
  zoneName: "Zona e Robotikës",
  equipmentId: "21",
  equipmentName: "Robot industrial",
  name: "Sensori i temperaturës",
  code: "TEMP-01",
  sensorType: "temperature",
  unit: "°C",
  status: "online",
  samplingIntervalSeconds: 30,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({
    fullName: "Arta Berisha",
    permissions: ["laboratories.view", "assets.manage"],
    university: { id: "7", name: "Universiteti Testues" },
  });
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("SensorsPage", () => {
  it("renders tenant sensors and sends search, type and sorting filters", async () => {
    api.get.mockResolvedValue({
      data: { sensors: [sensor] },
      meta: { pagination: { page: 1, pages: 1, total: 1 } },
    });
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Sensori i temperaturës",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Robot industrial")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hap detajet" })).toHaveAttribute(
      "href",
      "/aplikacioni/sensoret/31",
    );

    fireEvent.change(screen.getByLabelText("Kërko sensorët"), {
      target: { value: "TEMP" },
    });
    fireEvent.change(screen.getByLabelText("Lloji"), {
      target: { value: "temperature" },
    });
    fireEvent.change(screen.getByLabelText("Renditja"), {
      target: { value: "updatedAt" },
    });
    fireEvent.submit(screen.getByLabelText("Kërko sensorët").form);

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/sensors?page=1&pageSize=12&sort=updatedAt&direction=asc&sensorType=temperature&search=TEMP",
      ),
    );
  });

  it("creates a sensor with real laboratory relations and 3D placement", async () => {
    api.get.mockImplementation((path) => {
      if (path.startsWith("/api/sensors/options")) {
        return Promise.resolve({
          data: {
            laboratories: [
              {
                id: "15",
                name: "Laboratori i Automatizimit",
                code: "AUTO-01",
              },
            ],
            zones: path.includes("laboratoryId=15")
              ? [{ id: "3", name: "Zona e Robotikës", code: "ROB" }]
              : [],
            equipment: path.includes("laboratoryId=15")
              ? [{ id: "21", name: "Robot industrial", code: "ROB-01" }]
              : [],
          },
        });
      }
      return Promise.resolve({
        data: { sensors: [] },
        meta: { pagination: { page: 1, pages: 0, total: 0 } },
      });
    });
    api.post.mockResolvedValue({
      data: { sensor, message: "Sensori u krijua me sukses." },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Sensor i ri" }));
    await screen.findByRole("option", {
      name: "Laboratori i Automatizimit (AUTO-01)",
    });
    fireEvent.change(screen.getByLabelText("Laboratori"), {
      target: { value: "15" },
    });
    await screen.findByRole("option", { name: "Robot industrial (ROB-01)" });
    fireEvent.change(screen.getByLabelText("Zona"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Pajisja"), {
      target: { value: "21" },
    });
    fireEvent.change(screen.getByLabelText("Emri"), {
      target: { value: "Sensori i temperaturës" },
    });
    fireEvent.change(screen.getByLabelText("Kodi"), {
      target: { value: "TEMP-01" },
    });
    fireEvent.change(screen.getByLabelText("Maksimumi paralajmërues"), {
      target: { value: "28" },
    });
    fireEvent.change(screen.getByLabelText("Maksimumi kritik"), {
      target: { value: "35" },
    });
    fireEvent.change(screen.getByLabelText("Pozicioni X"), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Krijo sensorin" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/api/sensors",
        expect.objectContaining({
          laboratoryId: "15",
          zoneId: "3",
          equipmentId: "21",
          code: "TEMP-01",
          sensorType: "temperature",
          unit: "°C",
          warningMax: 28,
          criticalMax: 35,
          positionX: 1.5,
        }),
      ),
    );
    expect(
      await screen.findByText("Sensori u krijua me sukses."),
    ).toBeInTheDocument();
  });

  it("keeps sensor creation hidden from read-only users", async () => {
    useAuthStore.getState().setSession({
      fullName: "Blerim Hoxha",
      permissions: ["laboratories.view"],
      university: { id: "7", name: "Universiteti Testues" },
    });
    api.get.mockResolvedValue({
      data: { sensors: [] },
      meta: { pagination: { page: 1, pages: 0, total: 0 } },
    });
    renderPage();

    expect(
      await screen.findByText(
        "Nuk ka sensorë në laboratorët që ju janë caktuar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sensor i ri" }),
    ).not.toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SensorsPage />
    </MemoryRouter>,
  );
}
