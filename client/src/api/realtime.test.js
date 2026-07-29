import { beforeEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import {
  connectDashboardRealtime,
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
