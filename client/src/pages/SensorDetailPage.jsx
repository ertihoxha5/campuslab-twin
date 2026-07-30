import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowLeft,
  Box,
  CalendarClock,
  Clock3,
  Crosshair,
  Gauge,
  Pencil,
  RadioTower,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { SensorForm } from "@/components/SensorForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { sensorTypes } from "@/validation/sensor.js";

const statusLabels = {
  online: "Online",
  offline: "Offline",
  calibration: "Në kalibrim",
  inactive: "Joaktiv",
};

const emptyOptions = { laboratories: [], zones: [], equipment: [] };

export function SensorDetailPage() {
  const { sensorId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("assets.manage");
  const [sensor, setSensor] = useState(null);
  const [options, setOptions] = useState(emptyOptions);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.get(`/api/sensors/${sensorId}`);
      setSensor(response.data.sensor);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [sensorId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const loadOptions = useCallback(async (laboratoryId = "") => {
    setLoadingOptions(true);
    try {
      const suffix = laboratoryId
        ? `?laboratoryId=${encodeURIComponent(laboratoryId)}`
        : "";
      const response = await api.get(`/api/sensors/options${suffix}`);
      setOptions(response.data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  async function updateSensor(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.put(`/api/sensors/${sensorId}`, values);
      setSensor((current) => ({
        ...current,
        ...response.data.sensor,
        laboratoryName:
          options.laboratories.find(
            (item) =>
              String(item.id) === String(response.data.sensor.laboratoryId),
          )?.name ?? current.laboratoryName,
        zoneName:
          options.zones.find(
            (item) => String(item.id) === String(response.data.sensor.zoneId),
          )?.name ?? null,
        equipmentName:
          options.equipment.find(
            (item) =>
              String(item.id) === String(response.data.sensor.equipmentId),
          )?.name ?? null,
      }));
      setEditing(false);
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function archiveSensor() {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.delete(`/api/sensors/${sensorId}`);
      navigate("/aplikacioni/sensoret", {
        replace: true,
        state: { message: "Sensori u arkivua me sukses." },
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setConfirmArchive(false);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="workspace-loading">Po ngarkohen detajet e sensorit…</p>
    );
  }

  if (!sensor) {
    return (
      <section className="sensor-detail-page">
        <Link className="workspace-back-link" to="/aplikacioni/sensoret">
          <ArrowLeft size={17} /> Kthehu te sensorët
        </Link>
        <p className="form-message error" role="alert">
          {message.text || "Sensori nuk u gjet."}
        </p>
      </section>
    );
  }

  const type = sensorTypes[sensor.sensorType];

  return (
    <section className="sensor-detail-page">
      <Link className="workspace-back-link" to="/aplikacioni/sensoret">
        <ArrowLeft size={17} /> Kthehu te sensorët
      </Link>

      <div className="equipment-detail-heading">
        <div>
          <p className="eyebrow">Sensor laboratorik · {sensor.code}</p>
          <h1>{sensor.name}</h1>
          <p>
            {type?.label} · {sensor.unit}
          </p>
        </div>
        <div className="laboratories-heading-actions">
          <span className={`status-badge status-${sensor.status}`}>
            {statusLabels[sensor.status]}
          </span>
          {canManage && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(true);
                  setMessage({ type: "", text: "" });
                }}
              >
                <Pencil size={16} /> Ndrysho
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmArchive(true)}
              >
                <Archive size={16} /> Arkivo
              </Button>
            </>
          )}
        </div>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <div className="equipment-metrics">
        <Metric icon={Box} label="Laboratori" value={sensor.laboratoryName} />
        <Metric icon={Crosshair} label="Zona" value={sensor.zoneName} />
        <Metric icon={Activity} label="Pajisja" value={sensor.equipmentName} />
        <Metric
          icon={Clock3}
          label="Mostrimi"
          value={`${sensor.samplingIntervalSeconds} sekonda`}
        />
      </div>

      <div className="equipment-detail-grid sensor-detail-grid">
        <DetailPanel title="Pragjet e matjes" icon={Gauge}>
          <Detail
            label="Minimumi paralajmërues"
            value={measurement(sensor.warningMin, sensor.unit)}
          />
          <Detail
            label="Maksimumi paralajmërues"
            value={measurement(sensor.warningMax, sensor.unit)}
          />
          <Detail
            label="Minimumi kritik"
            value={measurement(sensor.criticalMin, sensor.unit)}
          />
          <Detail
            label="Maksimumi kritik"
            value={measurement(sensor.criticalMax, sensor.unit)}
          />
        </DetailPanel>
        <DetailPanel title="Kalibrimi" icon={CalendarClock}>
          <Detail
            label="Kalibrimi i fundit"
            value={formatDateTime(sensor.calibratedAt)}
          />
          <Detail
            label="Kalibrimi i ardhshëm"
            value={formatDateTime(sensor.calibrationDueAt)}
          />
        </DetailPanel>
        <DetailPanel title="Pozicioni 3D" icon={Crosshair}>
          <Detail label="Boshti X" value={coordinate(sensor.positionX)} />
          <Detail label="Boshti Y" value={coordinate(sensor.positionY)} />
          <Detail label="Boshti Z" value={coordinate(sensor.positionZ)} />
        </DetailPanel>
        <DetailPanel title="Rotacioni 3D" icon={RadioTower}>
          <Detail label="Boshti X" value={rotation(sensor.rotationX)} />
          <Detail label="Boshti Y" value={rotation(sensor.rotationY)} />
          <Detail label="Boshti Z" value={rotation(sensor.rotationZ)} />
        </DetailPanel>
      </div>

      {editing && (
        <div className="workspace-modal-backdrop">
          <section
            className="workspace-modal sensor-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sensor-edit-title"
          >
            <header>
              <div>
                <span>Sensori {sensor.code}</span>
                <h2 id="sensor-edit-title">Ndrysho sensorin</h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll formularin"
                onClick={() => setEditing(false)}
              >
                <X size={20} />
              </button>
            </header>
            <SensorForm
              initialValues={sensor}
              submitLabel="Ruaj ndryshimet"
              options={options}
              loadingOptions={loadingOptions}
              saving={saving}
              onLaboratoryChange={loadOptions}
              onSubmit={updateSensor}
              onCancel={() => setEditing(false)}
            />
          </section>
        </div>
      )}

      {confirmArchive && (
        <div className="workspace-modal-backdrop">
          <section
            className="workspace-modal archive-confirmation equipment-archive-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-sensor-title"
          >
            <RadioTower size={28} />
            <h2 id="archive-sensor-title">Arkivo sensorin?</h2>
            <p>
              {sensor.name} do të largohet nga listat aktive. Leximet historike
              nuk do të fshihen.
            </p>
            <footer>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmArchive(false)}
                disabled={saving}
              >
                Anulo
              </Button>
              <Button type="button" onClick={archiveSensor} disabled={saving}>
                {saving ? "Po arkivohet…" : "Arkivo sensorin"}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article>
      <Icon size={19} />
      <div>
        <span>{label}</span>
        <strong>{value || "E pacaktuar"}</strong>
      </div>
    </article>
  );
}

function DetailPanel({ title, icon: Icon, children }) {
  return (
    <article className="equipment-detail-panel">
      <h2>
        <Icon size={19} /> {title}
      </h2>
      <dl>{children}</dl>
    </article>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "E pacaktuar"}</dd>
    </div>
  );
}

function measurement(value, unit) {
  return value == null
    ? null
    : `${Number(value).toLocaleString("sq-AL")} ${unit}`;
}

function coordinate(value) {
  return `${Number(value).toLocaleString("sq-AL")} m`;
}

function rotation(value) {
  return `${Number(value).toLocaleString("sq-AL")}°`;
}

function formatDateTime(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
