import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { DigitalTwinPage } from "./DigitalTwinPage.jsx";

const { canvasSpy } = vi.hoisted(() => ({ canvasSpy: vi.fn() }));
vi.mock("@/api/client.js", () => ({ api: { get: vi.fn() } }));
vi.mock("@/api/realtime.js", () => ({ connectMonitoringRealtime: vi.fn(() => vi.fn()) }));
vi.mock("@/components/digital-twin/DigitalTwinCanvas.jsx", () => ({ DigitalTwinCanvas: (props) => { canvasSpy(props); return <button type="button" onClick={() => props.onSelect({ kind: "asset", item: props.assets[0] })}>Skena 3D</button>; } }));

function mockApi() {
  api.get.mockImplementation((path) => {
    if (path.startsWith("/api/laboratories?")) return Promise.resolve({ data: { laboratories: [{ id: "15", name: "Laboratori i Automatizimit", code: "AUT-01" }] } });
    if (path.startsWith("/api/sensors?")) return Promise.resolve({ data: { sensors: [{ id: "9", sensorType: "temperature" }] } });
    if (path.startsWith("/api/equipment?")) return Promise.resolve({ data: { equipment: [{ id: "21", zoneId: "3", name: "Krahu robotik UR5e", code: "ROBOT-UR5E", type: "robot", status: "active", healthScore: 96 }] } });
    if (path.startsWith("/api/dashboard/summary")) return Promise.resolve({ data: { summary: { latestSensorReadings: [{ sensorId: "9", value: 23.7 }] } } });
    if (path.startsWith("/api/alerts?")) return Promise.resolve({ data: { alerts: [] } });
    if (path.endsWith("/zones")) return Promise.resolve({ data: { zones: [{ id: "3", name: "Zona e Robotikës", code: "ROBOT-01", position: { x: 0, y: 0, z: 0 }, dimensions: { width: 8, height: 3, depth: 6 } }] } });
    return Promise.reject(new Error(`Unexpected ${path}`));
  });
}

describe("DigitalTwinPage rebuilt viewer", () => {
  beforeEach(() => { vi.clearAllMocks(); mockApi(); });
  it("loads the authorized laboratory and operational scene", async () => { render(<DigitalTwinPage />); expect(await screen.findByRole("option", { name: "Laboratori i Automatizimit (AUT-01)" })).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Digital Twin operacional" })).toBeInTheDocument(); expect(await screen.findByText("23.7 °C")).toBeInTheDocument(); expect(canvasSpy).toHaveBeenLastCalledWith(expect.objectContaining({ assets: expect.any(Array), sensors: expect.any(Array), cameraMode: "overview" })); });
  it("controls camera and independent visibility layers", async () => { const user = userEvent.setup(); render(<DigitalTwinPage />); await screen.findByText("Skena 3D"); await user.click(screen.getByRole("button", { name: "Nga lart" })); await user.click(screen.getByRole("button", { name: "Rrjedha" })); expect(canvasSpy).toHaveBeenLastCalledWith(expect.objectContaining({ cameraMode: "top", layers: expect.objectContaining({ dataFlow: true }) })); });
  it("opens a live asset panel and focuses the selected object", async () => { const user = userEvent.setup(); render(<DigitalTwinPage />); await user.click(await screen.findByText("Skena 3D")); expect(screen.getByRole("heading", { name: "Krahu robotik UR5e" })).toBeInTheDocument(); expect(screen.getByText("ROBOT-UR5E")).toBeInTheDocument(); await user.click(screen.getByRole("button", { name: /Fokuso në objekt/ })); expect(canvasSpy).toHaveBeenLastCalledWith(expect.objectContaining({ cameraMode: "focus", selection: expect.objectContaining({ kind: "asset" }) })); });
  it("applies realtime sensor readings from the existing backend channel", async () => { render(<DigitalTwinPage />); await screen.findByText("Skena 3D"); const { onEvent } = connectMonitoringRealtime.mock.calls.at(-1)[0]; act(() => onEvent("sensor:reading", { sensorId: "9", value: 28.4, unit: "°C" })); expect(await screen.findByText("28.4 °C")).toBeInTheDocument(); });
  it("keeps operational data in an on-demand dashboard drawer", async () => { const user = userEvent.setup(); render(<DigitalTwinPage />); await screen.findByText("Skena 3D"); expect(screen.queryByRole("complementary", { name: "Live logs" })).not.toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Live logs" })); expect(screen.getByRole("complementary", { name: "Live logs" })).toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Mbyll panelin" })); expect(screen.queryByRole("complementary", { name: "Live logs" })).not.toBeInTheDocument(); });
});
