import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { ThesisFunctionalTests } from "./ThesisFunctionalTests.jsx";

vi.mock("@/api/client.js", () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const result = {
  id: "1", scenario: "high_temperature", scenarioName: "Temperatura e lartë",
  input: { temperature: 29 }, expectedResult: "Alarm paralajmërues",
  actualResult: "Alarm kritik", expectedLevel: "Warning", actualLevel: "Critical",
  status: "FAIL", runId: "25", alertId: "8",
};

beforeEach(() => { vi.clearAllMocks(); });

describe("ThesisFunctionalTests", () => {
  it("shows the stored actual level and FAIL rather than assuming success", async () => {
    api.get.mockResolvedValue({ data: { batchId: "batch-1", results: [result],
      summary: { passed: 0, failed: 1, total: 1, allPassed: false } } });
    render(<ThesisFunctionalTests laboratoryId="5" />);
    expect(await screen.findByText("Alarm kritik")).toBeInTheDocument();
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(screen.getByText("0 / 1 PASS")).toBeInTheDocument();
  });

  it("executes the protected batch endpoint and displays its returned result", async () => {
    api.get.mockResolvedValue({ data: { batchId: null, results: [], summary: { passed: 0, failed: 0, total: 0 } } });
    api.post.mockResolvedValue({ data: { batchId: "batch-2", results: [{ ...result,
      actualResult: "Alarm paralajmërues", actualLevel: "Warning", status: "PASS" }],
      summary: { passed: 1, failed: 0, total: 1, allPassed: false } } });
    render(<ThesisFunctionalTests laboratoryId="5" />);
    fireEvent.click(await screen.findByRole("button", { name: "Ekzekuto 6 skenarët" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/api/simulator/laboratories/5/thesis-functional/run", {},
    ));
    expect(await screen.findByText("PASS")).toBeInTheDocument();
  });
});
