import { beforeEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import {
  connectDashboardRealtime,
  connectMonitoringRealtime,
  DASHBOARD_REALTIME_EVENTS,
} from "./realtime.js";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

const createSocket = () => ({
  connected: true,
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
});

describe("connectMonitoringRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with HTTP polling and upgrades to WebSocket when available", () => {
    io.mockReturnValue(createSocket());
    connectMonitoringRealtime({ laboratoryId: "15", onEvent: vi.fn() });
    expect(io).toHaveBeenCalledWith(undefined, expect.objectContaining({
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnectionDelayMax: 10_000,
    }));
  });

  it("forwards the event name and payload for the selected laboratory", () => {
    const socket = createSocket();
    io.mockReturnValue(socket);
    const onEvent = vi.fn();

    const disconnect = connectMonitoringRealtime({
      laboratoryId: "15",
      onEvent,
      onConnectionChange: vi.fn(),
    });
    const connectHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "connect",
    )[1];
    const readingHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "sensor:reading",
    )[1];
    connectHandler();
    readingHandler({ sensorId: "4", value: 22.5 });

    expect(socket.emit).toHaveBeenCalledWith("laboratory:join", {
      laboratoryId: "15",
    });
    expect(onEvent).toHaveBeenCalledWith("sensor:reading", {
      sensorId: "4",
      value: 22.5,
    });
    disconnect();
  });

  it("normalizes batched readings for existing page consumers", () => {
    const socket = createSocket();
    io.mockReturnValue(socket);
    const onEvent = vi.fn();

    connectMonitoringRealtime({ laboratoryId: "15", onEvent });
    const sensorBatchHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "sensor:readings",
    )[1];
    const energyBatchHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "energy:readings",
    )[1];

    sensorBatchHandler({
      readings: [
        { sensorId: "4", value: 22.5 },
        { sensorId: "5", value: 45 },
      ],
    });
    energyBatchHandler({
      readings: [{ equipmentId: "9", powerWatts: 1200 }],
    });

    expect(onEvent).toHaveBeenNthCalledWith(1, "sensor:reading", {
      sensorId: "4",
      value: 22.5,
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, "sensor:reading", {
      sensorId: "5",
      value: 45,
    });
    expect(onEvent).toHaveBeenNthCalledWith(3, "energy:reading", {
      equipmentId: "9",
      powerWatts: 1200,
    });
  });
});

describe("connectDashboardRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to operational events and joins the selected laboratory", () => {
    const socket = createSocket();
    io.mockReturnValue(socket);
    const onOperationalChange = vi.fn();
    const onConnectionChange = vi.fn();

    const disconnect = connectDashboardRealtime({
      laboratoryId: "3",
      onOperationalChange,
      onConnectionChange,
    });

    for (const eventName of DASHBOARD_REALTIME_EVENTS) {
      expect(socket.on).toHaveBeenCalledWith(eventName, onOperationalChange);
    }

    const connectHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "connect",
    )[1];
    connectHandler();

    expect(onConnectionChange).toHaveBeenCalledWith("connected");
    expect(socket.emit).toHaveBeenCalledWith("laboratory:join", {
      laboratoryId: "3",
    });

    disconnect();
    expect(socket.emit).toHaveBeenCalledWith("laboratory:leave", {
      laboratoryId: "3",
    });
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });

  it("reports connection loss without joining a laboratory", () => {
    const socket = createSocket();
    io.mockReturnValue(socket);
    const onConnectionChange = vi.fn();

    connectDashboardRealtime({
      laboratoryId: "",
      onOperationalChange: vi.fn(),
      onConnectionChange,
    });

    const errorHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "connect_error",
    )[1];
    errorHandler();

    expect(onConnectionChange).toHaveBeenCalledWith("disconnected");
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
