import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const statuses = {
  pending: "Në pritje",
  approved: "Aprovuar",
  rejected: "Refuzuar",
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("sq-AL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export function PlatformRegistrationRequestsPage() {
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadRequests = useCallback(
    async ({ clearMessage = true } = {}) => {
      setLoading(true);
      if (clearMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({ pageSize: "50" });
        if (status) parameters.set("status", status);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const response = await api.get(
          `/api/platform/registration-requests?${parameters}`,
        );
        setRequests(response.data.registrationRequests);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [status, submittedSearch],
  );

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function openDetails(requestId) {
    setDetailLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.get(
        `/api/platform/registration-requests/${requestId}`,
      );
      setSelected(response.data.registrationRequest);
      setReason("");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDetailLoading(false);
    }
  }

  async function decide(decision) {
    if (decision === "rejected" && reason.trim().length < 3) {
      setMessage({
        type: "error",
        text: "Shkruani arsyen e refuzimit me të paktën 3 karaktere.",
      });
      return;
    }

    setDecisionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.patch(
        `/api/platform/registration-requests/${selected.id}/decision`,
        { decision, reason: reason.trim() },
      );
      setMessage({ type: "success", text: response.data.message });
      setSelected(null);
      setReason("");
      await loadRequests({ clearMessage: false });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDecisionLoading(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  return (
    <section className="platform-requests">
      <div className="platform-page-heading">
        <div>
          <p className="eyebrow">Shqyrtimi institucional</p>
          <h1>Kërkesat e regjistrimit</h1>
          <p>
            Verifikoni të dhënat e universitetit përpara aprovimit ose
            refuzimit.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadRequests}
          disabled={loading}
        >
          <RefreshCw size={16} /> Rifresko
        </Button>
      </div>

      <div className="platform-filters">
        <form onSubmit={submitSearch}>
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kërko universitetin ose email-in"
            aria-label="Kërko kërkesat"
          />
        </form>
        <label>
          <span>Statusi</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Të gjitha</option>
            <option value="pending">Në pritje</option>
            <option value="approved">Aprovuar</option>
            <option value="rejected">Refuzuar</option>
          </select>
        </label>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <div className="platform-review-grid">
        <div className="platform-request-list" aria-busy={loading}>
          {loading ? (
            <p className="platform-empty">Po ngarkohen kërkesat…</p>
          ) : requests.length === 0 ? (
            <p className="platform-empty">
              Nuk u gjet asnjë kërkesë për këta filtra.
            </p>
          ) : (
            requests.map((request) => (
              <button
                key={request.id}
                type="button"
                className={
                  String(selected?.id) === String(request.id)
                    ? "platform-request-row is-selected"
                    : "platform-request-row"
                }
                onClick={() => openDetails(request.id)}
              >
                <span className="request-acronym">{request.acronym}</span>
                <span className="request-primary">
                  <strong>{request.universityName}</strong>
                  <small>
                    {request.representativeName} · {request.representativeEmail}
                  </small>
                </span>
                <span className={`status-badge status-${request.status}`}>
                  {statuses[request.status]}
                </span>
                <ChevronRight size={17} />
              </button>
            ))
          )}
        </div>

        <aside className="platform-request-detail">
          {detailLoading ? (
            <p className="platform-empty">Po ngarkohen detajet…</p>
          ) : !selected ? (
            <div className="platform-empty detail-empty">
              <strong>Zgjidhni një kërkesë</strong>
              <span>Detajet dhe veprimet do të shfaqen këtu.</span>
            </div>
          ) : (
            <>
              <div className="detail-heading">
                <div>
                  <span className={`status-badge status-${selected.status}`}>
                    {statuses[selected.status]}
                  </span>
                  <h2>{selected.universityName}</h2>
                  <p>{selected.acronym}</p>
                </div>
                <button
                  type="button"
                  className="detail-close"
                  onClick={() => setSelected(null)}
                  aria-label="Mbyll detajet"
                >
                  <X size={18} />
                </button>
              </div>

              <dl className="request-data">
                <div>
                  <dt>Lloji</dt>
                  <dd>
                    {selected.institutionType === "public"
                      ? "Universitet publik"
                      : "Universitet privat"}
                  </dd>
                </div>
                <div>
                  <dt>Qyteti</dt>
                  <dd>{selected.city}</dd>
                </div>
                <div>
                  <dt>Adresa</dt>
                  <dd>{selected.address}</dd>
                </div>
                <div>
                  <dt>Faqja zyrtare</dt>
                  <dd>
                    <a
                      href={selected.officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selected.officialWebsite}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Përfaqësuesi</dt>
                  <dd>{selected.representativeName}</dd>
                </div>
                <div>
                  <dt>Email-i</dt>
                  <dd>{selected.representativeEmail}</dd>
                </div>
                <div>
                  <dt>Telefoni</dt>
                  <dd>{selected.representativePhone || "—"}</dd>
                </div>
                <div>
                  <dt>Dërguar më</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
              </dl>

              {selected.description && (
                <div className="request-description">
                  <span>Përshkrimi</span>
                  <p>{selected.description}</p>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="decision-panel">
                  <label>
                    Arsyeja e refuzimit
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows="3"
                      placeholder="Plotësohet vetëm kur kërkesa refuzohet"
                    />
                  </label>
                  <div>
                    <Button
                      type="button"
                      onClick={() => decide("approved")}
                      disabled={decisionLoading}
                    >
                      <Check size={17} /> Aprovo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => decide("rejected")}
                      disabled={decisionLoading}
                    >
                      <X size={17} /> Refuzo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
