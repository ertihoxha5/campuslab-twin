import { laboratoryRoom, userRoom } from "./create-realtime-server.js";

export const realtimeEvents = Object.freeze({
  SENSOR_READINGS: "sensor:readings",
  OCCUPANCY_UPDATED: "occupancy:updated",
  ENERGY_READINGS: "energy:readings",
  SIMULATION_UPDATED: "simulation:updated",
  DASHBOARD_REFRESH: "dashboard:refresh",
  ALERT_CREATED: "alert:created",
  ALERT_UPDATED: "alert:updated",
  NOTIFICATION_CREATED: "notification:created",
});

export function createRealtimePublisher() {
  let io = null;

  const emitToLaboratory = (reference, eventName, payload) => {
    if (!io) return false;
    io.to(laboratoryRoom(reference.universityId, reference.laboratoryId)).emit(
      eventName,
      payload,
    );
    return true;
  };

  return {
    attach(server) {
      io = server;
    },
    publishSimulationStep({
      universityId,
      laboratoryId,
      runId,
      readings,
      energyReadings,
      recordedAt,
      event,
    }) {
      const reference = { universityId, laboratoryId };
      const sensorPayloads = readings.map((reading) => ({
        laboratoryId: String(laboratoryId),
        sensorId: String(reading.sensorId),
        sensorType: reading.sensorType,
        value: reading.value,
        unit: reading.unit,
        recordedAt,
        source: "simulated",
        simulationRunId: String(runId),
      }));
      if (sensorPayloads.length > 0) {
        emitToLaboratory(reference, realtimeEvents.SENSOR_READINGS, {
          laboratoryId: String(laboratoryId),
          readings: sensorPayloads,
        });
      }
      const occupancyReadings = sensorPayloads.filter(
        (reading) => reading.sensorType === "occupancy",
      );
      if (occupancyReadings.length > 0) {
        emitToLaboratory(reference, realtimeEvents.OCCUPANCY_UPDATED, {
          laboratoryId: String(laboratoryId),
          value: occupancyReadings.reduce(
            (total, reading) => total + Number(reading.value ?? 0),
            0,
          ),
          recordedAt,
          source: "simulated",
        });
      }
      const energyPayloads = energyReadings.map((reading) => ({
        laboratoryId: String(laboratoryId),
        equipmentId: String(reading.equipmentId),
        powerWatts: reading.powerWatts,
        energyKwh: reading.energyKwh,
        recordedAt,
        source: "simulated",
        simulationRunId: String(runId),
      }));
      if (energyPayloads.length > 0) {
        emitToLaboratory(reference, realtimeEvents.ENERGY_READINGS, {
          laboratoryId: String(laboratoryId),
          readings: energyPayloads,
        });
      }
      emitToLaboratory(reference, realtimeEvents.SIMULATION_UPDATED, {
        laboratoryId: String(laboratoryId),
        simulationRunId: String(runId),
        recordedAt,
        event: event ?? null,
      });
      emitToLaboratory(reference, realtimeEvents.DASHBOARD_REFRESH, {
        laboratoryId: String(laboratoryId),
        recordedAt,
        reason: "simulation_reading",
      });
    },
    publishAlert({ universityId, laboratoryId, alert, recordedAt }) {
      const reference = { universityId, laboratoryId };
      emitToLaboratory(
        reference,
        alert.created
          ? realtimeEvents.ALERT_CREATED
          : realtimeEvents.ALERT_UPDATED,
        {
          id: alert.id,
          laboratoryId: String(laboratoryId),
          sensorId: alert.sensorId,
          equipmentId: alert.equipmentId,
          category: alert.category,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          status: alert.status ?? "new",
          source: alert.source,
          recordedAt,
        },
      );
      if (alert.created) {
        for (const userId of alert.recipientUserIds ?? []) {
          io?.to(userRoom(universityId, userId)).emit(
            realtimeEvents.NOTIFICATION_CREATED,
            {
              alertId: alert.id,
              type: `alert_${alert.severity}`,
              title: alert.title,
              message: alert.description,
              createdAt: recordedAt,
            },
          );
        }
      }
    },
  };
}
