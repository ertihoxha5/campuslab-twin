import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { SimulationsPage } from "./SimulationsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const scenario = {
  id: "4",
  name: "Rritje e kontrolluar e temperaturës",
  scenarioType: "temperature_rise",
};
const preview = {
  persisted: false,
  timeline: [
    { tick: 1, values: { temperature: 22, co2: 450, power: 1000 } },
    { tick: 2, values: { temperature: 23, co2: 470, power: 1200 } },
  ],
};

function mockWorkspace() {
  api.get.mockImplementation(async (url) => {
    if (url.startsWith("/api/laboratories?")) {
      return { data: { laboratories: [{ id: "15", name: "Laboratori A" }] } };
    }
    if (url.endsWith("/scenarios")) {
      return { data: { scenarios: [scenario] } };
    }
    if (url.endsWith("/status")) return { data: { run: null } };
    if (url.includes("/runs?page=")) {
      return {
        data: {
          runs: [
            {
              id: "51",
              scenarioName: scenario.name,
              status: "stopped",
              readingCount: 12,
              startedAt: "2026-08-08T10:00:00.000Z",
            },
          ],
        },
      };
    }
    if (url.endsWith("/runs/51")) {
      return {
        data: {
          run: {
            id: "51",
            scenarioName: scenario.name,
            startedByUserName: "Arta Berisha",
            startedAt: "2026-08-08T10:00:00.000Z",
            timeline: [
              {
                id: "101",
                sequenceNumber: 1,
                eventType: "started",
                occurredAt: "2026-08-08T10:00:00.000Z",
              },
            ],
          },
        },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWorkspace();
});

describe("SimulationsPage", () => {
  it("loads tenant scenarios, status, and real run history", async () => {
    render(<SimulationsPage />);

    expect((await screen.findAllByText(scenario.name)).length).toBeGreaterThan(0);
    expect(screen.getByText("12 lexime")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      "/api/simulator/laboratories/15/scenarios",
    );
    expect(api.get).toHaveBeenCalledWith(
      "/api/simulator/laboratories/15/runs?page=1&pageSize=20",
    );

    fireEvent.click(screen.getByText("12 lexime"));
    expect(await screen.findByText("Simulimi u nis")).toBeInTheDocument();
    expect(screen.getByText("Arta Berisha")).toBeInTheDocument();
  });

  it("previews validated configuration without claiming persistence", async () => {
    api.post.mockResolvedValueOnce({ data: { preview } });
    render(<SimulationsPage />);
    await screen.findAllByText(scenario.name);

    fireEvent.change(screen.getByLabelText("Intensiteti"), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Shiko preview" }));

    expect(await screen.findByText("23 °C")).toBeInTheDocument();
    expect(screen.getByText(/Nuk u ruajt në databazë/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      "/api/simulator/laboratories/15/preview",
      expect.objectContaining({
        scenarioId: "4",
        overrides: expect.objectContaining({ intensity: 1.5 }),
      }),
    );
  });

  it("starts the selected scenario through the protected endpoint", async () => {
    api.post.mockResolvedValueOnce({
      data: { message: "Simulimi u nis me sukses." },
    });
    render(<SimulationsPage />);
    await screen.findAllByText(scenario.name);
    fireEvent.click(screen.getByRole("button", { name: "Nis skenarin" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/api/simulator/laboratories/15/start",
        expect.objectContaining({
          scenarioId: "4",
          samplingIntervalSeconds: "60",
        }),
      ),
    );
  });
});
