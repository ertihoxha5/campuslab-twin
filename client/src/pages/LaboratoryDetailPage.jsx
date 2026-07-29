import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Boxes,
  Cpu,
  MapPin,
  Pencil,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { LaboratoryForm } from "@/components/LaboratoryForm.jsx";
import { LaboratoryLayoutPreview } from "@/components/LaboratoryLayoutPreview.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const statusLabels = {
  active: "Aktiv",
  inactive: "Joaktiv",
  maintenance: "Në mirëmbajtje",
};

export function LaboratoryDetailPage() {
  const { laboratoryId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("laboratories.manage");
  const canArchive = user?.permissions?.includes("laboratories.create");
  const [laboratory, setLaboratory] = useState(null);
  const [zones, setZones] = useState([]);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadDetail = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const [detailResponse, zonesResponse] = await Promise.all([
          api.get(`/api/laboratories/${laboratoryId}`),
          api.get(`/api/laboratories/${laboratoryId}/zones`),
        ]);
        setLaboratory(detailResponse.data.laboratory);
        setZones(zonesResponse.data.zones);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [laboratoryId],
  );

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function updateLaboratory(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.put(
        `/api/laboratories/${laboratoryId}`,
        values,
      );
      setLaboratory((current) => ({
        ...current,
        ...response.data.laboratory,
      }));
      setMessage({ type: "success", text: response.data.message });
      setEditing(false);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function archiveLaboratory() {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.delete(`/api/laboratories/${laboratoryId}`);
      navigate("/aplikacioni/laboratoret", {
        replace: true,
        state: { message: "Laboratori u arkivua me sukses." },
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setSaving(false);
      setConfirmArchive(false);
    }
  }

  if (loading && !laboratory) {
    return <p className="workspace-loading">Po ngarkohet laboratori…</p>;
  }

  if (!laboratory) {
    return (
      <section className="workspace-empty-state">
        <h1>Laboratori nuk mund të shfaqet</h1>
        <p role="alert">{message.text || "Laboratori i kërkuar nuk u gjet."}</p>
        <Button asChild variant="outline">
          <Link to="/aplikacioni/laboratoret">Kthehu te laboratorët</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="laboratory-detail-page">
      <Link className="workspace-back-link" to="/aplikacioni/laboratoret">
        <ArrowLeft size={16} /> Laboratorët
      </Link>
      <div className="laboratory-detail-heading">
        <div>
          <div className="laboratory-detail-meta">
            <span className="laboratory-code">{laboratory.code}</span>
            <span className={`status-badge status-${laboratory.status}`}>
              {statusLabels[laboratory.status]}
            </span>
          </div>
          <h1>{laboratory.name}</h1>
          <p>{laboratory.faculty}</p>
        </div>
        <div className="laboratories-heading-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadDetail()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Rifresko
          </Button>
          {canManage && (
            <Button type="button" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Ndrysho
            </Button>
          )}
        </div>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <div className="laboratory-detail-stats">
        <DetailStat
          icon={MapPin}
          label="Vendndodhja"
          value={`${laboratory.building}, kati ${laboratory.floor}`}
        />
        <DetailStat
          icon={Users}
          label="Kapaciteti"
          value={`${laboratory.capacity} persona`}
        />
        <DetailStat
          icon={Boxes}
          label="Zonat"
          value={String(laboratory.zoneCount ?? zones.length)}
        />
        <DetailStat
          icon={Cpu}
          label="Pajisje / Sensorë"
          value={`${laboratory.equipmentCount ?? 0} / ${laboratory.sensorCount ?? 0}`}
        />
      </div>

      <div className="laboratory-detail-grid">
        <article className="laboratory-detail-panel">
          <header>
            <div>
              <span>Digital Twin</span>
              <h2>Konfigurimi virtual</h2>
            </div>
            <small>{zones.length} zona të konfiguruara</small>
          </header>
          <LaboratoryLayoutPreview zones={zones} />
        </article>

        <aside className="laboratory-detail-panel laboratory-info-panel">
          <header>
            <div>
              <span>Informacioni</span>
              <h2>Detajet bazë</h2>
            </div>
          </header>
          <dl>
            <div>
              <dt>Përgjegjësi</dt>
              <dd>{laboratory.responsibleUserName || "I pacaktuar"}</dd>
            </div>
            <div>
              <dt>Përshkrimi</dt>
              <dd>{laboratory.description || "Nuk ka përshkrim."}</dd>
            </div>
          </dl>
          {canArchive && (
            <Button
              type="button"
              variant="outline"
              className="archive-button"
              onClick={() => setConfirmArchive(true)}
            >
              <Archive size={16} /> Arkivo laboratorin
            </Button>
          )}
        </aside>
      </div>

      {editing && (
        <div className="workspace-modal-backdrop">
          <section
            className="workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="laboratory-edit-title"
          >
            <header>
              <div>
                <span>Konfigurimi bazë</span>
                <h2 id="laboratory-edit-title">Ndrysho laboratorin</h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll formularin"
                onClick={() => setEditing(false)}
              >
                <X size={20} />
              </button>
            </header>
            <LaboratoryForm
              initialValues={laboratory}
              onSubmit={updateLaboratory}
              onCancel={() => setEditing(false)}
              saving={saving}
              submitLabel="Ruaj ndryshimet"
            />
          </section>
        </div>
      )}

      {confirmArchive && (
        <div className="workspace-modal-backdrop">
          <section
            className="workspace-modal archive-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-title"
          >
            <header>
              <div>
                <span>Veprim administrativ</span>
                <h2 id="archive-title">Arkivo laboratorin?</h2>
              </div>
            </header>
            <p>
              Laboratori nuk do të shfaqet më në listat aktive, por historiku i
              tij do të ruhet.
            </p>
            <footer>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmArchive(false)}
              >
                Anulo
              </Button>
              <Button
                type="button"
                onClick={archiveLaboratory}
                disabled={saving}
              >
                {saving ? "Po arkivohet…" : "Arkivo"}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

function DetailStat({ icon: Icon, label, value }) {
  return (
    <article>
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
