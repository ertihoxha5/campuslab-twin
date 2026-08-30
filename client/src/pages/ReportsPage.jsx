import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Plus,
  Printer,
  RefreshCw,
} from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const reportTypes = {
  laboratory: "Laboratori",
  energy: "Energjia",
  alerts: "Alarmet",
  equipment_health: "Shëndeti i pajisjeve",
  maintenance: "Mirëmbajtja",
  simulation: "Simulimi",
};
const sourceLabels = {
  physical: "Fizik",
  simulated: "Simuluar",
  mixed: "I kombinuar",
  unknown: "Pa të dhëna",
};
const dateInput = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const canGenerate = user?.permissions?.includes("reports.generate");
  const [laboratories, setLaboratories] = useState([]);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ laboratoryId: "", reportType: "" });
  const [form, setForm] = useState({
    title: "Raporti mujor i laboratorit",
    reportType: "laboratory",
    laboratoryId: "",
    periodStart: dateInput(30),
    periodEnd: dateInput(),
    format: "pdf",
    dataSource: "mixed",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const query = useMemo(() => {
    const parameters = new URLSearchParams({ page: "1", pageSize: "50" });
    if (filters.laboratoryId)
      parameters.set("laboratoryId", filters.laboratoryId);
    if (filters.reportType) parameters.set("reportType", filters.reportType);
    return parameters.toString();
  }, [filters]);
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/reports?${query}`);
      setReports(response.data.reports);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);
  useEffect(() => {
    api
      .get("/api/laboratories?page=1&pageSize=100&sort=name&direction=asc")
      .then((response) => setLaboratories(response.data.laboratories))
      .catch((error) => setMessage({ type: "error", text: error.message }));
  }, []);

  async function generate(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.post("/api/reports", {
        ...form,
        laboratoryId: form.laboratoryId || undefined,
        periodStart: new Date(
          `${form.periodStart}T00:00:00.000Z`,
        ).toISOString(),
        periodEnd: new Date(`${form.periodEnd}T23:59:59.999Z`).toISOString(),
      });
      setMessage({ type: "success", text: "Raporti u gjenerua me sukses." });
      await loadReports();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function download(report) {
    setDownloadingId(report.id);
    try {
      const file = await api.download(`/api/reports/${report.id}/download`);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <section className="reports-page">
      <PageHeader eyebrow="Dokumentim i gjurmueshëm" title="Raportet"
        description="Gjeneroni dhe shkarkoni raporte të autorizuara të universitetit."
        meta={<StatusBadge tone="info" dot={false}>{reports.length} raporte</StatusBadge>}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={16} /> Printo listën
          </Button>
          <Button variant="outline" size="sm" onClick={loadReports} disabled={loading}>
            <RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Rifresko
          </Button>
        </>}
      />
      {message.text && (
        <p className={`form-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {canGenerate && (
        <article className="reports-panel reports-generator">
          <header>
            <div>
              <h2>Gjenero raport të ri</h2>
              <p>Të dhënat ruhen si snapshot i periudhës së zgjedhur.</p>
            </div>
            <Plus size={18} />
          </header>
          <form onSubmit={generate}>
            <label>
              <span>Titulli</span>
              <input
                required
                minLength="3"
                maxLength="200"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              <span>Lloji</span>
              <select
                aria-label="Lloji i raportit"
                value={form.reportType}
                onChange={(event) =>
                  setForm({ ...form, reportType: event.target.value })
                }
              >
                {Object.entries(reportTypes).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Laboratori</span>
              <select
                aria-label="Laboratori i raportit"
                value={form.laboratoryId}
                onChange={(event) =>
                  setForm({ ...form, laboratoryId: event.target.value })
                }
              >
                <option value="">I gjithë universiteti</option>
                {laboratories.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Fillimi</span>
              <input
                aria-label="Fillimi"
                type="date"
                required
                value={form.periodStart}
                onChange={(event) =>
                  setForm({ ...form, periodStart: event.target.value })
                }
              />
            </label>
            <label>
              <span>Fundi</span>
              <input
                aria-label="Fundi"
                type="date"
                required
                value={form.periodEnd}
                onChange={(event) =>
                  setForm({ ...form, periodEnd: event.target.value })
                }
              />
            </label>
            <label>
              <span>Formati</span>
              <select
                aria-label="Formati"
                value={form.format}
                onChange={(event) =>
                  setForm({ ...form, format: event.target.value })
                }
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <label>
              <span>Burimi</span>
              <select
                aria-label="Burimi"
                value={form.dataSource}
                onChange={(event) =>
                  setForm({ ...form, dataSource: event.target.value })
                }
              >
                <option value="mixed">Të gjitha burimet</option>
                <option value="physical">Fizik</option>
                <option value="simulated">Simuluar</option>
              </select>
            </label>
            <Button disabled={saving}>
              <FileText size={16} />{" "}
              {saving ? "Po gjenerohet…" : "Gjenero raportin"}
            </Button>
          </form>
        </article>
      )}
      <div className="reports-toolbar">
        <label>
          <span>Laboratori</span>
          <select
            aria-label="Filtro laboratorin"
            value={filters.laboratoryId}
            onChange={(event) =>
              setFilters({ ...filters, laboratoryId: event.target.value })
            }
          >
            <option value="">Të gjithë</option>
            {laboratories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lloji</span>
          <select
            aria-label="Filtro llojin"
            value={filters.reportType}
            onChange={(event) =>
              setFilters({ ...filters, reportType: event.target.value })
            }
          >
            <option value="">Të gjitha</option>
            {Object.entries(reportTypes).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <article className="reports-panel reports-history">
        <header>
          <div>
            <h2>Historiku i raporteve</h2>
            <p>{reports.length} raporte të autorizuara</p>
          </div>
          <FileText size={18} />
        </header>
        {loading ? (
          <LoadingSkeleton rows={6} aria-label="Po ngarkohen raportet" />
        ) : reports.length ? (
          <div className="reports-list">
            {reports.map((report) => (
              <section className="report-row" key={report.id}>
                <div className="report-row-main">
                  <strong>{report.title}</strong>
                  <span>
                    {report.universityName} ·{" "}
                    {report.laboratoryName ?? "I gjithë universiteti"}
                  </span>
                </div>
                <div>
                  <span>Lloji</span>
                  <strong>
                    {reportTypes[report.reportType] ?? report.reportType}
                  </strong>
                </div>
                <div>
                  <span>Periudha</span>
                  <strong>
                    {formatDate(report.periodStart)} —{" "}
                    {formatDate(report.periodEnd)}
                  </strong>
                </div>
                <div>
                  <span>Burimi</span>
                  <strong>
                    {sourceLabels[report.parameters.dataSource] ??
                      report.parameters.dataSource}
                  </strong>
                </div>
                <div>
                  <span>Autori</span>
                  <strong>{report.generatedByName}</strong>
                </div>
                <div className="report-row-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPreviewId(previewId === report.id ? "" : report.id)
                    }
                  >
                    <Eye size={15} />{" "}
                    {previewId === report.id ? "Mbyll" : "Shiko"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => download(report)}
                    disabled={downloadingId === report.id}
                  >
                    <Download size={15} />{" "}
                    {downloadingId === report.id
                      ? "Po shkarkohet…"
                      : report.parameters.format.toUpperCase()}
                  </Button>
                </div>
                {previewId === report.id && <ReportPreview report={report} />}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState compact icon={FileText} title="Nuk ka raporte"
            description="Nuk u gjetën raporte për filtrat e zgjedhur." />
        )}
      </article>
    </section>
  );
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ReportPreview({ report }) {
  const snapshot = report.parameters.snapshot;
  return (
    <div className="report-preview">
      <div className="report-preview-heading">
        <div>
          <span>Pamja e raportit</span>
          <h3>{report.title}</h3>
        </div>
        <strong>
          Gjeneruar më {formatDate(report.parameters.generatedAt)}
        </strong>
      </div>
      {snapshot ? (
        <>
          <div className="report-preview-metrics">
            <div>
              <span>Vlera mesatare</span>
              <strong>{snapshot.summary?.value ?? "—"}</strong>
            </div>
            <div>
              <span>Minimumi</span>
              <strong>{snapshot.summary?.minimum ?? "—"}</strong>
            </div>
            <div>
              <span>Maksimumi</span>
              <strong>{snapshot.summary?.maximum ?? "—"}</strong>
            </div>
            <div>
              <span>Mostra</span>
              <strong>{snapshot.summary?.samples ?? 0}</strong>
            </div>
          </div>
          <div className="report-preview-data">
            <span>Të dhënat historike</span>
            <strong>
              {snapshot.series?.length ?? 0} intervale të ruajtura
            </strong>
          </div>
          {snapshot.recommendations?.length ? (
            <div className="report-preview-recommendations">
              <span>Rekomandimet e aktivizuara</span>
              {snapshot.recommendations.map((item) => (
                <div key={item.ruleId}>
                  <strong>{item.title}</strong>
                  <p>{item.explanation}</p>
                  <small>{item.action}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="reports-empty">
              Asnjë rekomandim nuk u aktivizua për këtë snapshot.
            </p>
          )}
        </>
      ) : (
        <p className="reports-empty">
          Ky raport i vjetër nuk përmban snapshot analitik.
        </p>
      )}
    </div>
  );
}
