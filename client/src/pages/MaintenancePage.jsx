import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Clock3,
  FileText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog.js";

const statusLabels = {
  planned: "Planifikuar",
  in_progress: "Në proces",
  waiting: "Në pritje",
  completed: "Përfunduar",
  cancelled: "Anuluar",
};
const statusTones = { planned: "info", in_progress: "warning", waiting: "warning", completed: "success", cancelled: "neutral" };
const priorityLabels = {
  low: "E ulët",
  medium: "Mesatare",
  high: "E lartë",
  critical: "Kritike",
};
const typeLabels = {
  preventive: "Parandaluese",
  corrective: "Korrigjuese",
  inspection: "Inspektim",
  calibration: "Kalibrim",
};
const nextStatuses = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["waiting", "completed", "cancelled"],
  waiting: ["in_progress", "cancelled"],
};
const emptyOptions = { laboratories: [], equipment: [], technicians: [] };
const emptyForm = {
  laboratoryId: "",
  equipmentId: "",
  assignedUserId: "",
  type: "preventive",
  priority: "medium",
  title: "",
  description: "",
  scheduledAt: "",
  dueAt: "",
  checklistText: "",
};
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("sq-AL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Pa afat";

export function MaintenancePage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("maintenance.manage");
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [options, setOptions] = useState(emptyOptions);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const closeCreate = useCallback(() => setShowCreate(false), []);
  const closeTask = useCallback(() => setSelectedTask(null), []);
  const createDialogRef = useAccessibleDialog(showCreate, closeCreate);
  const taskDialogRef = useAccessibleDialog(Boolean(selectedTask), closeTask);
  const [transition, setTransition] = useState({
    status: "",
    notes: "",
    repairDetails: "",
    cost: "",
    checklist: [],
  });

  const loadTasks = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({
          page: String(page),
          pageSize: "15",
        });
        if (status) parameters.set("status", status);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const response = await api.get(`/api/maintenance?${parameters}`);
        setTasks(response.data.tasks);
        setPagination(response.meta?.pagination ?? null);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [page, status, submittedSearch],
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function loadOptions(laboratoryId = "") {
    const suffix = laboratoryId
      ? `?laboratoryId=${encodeURIComponent(laboratoryId)}`
      : "";
    const response = await api.get(`/api/maintenance/options${suffix}`);
    setOptions(response.data);
  }

  async function openCreate() {
    setShowCreate(true);
    setForm(emptyForm);
    try {
      await loadOptions();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function changeLaboratory(laboratoryId) {
    setForm((current) => ({
      ...current,
      laboratoryId,
      equipmentId: "",
      assignedUserId: "",
    }));
    try {
      await loadOptions(laboratoryId);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const checklist = form.checklistText
        .split("\n")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => ({ label, completed: false }));
      const response = await api.post("/api/maintenance", {
        ...form,
        assignedUserId: form.assignedUserId || null,
        scheduledAt: form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : null,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        checklist,
      });
      setShowCreate(false);
      setPage(1);
      setMessage({ type: "success", text: response.data.message });
      await loadTasks({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function openTask(taskId) {
    try {
      const task = (await api.get(`/api/maintenance/${taskId}`)).data.task;
      setSelectedTask(task);
      setTransition({
        status: nextStatuses[task.status]?.[0] ?? "",
        notes: "",
        repairDetails: "",
        cost: "",
        checklist: Array.isArray(task.checklist) ? task.checklist : [],
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function updateStatus(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.patch(
        `/api/maintenance/${selectedTask.id}/status`,
        {
          ...transition,
          cost: transition.cost === "" ? null : Number(transition.cost),
        },
      );
      setSelectedTask(null);
      setMessage({ type: "success", text: response.data.message });
      await loadTasks({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function uploadEvidence(event) {
    event.preventDefault();
    if (!evidenceFile) return;
    const formElement = event.currentTarget;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("evidence", evidenceFile);
      if (evidenceCaption.trim())
        body.append("caption", evidenceCaption.trim());
      const latestUpdate = selectedTask.history?.at(-1);
      if (latestUpdate?.id) body.append("maintenanceUpdateId", latestUpdate.id);
      const response = await api.post(
        `/api/maintenance/${selectedTask.id}/evidence`,
        body,
      );
      const refreshed = (await api.get(`/api/maintenance/${selectedTask.id}`))
        .data.task;
      setSelectedTask(refreshed);
      setEvidenceFile(null);
      setEvidenceCaption("");
      formElement.reset();
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="maintenance-page">
      <PageHeader
        eyebrow="Operacionet teknike"
        title="Mirëmbajtja"
        description="Planifikoni punën, ndiqni afatet dhe ruani historikun teknik të pajisjeve."
        meta={pagination && <StatusBadge tone="info" dot={false}>{pagination.total ?? tasks.length} detyra gjithsej</StatusBadge>}
        actions={<>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTasks()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Rifresko
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={17} /> Detyrë e re
            </Button>
          )}
        </>}
      />
      <div className="laboratory-filters maintenance-filters">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSubmittedSearch(search.trim());
          }}
        >
          <Search size={17} />
          <input
            aria-label="Kërko mirëmbajtjen"
            placeholder="Kërko detyrën ose pajisjen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
        <label>
          <span>Statusi</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Të gjitha</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message.text && (
        <p className={`form-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {loading ? (
        <LoadingSkeleton rows={7} aria-label="Po ngarkohen detyrat" />
      ) : tasks.length === 0 ? (
        <EmptyState icon={Wrench} title="Nuk ka detyra mirëmbajtjeje"
          description="Krijoni detyrën e parë ose ndryshoni filtrat aktualë."
          action={canManage && !submittedSearch && !status ? <Button size="sm" onClick={openCreate}><Plus size={15} /> Detyrë e re</Button> : null} />
      ) : (
        <div className="maintenance-list">
          {tasks.map((task) => (
            <article
              className={`maintenance-row ${task.overdue ? "is-overdue" : ""}`}
              key={task.id}
            >
              <div className="maintenance-row-main">
                <div className="maintenance-row-badges">
                  <span
                    className={`maintenance-priority priority-${task.priority}`}
                  >
                    {priorityLabels[task.priority]}
                  </span>
                  <StatusBadge tone={statusTones[task.status]}>{statusLabels[task.status] ?? task.status}</StatusBadge>
                  {task.overdue ? (
                    <span className="maintenance-overdue">Afati ka kaluar</span>
                  ) : null}
                </div>
                <h2>{task.title}</h2>
                <p>
                  {task.equipmentName} · {task.laboratoryName}
                </p>
              </div>
              <div className="maintenance-row-meta">
                <span>
                  <CalendarClock size={15} /> {formatDate(task.dueAt)}
                </span>
                <span>{typeLabels[task.type]}</span>
                <span>{task.assignedUserName || "Pa teknik"}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openTask(task.id)}
              >
                Hap detyrën
              </Button>
            </article>
          ))}
        </div>
      )}
      {pagination?.pages > 1 && (
        <nav
          className="laboratory-pagination"
          aria-label="Faqet e mirëmbajtjes"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Para
          </Button>
          <span>
            Faqja {pagination.page} nga {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Pas
          </Button>
        </nav>
      )}
      {showCreate && (
        <div className="workspace-modal-backdrop">
          <section
            ref={createDialogRef}
            className="workspace-modal maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-create-title"
          >
            <header>
              <div>
                <span>Planifikim</span>
                <h2 id="maintenance-create-title">Detyrë e re</h2>
              </div>
              <button type="button" aria-label="Mbyll" onClick={closeCreate}>
                <X size={20} />
              </button>
            </header>
            <form onSubmit={createTask} className="maintenance-form">
              <div className="maintenance-form-grid">
                <label>
                  <span>Laboratori</span>
                  <select
                    required
                    value={form.laboratoryId}
                    onChange={(event) => changeLaboratory(event.target.value)}
                  >
                    <option value="">Zgjidhni</option>
                    {options.laboratories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Pajisja</span>
                  <select
                    required
                    value={form.equipmentId}
                    onChange={(event) =>
                      setForm({ ...form, equipmentId: event.target.value })
                    }
                  >
                    <option value="">Zgjidhni</option>
                    {options.equipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Tekniku</span>
                  <select
                    value={form.assignedUserId}
                    onChange={(event) =>
                      setForm({ ...form, assignedUserId: event.target.value })
                    }
                  >
                    <option value="">Pa teknik</option>
                    {options.technicians.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Lloji</span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({ ...form, type: event.target.value })
                    }
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Prioriteti</span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value })
                    }
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Data e planifikuar</span>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      setForm({ ...form, scheduledAt: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Afati</span>
                  <input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(event) =>
                      setForm({ ...form, dueAt: event.target.value })
                    }
                  />
                </label>
                <label className="maintenance-field-wide">
                  <span>Titulli</span>
                  <input
                    required
                    minLength={3}
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                  />
                </label>
                <label className="maintenance-field-wide">
                  <span>Përshkrimi</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </label>
                <label className="maintenance-field-wide">
                  <span>Checklist · një hap për rresht</span>
                  <textarea
                    rows={4}
                    value={form.checklistText}
                    onChange={(event) =>
                      setForm({ ...form, checklistText: event.target.value })
                    }
                  />
                </label>
              </div>
              <footer>
                <Button type="button" variant="outline" onClick={closeCreate}>
                  Anulo
                </Button>
                <Button disabled={saving}>
                  {saving ? "Po ruhet…" : "Krijo detyrën"}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {selectedTask && (
        <div className="workspace-modal-backdrop">
          <section
            ref={taskDialogRef}
            className="workspace-modal maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-detail-title"
          >
            <header>
              <div>
                <span>{statusLabels[selectedTask.status]}</span>
                <h2 id="maintenance-detail-title">{selectedTask.title}</h2>
              </div>
              <button type="button" aria-label="Mbyll" onClick={closeTask}>
                <X size={20} />
              </button>
            </header>
            <div className="maintenance-detail-summary">
              <p>{selectedTask.description || "Pa përshkrim."}</p>
              <dl>
                <div>
                  <dt>Pajisja</dt>
                  <dd>{selectedTask.equipmentName}</dd>
                </div>
                <div>
                  <dt>Tekniku</dt>
                  <dd>{selectedTask.assignedUserName || "Pa teknik"}</dd>
                </div>
                <div>
                  <dt>Afati</dt>
                  <dd>{formatDate(selectedTask.dueAt)}</dd>
                </div>
              </dl>
            </div>
            <div className="maintenance-records-grid">
              <section className="maintenance-records-section">
                <header>
                  <Clock3 size={17} />
                  <div>
                    <h3>Historiku</h3>
                    <p>I pandryshueshëm dhe në rend kronologjik</p>
                  </div>
                </header>
                <ol className="maintenance-history-list">
                  {(selectedTask.history ?? []).map((entry) => (
                    <li key={entry.id}>
                      <span />
                      <div>
                        <strong>{statusLabels[entry.status]}</strong>
                        <p>{entry.notes}</p>
                        <small>
                          {entry.userName} · {formatDate(entry.createdAt)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="maintenance-records-section">
                <header>
                  <Paperclip size={17} />
                  <div>
                    <h3>Evidencat</h3>
                    <p>Fotografi dhe dokumente teknike</p>
                  </div>
                </header>
                {(selectedTask.evidence ?? []).length ? (
                  <ul className="maintenance-evidence-list">
                    {selectedTask.evidence.map((item) => (
                      <li key={item.id}>
                        <FileText size={17} />
                        <div>
                          <a href={`/api/files/${item.fileId}`}>
                            {item.originalName}
                          </a>
                          <small>
                            {item.caption || formatDate(item.createdAt)}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="maintenance-records-empty">
                    Ende nuk është ngarkuar evidencë.
                  </p>
                )}
                <form
                  className="maintenance-evidence-form"
                  onSubmit={uploadEvidence}
                >
                  <label>
                    <span>Skedari · JPG, PNG, WebP ose PDF</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      onChange={(event) =>
                        setEvidenceFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  <label>
                    <span>Përshkrimi</span>
                    <input
                      maxLength={500}
                      value={evidenceCaption}
                      onChange={(event) =>
                        setEvidenceCaption(event.target.value)
                      }
                      placeholder="P.sh. Gjendja pas riparimit"
                    />
                  </label>
                  <Button size="sm" disabled={uploading || !evidenceFile}>
                    <Upload size={15} />{" "}
                    {uploading ? "Po ngarkohet…" : "Ngarko evidencën"}
                  </Button>
                </form>
              </section>
            </div>
            {nextStatuses[selectedTask.status]?.length ? (
              <form
                onSubmit={updateStatus}
                className="maintenance-form maintenance-transition-form"
              >
                <label>
                  <span>Statusi i ri</span>
                  <select
                    value={transition.status}
                    onChange={(event) =>
                      setTransition({
                        ...transition,
                        status: event.target.value,
                      })
                    }
                  >
                    {nextStatuses[selectedTask.status].map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                {transition.checklist.map((item, index) => (
                  <label
                    className="maintenance-check"
                    key={`${item.label}-${index}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(event) =>
                        setTransition({
                          ...transition,
                          checklist: transition.checklist.map(
                            (entry, itemIndex) =>
                              itemIndex === index
                                ? { ...entry, completed: event.target.checked }
                                : entry,
                          ),
                        })
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
                <label>
                  <span>Shënimi</span>
                  <textarea
                    required
                    minLength={2}
                    rows={3}
                    value={transition.notes}
                    onChange={(event) =>
                      setTransition({
                        ...transition,
                        notes: event.target.value,
                      })
                    }
                  />
                </label>
                {transition.status === "completed" && (
                  <>
                    <label>
                      <span>Detajet e riparimit</span>
                      <textarea
                        rows={3}
                        value={transition.repairDetails}
                        onChange={(event) =>
                          setTransition({
                            ...transition,
                            repairDetails: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Kostoja</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={transition.cost}
                        onChange={(event) =>
                          setTransition({
                            ...transition,
                            cost: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
                <footer>
                  <Button type="button" variant="outline" onClick={closeTask}>
                    Mbyll
                  </Button>
                  <Button disabled={saving}>
                    {saving ? "Po ruhet…" : "Përditëso statusin"}
                  </Button>
                </footer>
              </form>
            ) : (
              <p className="maintenance-final-state">
                Kjo detyrë është mbyllur dhe historiku mbetet vetëm për lexim.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
