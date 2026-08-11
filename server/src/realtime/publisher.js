import { laboratoryRoom, userRoom } from "./create-realtime-server.js";

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
        emitToLaboratory(reference, "sensor:readings", {
          laboratoryId: String(laboratoryId),
          readings: sensorPayloads,
        });
      }
      const occupancyReadings = sensorPayloads.filter(
        (reading) => reading.sensorType === "occupancy",
      );
      if (occupancyReadings.length > 0) {
        emitToLaboratory(reference, "occupancy:updated", {
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
        emitToLaboratory(reference, "energy:readings", {
          laboratoryId: String(laboratoryId),
          readings: energyPayloads,
        });
      }
      emitToLaboratory(reference, "simulation:updated", {
        laboratoryId: String(laboratoryId),
        simulationRunId: String(runId),
        recordedAt,
        event: event ?? null,
      });
      emitToLaboratory(reference, "dashboard:refresh", {
        laboratoryId: String(laboratoryId),
        recordedAt,
        reason: "simulation_reading",
      });
    },
    publishAlert({ universityId, laboratoryId, alert, recordedAt }) {
      const reference = { universityId, laboratoryId };
      emitToLaboratory(
        reference,
        alert.created ? "alert:created" : "alert:updated",
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
          io?.to(userRoom(universityId, userId)).emit("notification:created", {
            alertId: alert.id,
            type: `alert_${alert.severity}`,
            title: alert.title,
            message: alert.description,
            createdAt: recordedAt,
          });
        }
      }
    },
  };
}
