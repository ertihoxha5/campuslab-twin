import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Boxes,
  Cpu,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { LaboratoryForm } from "@/components/LaboratoryForm.jsx";
import { LaboratoryLayoutPreview } from "@/components/LaboratoryLayoutPreview.jsx";
import { LaboratoryModelPanel } from "@/components/LaboratoryModelPanel.jsx";
import { LaboratoryZoneForm } from "@/components/LaboratoryZoneForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog.js";

const statusLabels = {
  active: "Aktiv",
  inactive: "Joaktiv",
  maintenance: "Në mirëmbajtje",
};

const statusTones = { active: "success", inactive: "neutral", maintenance: "warning" };

export function LaboratoryDetailPage() {
  const { laboratoryId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("laboratories.manage");
  const canArchive = user?.permissions?.includes("laboratories.create");
  const [laboratory, setLaboratory] = useState(null);
  const [responsibleUsers, setResponsibleUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editingZone, setEditingZone] = useState(undefined);
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingResponsibleUsers, setLoadingResponsibleUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const closeEditor = useCallback(() => setEditing(false), []);
  const closeZoneEditor = useCallback(() => setEditingZone(undefined), []);
  const closeZoneDelete = useCallback(() => setZoneToDelete(null), []);
  const closeArchive = useCallback(() => setConfirmArchive(false), []);
  const editorDialogRef = useAccessibleDialog(editing, closeEditor);
  const zoneDialogRef = useAccessibleDialog(
    editingZone !== undefined,
    closeZoneEditor,
  );
  const deleteDialogRef = useAccessibleDialog(
    Boolean(zoneToDelete),
    closeZoneDelete,
  );
  const archiveDialogRef = useAccessibleDialog(confirmArchive, closeArchive);

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

  useEffect(() => {
    if (!canManage) return;
    setLoadingResponsibleUsers(true);
    api
      .get("/api/laboratories/responsible-users")
      .then((response) => setResponsibleUsers(response.data.users ?? []))
      .catch(() => setResponsibleUsers([]))
      .finally(() => setLoadingResponsibleUsers(false));
  }, [canManage]);

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

  async function saveZone(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = editingZone
        ? await api.put(
            `/api/laboratories/${laboratoryId}/zones/${editingZone.id}`,
            values,
          )
        : await api.post(`/api/laboratories/${laboratoryId}/zones`, values);
      const savedZone = response.data.zone;
      setZones((current) =>
        editingZone
          ? current.map((zone) =>
              String(zone.id) === String(savedZone.id) ? savedZone : zone,
            )
          : [...current, savedZone],
      );
      setSelectedZone(savedZone);
      setLaboratory((current) => ({
        ...current,
        zoneCount: editingZone
          ? current.zoneCount
          : Number(current.zoneCount ?? zones.length) + 1,
      }));
      setMessage({ type: "success", text: response.data.message });
      setEditingZone(undefined);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteZone() {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.delete(
        `/api/laboratories/${laboratoryId}/zones/${zoneToDelete.id}`,
      );
      setZones((current) =>
        current.filter((zone) => String(zone.id) !== String(zoneToDelete.id)),
      );
      setSelectedZone(null);
      setLaboratory((current) => ({
        ...current,
        zoneCount: Math.max(Number(current.zoneCount ?? zones.length) - 1, 0),
      }));
      setMessage({ type: "success", text: response.data.message });
      setZoneToDelete(null);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setZoneToDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function uploadModel(file) {
    setUploadingModel(true);
    setMessage({ type: "", text: "" });
    try {
      const body = new FormData();
      body.append("model", file);
      const response = await api.post(
        `/api/laboratories/${laboratoryId}/model`,
        body,
      );
      const model = response.data.model;
      setLaboratory((current) => ({
        ...current,
        modelFileId: model.id,
        modelOriginalName: model.originalName,
        modelMimeType: model.mimeType,
        modelSizeBytes: model.sizeBytes,
        modelCreatedAt: model.createdAt,
      }));
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setUploadingModel(false);
    }
  }

  async function removeModel() {
    setUploadingModel(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.delete(
        `/api/laboratories/${laboratoryId}/model`,
      );
      setLaboratory((current) => ({
        ...current,
        modelFileId: null,
        modelOriginalName: null,
        modelMimeType: null,
        modelSizeBytes: null,
        modelCreatedAt: null,
      }));
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setUploadingModel(false);
    }
  }

  if (loading && !laboratory) {
    return <LoadingSkeleton rows={7} aria-label="Po ngarkohet laboratori" />;
  }

  if (!laboratory) {
    return (
      <EmptyState
        icon={Archive}
        title="Laboratori nuk mund të shfaqet"
        description={message.text || "Laboratori i kërkuar nuk u gjet ose nuk është i qasshëm për rolin tuaj."}
        action={<Button asChild variant="outline"><Link to="/aplikacioni/laboratoret">Kthehu te laboratorët</Link></Button>}
      />
    );
  }

  return (
    <section className="laboratory-detail-page">
      <Link className="workspace-back-link" to="/aplikacioni/laboratoret">
        <ArrowLeft size={16} /> Laboratorët
      </Link>
      <PageHeader
        eyebrow={`${laboratory.code} · ${laboratory.faculty}`}
        title={laboratory.name}
        description={`${laboratory.building}, kati ${laboratory.floor} · Kapaciteti ${laboratory.capacity} persona`}
        meta={<StatusBadge tone={statusTones[laboratory.status]}>{statusLabels[laboratory.status] ?? laboratory.status}</StatusBadge>}
        actions={<>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadDetail()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Rifresko
          </Button>
          {canManage && (
            <Button type="button" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Ndrysho
            </Button>
          )}
        </>}
      />

      {message.text && (
        <p className={`form-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      <nav
        className="laboratory-detail-tabs"
        role="tablist"
        aria-label="Seksionet e laboratorit"
      >
        {[
          ["summary", "Përmbledhja"],
          ["zones", `Zonat (${zones.length})`],
          ["virtual", "Pamja virtuale"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "summary" && (
        <>
          <div className="laboratory-detail-stats">
            <DetailStat icon={MapPin} label="Vendndodhja" value={`${laboratory.building}, kati ${laboratory.floor}`} />
            <DetailStat icon={Users} label="Kapaciteti" value={`${laboratory.capacity} persona`} />
            <DetailStat icon={Boxes} label="Zonat" value={String(laboratory.zoneCount ?? zones.length)} />
            <DetailStat icon={Cpu} label="Pajisje / Sensorë" value={`${laboratory.equipmentCount ?? 0} / ${laboratory.sensorCount ?? 0}`} />
          </div>
          <nav className="laboratory-quick-actions" aria-label="Veprime të shpejta për laboratorin">
            <Link to="/aplikacioni/digital-twin"><Boxes size={17} /><span><strong>Digital Twin</strong><small>Hap skenën operative 3D</small></span><ExternalLink size={14} /></Link>
            <Link to="/aplikacioni/pajisjet"><Cpu size={17} /><span><strong>Pajisjet</strong><small>Shiko asetet laboratorike</small></span><ExternalLink size={14} /></Link>
            <Link to="/aplikacioni/sensoret"><RefreshCw size={17} /><span><strong>Sensorët</strong><small>Kontrollo telemetrinë</small></span><ExternalLink size={14} /></Link>
          </nav>
        </>
      )}

      <div className="laboratory-detail-grid" data-active-tab={activeTab}>
        <article
          className="laboratory-detail-panel laboratory-virtual-panel"
          hidden={activeTab === "summary"}
          aria-label={
            activeTab === "zones"
              ? "Konfigurimi i zonave"
              : "Pamja virtuale e laboratorit"
          }
        >
          <header>
            <div>
              <span>Digital Twin</span>
              <h2>
                {activeTab === "zones"
                  ? "Konfigurimi i zonave"
                  : "Pamja e laboratorit"}
              </h2>
            </div>
            {activeTab === "zones" && canManage ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setEditingZone(null)}
              >
                <Plus size={15} /> Shto zonë
              </Button>
            ) : activeTab === "zones" ? (
              <small>{zones.length} zona të konfiguruara</small>
            ) : null}
          </header>
          <div hidden={activeTab !== "virtual"}>
            <LaboratoryModelPanel
              laboratoryId={laboratoryId}
              model={
                laboratory.modelFileId
                  ? {
                      id: laboratory.modelFileId,
                      originalName: laboratory.modelOriginalName,
                      mimeType: laboratory.modelMimeType,
                      sizeBytes: laboratory.modelSizeBytes,
                      createdAt: laboratory.modelCreatedAt,
                    }
                  : null
              }
              canManage={canManage}
              uploading={uploadingModel}
              onUpload={uploadModel}
              onRemove={removeModel}
              onValidationError={(text) => setMessage({ type: "error", text })}
            />
          </div>
          <div hidden={activeTab !== "zones"}>
            <LaboratoryLayoutPreview
              zones={zones}
              selectedZoneId={selectedZone?.id}
              onSelectZone={setSelectedZone}
            />
            {zones.length > 0 && (
              <div className="virtual-zone-list">
                {zones.map((zone) => (
                  <button
                    type="button"
                    className={
                      String(selectedZone?.id) === String(zone.id)
                        ? "is-selected"
                        : ""
                    }
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <span>
                      <strong>{zone.name}</strong>
                      <small>
                        {zone.code} · {zone.dimensions?.width ?? 0} ×{" "}
                        {zone.dimensions?.depth ?? 0} m
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedZone && (
              <div className="selected-zone-toolbar">
                <div>
                  <strong>{selectedZone.name}</strong>
                  <span>
                    Pozicioni: X {selectedZone.position?.x ?? 0}, Y{" "}
                    {selectedZone.position?.y ?? 0}, Z{" "}
                    {selectedZone.position?.z ?? 0}
                  </span>
                </div>
                {canManage && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingZone(selectedZone)}
                    >
                      <Pencil size={14} /> Ndrysho
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setZoneToDelete(selectedZone)}
                    >
                      <Trash2 size={14} /> Fshi
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </article>

        <aside
          className="laboratory-detail-panel laboratory-info-panel"
          hidden={activeTab !== "summary"}
        >
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
            ref={editorDialogRef}
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
                onClick={closeEditor}
              >
                <X size={20} />
              </button>
            </header>
            <LaboratoryForm
              initialValues={laboratory}
              onSubmit={updateLaboratory}
              onCancel={closeEditor}
              saving={saving}
              submitLabel="Ruaj ndryshimet"
              responsibleUsers={responsibleUsers}
              loadingResponsibleUsers={loadingResponsibleUsers}
            />
          </section>
        </div>
      )}

      {editingZone !== undefined && (
        <div className="workspace-modal-backdrop">
          <section
            ref={zoneDialogRef}
            className="workspace-modal zone-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="zone-form-title"
          >
            <header>
              <div>
                <span>Plani virtual</span>
                <h2 id="zone-form-title">
                  {editingZone ? "Ndrysho zonën" : "Krijo zonë"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll konfigurimin e zonës"
                onClick={closeZoneEditor}
              >
                <X size={20} />
              </button>
            </header>
            <LaboratoryZoneForm
              initialZone={editingZone}
              onSubmit={saveZone}
              onCancel={closeZoneEditor}
              saving={saving}
            />
          </section>
        </div>
      )}

      {zoneToDelete && (
        <div className="workspace-modal-backdrop">
          <section
            ref={deleteDialogRef}
            className="workspace-modal archive-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-zone-title"
          >
            <header>
              <div>
                <span>Plani virtual</span>
                <h2 id="delete-zone-title">Fshi zonën?</h2>
              </div>
            </header>
            <p>
              Zona “{zoneToDelete.name}” do të hiqet nga konfigurimi virtual.
              Fshirja bllokohet nëse ka pajisje ose sensorë të lidhur.
            </p>
            <footer>
              <Button type="button" variant="outline" onClick={closeZoneDelete}>
                Anulo
              </Button>
              <Button type="button" onClick={deleteZone} disabled={saving}>
                {saving ? "Po fshihet…" : "Fshi zonën"}
              </Button>
            </footer>
          </section>
        </div>
      )}

      {confirmArchive && (
        <div className="workspace-modal-backdrop">
          <section
            ref={archiveDialogRef}
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
              <Button type="button" variant="outline" onClick={closeArchive}>
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
