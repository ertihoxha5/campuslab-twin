import { io } from "socket.io-client";

const realtimeUrl = (import.meta.env.VITE_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

const realtimeOptions = {
  withCredentials: true,
  transports: ["polling", "websocket"],
  upgrade: true,
  timeout: 8_000,
  reconnection: true,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
  randomizationFactor: .35,
};

export const DASHBOARD_REALTIME_EVENTS = [
  "dashboard:refresh",
  "sensor:readings",
  "sensor:reading",
  "equipment:updated",
  "alert:created",
  "alert:updated",
  "maintenance:updated",
  "energy:readings",
  "energy:reading",
  "occupancy:updated",
  "simulation:updated",
  "notification:created",
  "twin:asset-created",
  "twin:asset-updated",
  "twin:asset-deleted",
  "twin:message-created",
];

export function connectDashboardRealtime({
  laboratoryId,
  onOperationalChange,
  onConnectionChange,
}) {
  const socket = io(realtimeUrl || undefined, realtimeOptions);

  const joinSelectedLaboratory = () => {
    if (laboratoryId) {
      socket.emit("laboratory:join", { laboratoryId });
    }
  };

  socket.on("connect", () => {
    onConnectionChange?.("connected");
    joinSelectedLaboratory();
  });
  socket.on("disconnect", () => onConnectionChange?.("disconnected"));
  socket.on("connect_error", () => onConnectionChange?.("disconnected"));

  for (const eventName of DASHBOARD_REALTIME_EVENTS) {
    socket.on(eventName, onOperationalChange);
  }

  return () => {
    if (laboratoryId && socket.connected) {
      socket.emit("laboratory:leave", { laboratoryId });
    }
    socket.disconnect();
  };
}

export function connectMonitoringRealtime({
  laboratoryId,
  onEvent,
  onConnectionChange,
}) {
  const socket = io(realtimeUrl || undefined, realtimeOptions);

  socket.on("connect", () => {
    onConnectionChange?.("connected");
    socket.emit("laboratory:join", { laboratoryId });
  });
  socket.on("disconnect", () => onConnectionChange?.("disconnected"));
  socket.on("connect_error", () => onConnectionChange?.("disconnected"));
  for (const eventName of DASHBOARD_REALTIME_EVENTS) {
    socket.on(eventName, (payload) => {
      if (eventName === "sensor:readings") {
        for (const reading of payload?.readings ?? []) {
          onEvent?.("sensor:reading", reading);
        }
        return;
      }
      if (eventName === "energy:readings") {
        for (const reading of payload?.readings ?? []) {
          onEvent?.("energy:reading", reading);
        }
        return;
      }
      onEvent?.(eventName, payload);
    });
  }

  return () => {
    if (socket.connected) socket.emit("laboratory:leave", { laboratoryId });
    socket.disconnect();
  };
}
