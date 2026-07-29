import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  FlaskConical,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const metrics = [
  {
    key: "pendingRegistrations",
    label: "Kërkesa në pritje",
    icon: Clock3,
  },
  {
    key: "activeUniversities",
    label: "Universitete aktive",
    icon: Building2,
  },
  {
    key: "suspendedUniversities",
    label: "Universitete të pezulluara",
    icon: XCircle,
  },
  {
    key: "approvedRegistrations",
    label: "Kërkesa të aprovuara",
    icon: CheckCircle2,
  },
  { key: "activeUsers", label: "Përdorues aktivë", icon: UserRound },
  { key: "laboratories", label: "Laboratorë", icon: FlaskConical },
];

export function PlatformSummaryPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSummary() {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get("/api/platform/statistics/summary");
      setSummary(response.data.summary);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <section className="platform-summary">
      <div className="platform-page-heading">
        <div>
          <p className="eyebrow">Pamja e përgjithshme</p>
          <h1>Përmbledhja e platformës</h1>
          <p>
            Statistika të agreguara pa ekspozuar të dhënat private të
            universiteteve.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadSummary}
          disabled={loading}
        >
          <RefreshCw size={16} /> Rifresko
        </Button>
      </div>

      {message && (
        <p className="form-message error" role="alert">
          {message}
        </p>
      )}

      <div className="platform-metrics" aria-busy={loading}>
        {metrics.map(({ key, label, icon: Icon }) => (
          <article key={key}>
            <Icon size={19} />
            <span>{label}</span>
            <strong>{loading ? "—" : (summary?.[key] ?? 0)}</strong>
          </article>
        ))}
      </div>

      {!loading && summary && (
        <div className="platform-distribution">
          <div>
            <p className="eyebrow">Profili institucional</p>
            <h2>Llojet e universiteteve</h2>
          </div>
          <dl>
            <div>
              <dt>Publike</dt>
              <dd>{summary.publicUniversities}</dd>
            </div>
            <div>
              <dt>Private</dt>
              <dd>{summary.privateUniversities}</dd>
            </div>
            <div>
              <dt>Kërkesa të refuzuara</dt>
              <dd>{summary.rejectedRegistrations}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
