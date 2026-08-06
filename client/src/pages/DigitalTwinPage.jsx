import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Focus,
  Info,
  LayoutGrid,
  Map,
  PersonStanding,
  RotateCcw,
  RadioTower,
  Cpu,
  Boxes,
  Waypoints,
  Users,
  BellRing,
} from "lucide-react";
import { api } from "@/api/client.js";
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { DigitalTwinCanvas } from "@/components/digital-twin/DigitalTwinCanvas.jsx";
import { SensorMarkers } from "@/components/digital-twin/SensorMarkers.jsx";
import { EquipmentMarkers } from "@/components/digital-twin/EquipmentMarkers.jsx";
import {
  DataFlowLines,
  ZoneOverlays,
} from "@/components/digital-twin/ZoneAndDataFlow.jsx";
import { OccupancyFigures } from "@/components/digital-twin/OccupancyFigures.jsx";
import { occupancyRepresentation } from "@/components/digital-twin/occupancy.js";
import { AlertIndicators } from "@/components/digital-twin/AlertIndicators.jsx";
import { resolveAlertTarget } from "@/components/digital-twin/alert-target.js";

export function DigitalTwinPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [laboratoryDetail, setLaboratoryDetail] = useState(null);
  const [modelState, setModelState] = useState("fallback");
  const [cameraMode, setCameraMode] = useState("overview");
  const [firstPersonReset, setFirstPersonReset] = useState(0);
  const [sensors, setSensors] = useState([]);
  const [sensorReadings, setSensorReadings] = useState({});
  const [discoverSensors, setDiscoverSensors] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [zones, setZones] = useState([]);
  const [equipmentEnergy, setEquipmentEnergy] = useState({});
  const [equipmentAlerts, setEquipmentAlerts] = useState([]);
  const [showEquipment, setShowEquipment] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [occupancySnapshot, setOccupancySnapshot] = useState(0);
  const [showZones, setShowZones] = useState(false);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [focusTarget, setFocusTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/api/laboratories?page=1&pageSize=100&status=active")
      .then((response) => {
        const options = response.data.laboratories ?? [];
        setLaboratories(options);
        setLaboratoryId(String(options[0]?.id ?? ""));
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!laboratoryId) {
      setLaboratoryDetail(null);
      return;
    }
    let active = true;
    setCameraMode("overview");
    setModelState("loading");
    api
      .get(`/api/laboratories/${laboratoryId}`)
      .then((response) => {
        if (!active) return;
        const detail = response.data.laboratory;
        setLaboratoryDetail(detail);
        setModelState(
          detail.modelMimeType?.startsWith("model/") ? "loading" : "fallback",
        );
      })
      .catch((error) => {
        if (!active) return;
        setLaboratoryDetail(null);
        setModelState("fallback");
        setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [laboratoryId]);

  useEffect(() => {
    if (!laboratoryId) return undefined;
    let active = true;
    setSensors([]);
    setSensorReadings({});
    setSelectedSensor(null);
    setSelectedEquipment(null);
    setEquipmentEnergy({});
    setOccupancySnapshot(0);
    Promise.all([
      api.get(
        `/api/sensors?laboratoryId=${laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`,
      ),
      api.get(`/api/dashboard/summary?laboratoryId=${laboratoryId}&hours=24`),
      api.get(
        `/api/equipment?laboratoryId=${laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`,
      ),
      api.get(`/api/laboratories/${laboratoryId}/zones`),
      api.get(`/api/alerts?laboratoryId=${laboratoryId}&page=1&pageSize=100`),
    ])
      .then(([
        sensorResponse,
        dashboardResponse,
        equipmentResponse,
        zonesResponse,
        alertsResponse,
      ]) => {
        if (!active) return;
        setSensors(sensorResponse.data.sensors ?? []);
        setEquipment(equipmentResponse.data.equipment ?? []);
        setZones(zonesResponse.data.zones ?? []);
        setEquipmentAlerts(alertsResponse.data.alerts ?? []);
        setOccupancySnapshot(
          Number(dashboardResponse.data.summary.metrics?.currentOccupancy ?? 0),
        );
        setSensorReadings(
          Object.fromEntries(
            (dashboardResponse.data.summary.latestSensorReadings ?? []).map(
              (reading) => [String(reading.sensorId), reading],
            ),
          ),
        );
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });

    const disconnect = connectMonitoringRealtime({
      laboratoryId,
      onEvent(eventName, payload) {
        if (eventName === "sensor:reading") {
          setSensorReadings((current) => ({
            ...current,
            [String(payload.sensorId)]: payload,
          }));
        } else if (eventName === "energy:reading") {
          setEquipmentEnergy((current) => ({
            ...current,
            [String(payload.equipmentId)]: payload,
          }));
        } else if (["alert:created", "alert:updated"].includes(eventName)) {
          setEquipmentAlerts((current) => [
            payload,
            ...current.filter((alert) => String(alert.id) !== String(payload.id)),
          ]);
        } else if (eventName === "equipment:updated") {
          setEquipment((current) =>
            current.map((item) =>
              String(item.id) === String(payload.id)
                ? { ...item, ...payload }
                : item,
            ),
          );
        }
      },
    });
    return () => {
      active = false;
      disconnect();
    };
  }, [laboratoryId]);

  const selectedLaboratory = laboratories.find(
    (laboratory) => String(laboratory.id) === laboratoryId,
  );
  const modelUrl = laboratoryDetail?.modelMimeType?.startsWith("model/")
    ? `/api/laboratories/${laboratoryId}/model?v=${laboratoryDetail.modelFileId}`
    : undefined;
  const currentOccupancy = useMemo(
    () => {
      const occupancySensors = sensors
        .filter((sensor) => sensor.sensorType === "occupancy")
        .filter((sensor) => sensorReadings[String(sensor.id)] != null);
      if (occupancySensors.length === 0) return occupancySnapshot;
      return occupancySensors.reduce(
          (total, sensor) =>
            total + Number(sensorReadings[String(sensor.id)]?.value ?? 0),
          0,
        );
    },
    [occupancySnapshot, sensorReadings, sensors],
  );
  const occupancyInfo = occupancyRepresentation(currentOccupancy);
  const activeAlerts = useMemo(
    () =>
      equipmentAlerts.filter(
        (alert) => !["resolved", "closed"].includes(alert.status),
      ),
    [equipmentAlerts],
  );

  function focusAlert(alert) {
    setFocusTarget(resolveAlertTarget(alert, sensors, equipment, zones));
    setCameraMode("focus");
    const sensor = sensors.find(
      (item) => String(item.id) === String(alert.sensorId),
    );
    const item = equipment.find(
      (candidate) => String(candidate.id) === String(alert.equipmentId),
    );
    setSelectedSensor(sensor ?? null);
    setSelectedEquipment(sensor ? null : (item ?? null));
  }

  return (
    <section className="workspace-overview digital-twin-page">
      <div className="workspace-page-heading">
        <p className="eyebrow">Laboratori virtual</p>
        <h1>Digital Twin 3D</h1>
        <p>Eksploro vetëm laboratorët ku ke qasje.</p>
      </div>

      <div className="digital-twin-toolbar">
        <label>
          <span>Laboratori</span>
          <select
            value={laboratoryId}
            onChange={(event) => setLaboratoryId(event.target.value)}
            disabled={loading}
          >
            {laboratories.length === 0 && (
              <option value="">Nuk ka laborator aktiv</option>
            )}
            {laboratories.map((laboratory) => (
              <option key={laboratory.id} value={laboratory.id}>
                {laboratory.name} ({laboratory.code})
              </option>
            ))}
          </select>
        </label>
        {selectedLaboratory && (
          <div className="digital-twin-laboratory-name">
            <Box size={18} />
            <strong>{selectedLaboratory.name}</strong>
          </div>
        )}
      </div>

      {message && (
        <div className="dashboard-error" role="alert">
          <strong>Laboratorët nuk mund të ngarkohen</strong>
          <p>{message}</p>
        </div>
      )}

      {laboratoryId ? (
        <div className="digital-twin-stage">
          <div className="digital-twin-camera-controls" aria-label="Mënyra e kamerës">
            <button
              type="button"
              className={cameraMode === "overview" ? "active" : ""}
              onClick={() => setCameraMode("overview")}
              aria-pressed={cameraMode === "overview"}
            >
              <LayoutGrid size={15} /> Përgjithshme
            </button>
            <button
              type="button"
              className={cameraMode === "top" ? "active" : ""}
              onClick={() => setCameraMode("top")}
              aria-pressed={cameraMode === "top"}
            >
              <Map size={15} /> Nga lart
            </button>
            <button
              type="button"
              className={cameraMode === "focus" ? "active" : ""}
              onClick={() => setCameraMode("focus")}
              aria-pressed={cameraMode === "focus"}
            >
              <Focus size={15} /> Fokus
            </button>
            <button
              type="button"
              className={cameraMode === "firstPerson" ? "active" : ""}
              onClick={() => setCameraMode("firstPerson")}
              aria-pressed={cameraMode === "firstPerson"}
            >
              <PersonStanding size={15} /> Ecje
            </button>
            {cameraMode === "firstPerson" && (
              <button
                type="button"
                onClick={() => setFirstPersonReset((value) => value + 1)}
                aria-label="Rikthe pozicionin first-person"
              >
                <RotateCcw size={15} /> Reset
              </button>
            )}
          </div>
          <button
            type="button"
            className={`digital-twin-discovery-toggle ${discoverSensors ? "active" : ""}`}
            onClick={() => setDiscoverSensors((value) => !value)}
            aria-pressed={discoverSensors}
          >
            <RadioTower size={16} />
            {discoverSensors ? "Fshih sensorët" : "Zbulo sensorët"}
          </button>
          <div className="digital-twin-layer-controls" aria-label="Shtresat e Digital Twin">
            <button
              type="button"
              className={showZones ? "active" : ""}
              onClick={() => setShowZones((value) => !value)}
              aria-pressed={showZones}
            >
              <Boxes size={15} /> Zonat
            </button>
            <button
              type="button"
              className={showDataFlow ? "active" : ""}
              onClick={() => setShowDataFlow((value) => !value)}
              aria-pressed={showDataFlow}
            >
              <Waypoints size={15} /> Rrjedha e të dhënave
            </button>
          </div>
          <button
            type="button"
            className={`digital-twin-equipment-toggle ${showEquipment ? "active" : ""}`}
            onClick={() => setShowEquipment((value) => !value)}
            aria-pressed={showEquipment}
          >
            <Cpu size={16} />
            {showEquipment ? "Fshih pajisjet" : "Shfaq pajisjet"}
          </button>
          <DigitalTwinCanvas
            key={`${laboratoryId}:${laboratoryDetail?.modelFileId ?? "default"}`}
            modelUrl={modelUrl}
            cameraMode={cameraMode}
            firstPersonReset={firstPersonReset}
            focusTarget={focusTarget}
            onModelLoaded={() => setModelState("loaded")}
            onModelError={() => setModelState("failed")}
          >
            <SensorMarkers
              sensors={sensors}
              readings={sensorReadings}
              visible={discoverSensors}
              onSelect={(sensor) => {
                setSelectedSensor(sensor);
                setSelectedEquipment(null);
              }}
            />
            <EquipmentMarkers
              equipment={equipment}
              zones={zones}
              visible={showEquipment}
              onSelect={(item) => {
                setSelectedEquipment(item);
                setSelectedSensor(null);
              }}
            />
            <ZoneOverlays zones={zones} visible={showZones} />
            <DataFlowLines
              sensors={sensors}
              equipment={equipment}
              zones={zones}
              visible={showDataFlow}
            />
            <OccupancyFigures occupancy={currentOccupancy} />
            {showAlerts && (
              <AlertIndicators
                alerts={activeAlerts}
                sensors={sensors}
                equipment={equipment}
                zones={zones}
                onFocus={focusAlert}
              />
            )}
          </DigitalTwinCanvas>
          <div className={`digital-twin-model-state ${modelState}`} role="status">
            {modelState === "loaded"
              ? `Modeli: ${laboratoryDetail.modelOriginalName}`
              : modelState === "loading"
                ? "Po ngarkohet modeli 3D…"
                : modelState === "failed"
                  ? "Modeli nuk u hap; po përdoret skena bazë."
                  : laboratoryDetail?.modelMimeType?.startsWith("image/")
                    ? "Është ngarkuar një foto; po përdoret skena bazë 3D."
                    : "Po përdoret skena bazë 3D."}
          </div>
          <div className="digital-twin-help">
            <Info size={17} />
            <p>
              {cameraMode === "firstPerson"
                ? "Kliko pamjen, shiko me maus dhe lëviz me W, A, S, D. Shtyp Esc për të liruar mausin."
                : "Rrotullo me zvarritje, afrohu me scroll dhe lëviz pamjen me butonin e djathtë."}
            </p>
          </div>
          <div className="digital-twin-occupancy" role="status">
            <Users size={16} />
            <div>
              <strong>{occupancyInfo.total} persona</strong>
              <span>
                {occupancyInfo.aggregated
                  ? `${occupancyInfo.visible} figura · deri ${occupancyInfo.peoplePerFigure} persona për figurë`
                  : `${occupancyInfo.visible} figura në skenë`}
              </span>
            </div>
          </div>
          <div className="digital-twin-alerts-panel">
            <button
              type="button"
              onClick={() => setShowAlerts((value) => !value)}
              aria-expanded={showAlerts}
            >
              <BellRing size={16} /> {activeAlerts.length} alarme aktive
            </button>
            {showAlerts && activeAlerts.length > 0 && (
              <div>
                {activeAlerts.slice(0, 5).map((alert) => (
                  <article key={alert.id} className={alert.severity}>
                    <span>{alert.severity}</span>
                    <strong>{alert.title}</strong>
                    <button type="button" onClick={() => focusAlert(alert)}>
                      Fokuso
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
          {selectedSensor && (
            <aside className="digital-twin-sensor-detail">
              <button type="button" onClick={() => setSelectedSensor(null)} aria-label="Mbyll sensorin">×</button>
              <span>{selectedSensor.sensorType}</span>
              <strong>{selectedSensor.name}</strong>
              <p>
                {sensorReadings[String(selectedSensor.id)]
                  ? `${Number(sensorReadings[String(selectedSensor.id)].value).toLocaleString("sq-AL")} ${sensorReadings[String(selectedSensor.id)].unit ?? selectedSensor.unit}`
                  : "Në pritje të leximit të parë"}
              </p>
              <small>Statusi: {selectedSensor.status}</small>
            </aside>
          )}
          {selectedEquipment && (
            <aside className="digital-twin-equipment-detail">
              <button type="button" onClick={() => setSelectedEquipment(null)} aria-label="Mbyll pajisjen">×</button>
              <span>{selectedEquipment.type}</span>
              <strong>{selectedEquipment.name}</strong>
              <dl>
                <div><dt>Statusi</dt><dd>{selectedEquipment.status}</dd></div>
                <div><dt>Shëndeti</dt><dd>{Number(selectedEquipment.healthScore).toLocaleString("sq-AL")}%</dd></div>
                <div><dt>Fuqia nominale</dt><dd>{selectedEquipment.energyRatingWatts == null ? "—" : `${Number(selectedEquipment.energyRatingWatts).toLocaleString("sq-AL")} W`}</dd></div>
                <div><dt>Fuqia live</dt><dd>{equipmentEnergy[String(selectedEquipment.id)] ? `${Number(equipmentEnergy[String(selectedEquipment.id)].powerWatts).toLocaleString("sq-AL")} W` : "Në pritje"}</dd></div>
                <div><dt>Sensorë të lidhur</dt><dd>{sensors.filter((sensor) => String(sensor.equipmentId) === String(selectedEquipment.id)).length}</dd></div>
                <div><dt>Alarme aktive</dt><dd>{equipmentAlerts.filter((alert) => String(alert.equipmentId) === String(selectedEquipment.id) && !["resolved", "closed"].includes(alert.status)).length}</dd></div>
              </dl>
              {selectedEquipment.object3dReference && <small>Objekti 3D: {selectedEquipment.object3dReference}</small>}
            </aside>
          )}
        </div>
      ) : !loading && !message ? (
        <div className="workspace-empty-state">
          <Box size={26} />
          <h2>Nuk ka laborator për t’u paraqitur</h2>
          <p>Krijo ose aktivizo një laborator për të hapur pamjen 3D.</p>
        </div>
      ) : null}
    </section>
  );
}
