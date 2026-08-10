import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowLeft,
  Box,
  CalendarDays,
  Cpu,
  MapPin,
  Pencil,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/api/client.js";
import { EquipmentForm } from "@/components/EquipmentForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog.js";

const statusLabels = {
  active: "Aktive",
  inactive: "Joaktive",
  fault: "Me defekt",
  maintenance: "Në mirëmbajtje",
};

const emptyOptions = { laboratories: [], zones: [], users: [] };

export function EquipmentDetailPage() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("assets.manage");
  const [equipment, setEquipment] = useState(null);
  const [options, setOptions] = useState(emptyOptions);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const closeEditor = useCallback(() => setEditing(false), []);
  const closeArchive = useCallback(() => setConfirmArchive(false), []);
  const editorDialogRef = useAccessibleDialog(editing, closeEditor);
  const archiveDialogRef = useAccessibleDialog(confirmArchive, closeArchive);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.get(`/api/equipment/${equipmentId}`);
      setEquipment(response.data.equipment);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const loadOptions = useCallback(async (laboratoryId = "") => {
    setLoadingOptions(true);
    try {
      const suffix = laboratoryId
        ? `?laboratoryId=${encodeURIComponent(laboratoryId)}`
        : "";
      const response = await api.get(`/api/equipment/options${suffix}`);
      setOptions(response.data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  async function updateEquipment(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.put(`/api/equipment/${equipmentId}`, values);
      setEquipment((current) => ({
        ...current,
        ...response.data.equipment,
        laboratoryName:
          options.laboratories.find(
            (item) =>
              String(item.id) === String(response.data.equipment.laboratoryId),
          )?.name ?? current.laboratoryName,
        zoneName:
          options.zones.find(
            (item) =>
              String(item.id) === String(response.data.equipment.zoneId),
          )?.name ?? null,
        responsibleUserName:
          options.users.find(
            (item) =>
              String(item.id) ===
              String(response.data.equipment.responsibleUserId),
          )?.fullName ?? null,
      }));
      setEditing(false);
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function archiveEquipment() {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.delete(`/api/equipment/${equipmentId}`);
      navigate("/aplikacioni/pajisjet", {
        replace: true,
        state: { message: "Pajisja u arkivua me sukses." },
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setConfirmArchive(false);
      setSaving(false);
    }
  }

  function openEditor() {
    setEditing(true);
    setMessage({ type: "", text: "" });
  }

  if (loading) {
    return (
      <p className="workspace-loading">Po ngarkohen detajet e pajisjes…</p>
    );
  }

  if (!equipment) {
    return (
      <section className="equipment-detail-page">
        <Link className="workspace-back-link" to="/aplikacioni/pajisjet">
          <ArrowLeft size={17} /> Kthehu te pajisjet
        </Link>
        <p className="form-message error" role="alert">
          {message.text || "Pajisja nuk u gjet."}
        </p>
      </section>
    );
  }

  return (
    <section className="equipment-detail-page">
      <Link className="workspace-back-link" to="/aplikacioni/pajisjet">
        <ArrowLeft size={17} /> Kthehu te pajisjet
      </Link>

      <div className="equipment-detail-heading">
        <div>
          <p className="eyebrow">Pajisje laboratorike · {equipment.code}</p>
          <h1>{equipment.name}</h1>
          <p>{equipment.type}</p>
        </div>
        <div className="laboratories-heading-actions">
          <span className={`status-badge status-${equipment.status}`}>
            {statusLabels[equipment.status]}
          </span>
          {canManage && (
            <>
              <Button type="button" variant="outline" onClick={openEditor}>
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
        <Metric
          icon={Activity}
          label="Shëndeti"
          value={`${Number(equipment.healthScore).toLocaleString("sq-AL")}%`}
        />
        <Metric
          icon={Zap}
          label="Fuqia"
          value={
            equipment.energyRatingWatts == null
              ? "E pacaktuar"
              : `${Number(equipment.energyRatingWatts).toLocaleString("sq-AL")} W`
          }
        />
        <Metric
          icon={MapPin}
          label="Laboratori"
          value={equipment.laboratoryName}
        />
        <Metric
          icon={Box}
          label="Zona"
          value={equipment.zoneName || "E pacaktuar"}
        />
      </div>

      <div className="equipment-detail-grid">
        <DetailPanel title="Identifikimi" icon={Cpu}>
          <Detail label="Kodi" value={equipment.code} />
          <Detail label="Lloji" value={equipment.type} />
          <Detail label="Prodhuesi" value={equipment.manufacturer} />
          <Detail label="Modeli" value={equipment.model} />
          <Detail label="Numri serik" value={equipment.serialNumber} />
        </DetailPanel>
        <DetailPanel title="Përgjegjësia dhe afatet" icon={UserRound}>
          <Detail label="Përgjegjësi" value={equipment.responsibleUserName} />
          <Detail
            label="Data e blerjes"
            value={formatDate(equipment.purchaseDate)}
          />
          <Detail
            label="Garancia deri më"
            value={formatDate(equipment.warrantyExpiresAt)}
          />
          <Detail
            label="Referenca e objektit 3D"
            value={equipment.object3dReference}
          />
        </DetailPanel>
      </div>

      {editing && (
        <div className="workspace-modal-backdrop">
          <section
            ref={editorDialogRef}
            className="workspace-modal equipment-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipment-edit-title"
          >
            <header>
              <div>
                <span>Pajisja {equipment.code}</span>
                <h2 id="equipment-edit-title">Ndrysho pajisjen</h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll formularin"
                onClick={closeEditor}
              >
                <X size={20} />
              </button>
            </header>
            <EquipmentForm
              initialValues={equipment}
              submitLabel="Ruaj ndryshimet"
              options={options}
              loadingOptions={loadingOptions}
              saving={saving}
              onLaboratoryChange={loadOptions}
              onSubmit={updateEquipment}
              onCancel={closeEditor}
            />
          </section>
        </div>
      )}

      {confirmArchive && (
        <div className="workspace-modal-backdrop">
          <section
            ref={archiveDialogRef}
            className="workspace-modal archive-confirmation equipment-archive-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-equipment-title"
          >
            <CalendarDays size={28} />
            <h2 id="archive-equipment-title">Arkivo pajisjen?</h2>
            <p>
              {equipment.name} do të largohet nga listat aktive. Ky veprim nuk i
              fshin të dhënat historike.
            </p>
            <footer>
              <Button
                type="button"
                variant="outline"
                onClick={closeArchive}
                disabled={saving}
              >
                Anulo
              </Button>
              <Button
                type="button"
                onClick={archiveEquipment}
                disabled={saving}
              >
                {saving ? "Po arkivohet…" : "Arkivo pajisjen"}
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
        <strong>{value}</strong>
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
      <dd>{value || "E pacaktuar"}</dd>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
