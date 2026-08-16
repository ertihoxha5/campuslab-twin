import { useEffect, useMemo, useState } from "react";
import { SENSOR_DEFINITIONS, STATIC_ASSETS } from "./twin-config.js";
import { scheduledOccupancy } from "./occupancy.js";

const historyPoint = (value, at = new Date()) => ({ value: Number(value), at: at.toISOString() });

export function useTwinSimulation({ apiEquipment = [], apiSensors = [], apiReadings = {}, apiEnergy = {}, alerts = [] }) {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [histories, setHistories] = useState({});
  useEffect(() => {
    const timer = window.setInterval(() => { setTick((value) => value + 1); setNow(new Date()); }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const occupancy = scheduledOccupancy(now, 12);
  const sensors = useMemo(() => SENSOR_DEFINITIONS.map((definition, index) => {
    const apiSensor = apiSensors.find((item) => item.sensorType === definition.type || String(item.id) === definition.id);
    const apiReading = apiSensor ? apiReadings[String(apiSensor.id)] : null;
    const wave = Math.sin(tick * 0.63 + index * 1.7);
    let value = definition.base + wave * (definition.type === "energy" ? 95 : definition.type === "temperature" ? 0.7 : definition.type === "humidity" ? 2.2 : 0);
    if (definition.type === "occupancy") value = occupancy;
    if (apiReading?.value != null) value = Number(apiReading.value);
    const offline = tick % 61 === 45 && definition.id === "STATUS-RACK";
    const warning = (definition.type === "temperature" && value > 27) || (definition.type === "smoke" && value > 3);
    return { ...definition, apiId: apiSensor?.id, value: Number(value.toFixed(1)), state: offline ? "offline" : warning ? "warning" : "normal", lastUpdate: now.toISOString() };
  }), [apiReadings, apiSensors, now, occupancy, tick]);

  const assets = useMemo(() => STATIC_ASSETS.map((definition, index) => {
    const apiAsset = apiEquipment.find((item) => String(item.id) === definition.id || item.type === definition.type);
    const energyReading = apiAsset ? apiEnergy[String(apiAsset.id)] : null;
    const linkedSensor = sensors.find((sensor) => sensor.assetId === definition.id);
    const activeAlert = alerts.find((alert) => String(alert.equipmentId) === String(apiAsset?.id) && !["resolved", "closed"].includes(alert.status));
    const energyWatts = Number(energyReading?.powerWatts ?? definition.energyWatts * (0.92 + Math.sin(tick * .4 + index) * .06));
    const temperature = linkedSensor?.type === "temperature" ? linkedSensor.value : 22.1 + ((index * 7 + tick) % 13) / 10;
    const status = activeAlert ? "alarm" : apiAsset?.status === "fault" ? "alarm" : apiAsset?.status === "maintenance" ? "maintenance" : "operational";
    return { ...definition, apiId: apiAsset?.id, status, energyWatts: Math.max(0, energyWatts), temperature, maintenance: status === "maintenance" ? "Në proces" : Number(apiAsset?.healthScore ?? 94) < 70 ? "Kërkohet" : "Në rregull", sensorIds: sensors.filter((sensor) => sensor.assetId === definition.id).map((sensor) => sensor.id), lastUpdate: now.toISOString(), alert: activeAlert ?? null };
  }), [alerts, apiEnergy, apiEquipment, now, sensors, tick]);

  useEffect(() => {
    setHistories((current) => {
      const next = { ...current };
      [...sensors, ...assets].forEach((item) => {
        const value = item.value ?? item.energyWatts ?? 0;
        next[item.id] = [...(next[item.id] ?? []), historyPoint(value, now)].slice(-18);
      });
      return next;
    });
  }, [assets, now, sensors]);

  return { now, occupancy, sensors, assets, histories };
}
