import { io } from "socket.io-client";

const realtimeUrl = (import.meta.env.VITE_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

export const DASHBOARD_REALTIME_EVENTS = [
  "dashboard:refresh",
  "sensor:reading",
  "equipment:updated",
  "alert:created",
  "alert:updated",
  "maintenance:updated",
  "energy:reading",
  "occupancy:updated",
  "simulation:updated",
  "notification:created",
];

export function connectDashboardRealtime({
  laboratoryId,
  onOperationalChange,
  onConnectionChange,
}) {
  const socket = io(realtimeUrl || undefined, {
    withCredentials: true,
    transports: ["websocket"],
  });

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
