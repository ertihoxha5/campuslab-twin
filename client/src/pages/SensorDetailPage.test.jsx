import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { SensorDetailPage } from "./SensorDetailPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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
  warningMin: 15,
  warningMax: 28,
  criticalMin: 10,
  criticalMax: 35,
  calibratedAt: "2026-01-10T10:00:00.000Z",
  calibrationDueAt: "2027-01-10T10:00:00.000Z",
  positionX: 1.5,
  positionY: 1.2,
  positionZ: -0.8,
  rotationX: 0,
  rotationY: 90,
  rotationZ: 0,
};

const options = {
  laboratories: [
    { id: "15", name: "Laboratori i Automatizimit", code: "AUTO-01" },
  ],
  zones: [{ id: "3", name: "Zona e Robotikës", code: "ROB" }],
  equipment: [{ id: "21", name: "Robot industrial", code: "ROB-01" }],
};

const calibration = {
  id: "41",
  result: "passed",
  calibratedAt: "2026-01-10T10:00:00.000Z",
  calibrationDueAt: "2027-01-10T10:00:00.000Z",
  notes: "Kontrolli përfundoi pa devijime.",
  performedByUserId: "9",
  performedByUserName: "Arta Berisha",
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({
    fullName: "Arta Berisha",
    permissions: ["laboratories.view", "assets.manage"],
    university: { id: "7", name: "Universiteti Testues" },
  });
  api.get.mockImplementation((path) => {
    if (path.startsWith("/api/sensors/options")) {
      return Promise.resolve({ data: options });
    }
    if (path.endsWith("/calibrations")) {
      return Promise.resolve({ data: { calibrations: [calibration] } });
    }
    return Promise.resolve({ data: { sensor } });
  });
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("SensorDetailPage", () => {
  it("shows thresholds, calibration and 3D placement", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Sensori i temperaturës",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("28 °C")).toBeInTheDocument();
    expect(screen.getByText("1,5 m")).toBeInTheDocument();
    expect(screen.getByText("90°")).toBeInTheDocument();
    expect(
      screen.getByText("Kontrolli përfundoi pa devijime."),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/sensors/31");
    expect(api.get).toHaveBeenCalledWith("/api/sensors/31/calibrations");
  });

  it("updates the sensor through the shared validated form", async () => {
    api.put.mockResolvedValue({
      data: {
        sensor: { ...sensor, samplingIntervalSeconds: 60 },
        message: "Sensori u përditësua me sukses.",
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Ndrysho" }));
    await screen.findByRole("option", {
      name: "Laboratori i Automatizimit (AUTO-01)",
    });
    fireEvent.change(screen.getByLabelText("Intervali i mostrimit (sekonda)"), {
      target: { value: "60" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ruaj ndryshimet" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/sensors/31",
        expect.objectContaining({
          laboratoryId: "15",
          sensorType: "temperature",
          unit: "°C",
          samplingIntervalSeconds: 60,
          positionX: 1.5,
        }),
      ),
    );
    expect(
      await screen.findByText("Sensori u përditësua me sukses."),
    ).toBeInTheDocument();
  });

  it("archives after confirmation and returns to the sensor list", async () => {
    api.delete.mockResolvedValue({
      data: { message: "Sensori u arkivua me sukses." },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Arkivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Arkivo sensorin" }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/api/sensors/31"),
    );
    expect(
      await screen.findByRole("heading", { name: "Lista e sensorëve" }),
    ).toBeInTheDocument();
  });

  it("records a calibration and adds it to the real history", async () => {
    api.post.mockResolvedValue({
      data: {
        calibration: {
          id: "42",
          sensorId: "31",
          result: "adjusted",
          calibratedAt: "2026-07-30T12:00",
          calibrationDueAt: "2027-07-30T12:00",
          notes: "U rregullua devijimi.",
          performedByUserId: "9",
        },
        message: "Kalibrimi u regjistrua me sukses.",
      },
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Regjistro kalibrim" }),
    );
    fireEvent.change(screen.getByLabelText("Rezultati"), {
      target: { value: "adjusted" },
    });
    fireEvent.change(screen.getByLabelText("Data e kalibrimit"), {
      target: { value: "2026-07-30T12:00" },
    });
    fireEvent.change(screen.getByLabelText("Kalibrimi i ardhshëm"), {
      target: { value: "2027-07-30T12:00" },
    });
    fireEvent.change(screen.getByLabelText("Shënime"), {
      target: { value: "U rregullua devijimi." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Regjistro kalibrimin" }),
    );

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/sensors/31/calibrations", {
        result: "adjusted",
        calibratedAt: "2026-07-30T12:00",
        calibrationDueAt: "2027-07-30T12:00",
        notes: "U rregullua devijimi.",
      }),
    );
    expect(
      await screen.findByText("U rregullua devijimi."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kalibrimi u regjistrua me sukses."),
    ).toBeInTheDocument();
  });

  it("hides update and archive actions from read-only users", async () => {
    useAuthStore.getState().setSession({
      fullName: "Blerim Hoxha",
      permissions: ["laboratories.view"],
      university: { id: "7", name: "Universiteti Testues" },
    });
    renderPage();

    await screen.findByRole("heading", { name: "Sensori i temperaturës" });
    expect(
      screen.queryByRole("button", { name: "Ndrysho" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Arkivo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Regjistro kalibrim" }),
    ).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/aplikacioni/sensoret/31"]}>
      <Routes>
        <Route
          path="/aplikacioni/sensoret/:sensorId"
          element={<SensorDetailPage />}
        />
        <Route
          path="/aplikacioni/sensoret"
          element={<h1>Lista e sensorëve</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
