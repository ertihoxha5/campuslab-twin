import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const statusLabels = {
  active: "Aktiv",
  suspended: "Pezulluar",
  pending: "Në pritje",
  rejected: "Refuzuar",
};

export function PlatformUniversitiesPage() {
  const [universities, setUniversities] = useState([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadUniversities = useCallback(
    async ({ clearMessage = true } = {}) => {
      setLoading(true);
      if (clearMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({ pageSize: "50" });
        if (status) parameters.set("status", status);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const response = await api.get(
          `/api/platform/universities?${parameters}`,
        );
        setUniversities(response.data.universities);
        setSelected((current) =>
          current
            ? (response.data.universities.find(
                (item) => String(item.id) === String(current.id),
              ) ?? null)
            : null,
        );
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [status, submittedSearch],
  );

  useEffect(() => {
    loadUniversities();
  }, [loadUniversities]);

  async function changeStatus(nextStatus) {
    if (nextStatus === "suspended" && reason.trim().length < 3) {
      setMessage({
        type: "error",
        text: "Shkruani arsyen e pezullimit me të paktën 3 karaktere.",
      });
      return;
    }

    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.patch(
        `/api/platform/universities/${selected.id}/status`,
        { status: nextStatus, reason: reason.trim() },
      );
      setMessage({ type: "success", text: response.data.message });
      setSelected(null);
      setReason("");
      await loadUniversities({ clearMessage: false });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  return (
    <section className="platform-universities">
      <div className="platform-page-heading">
        <div>
          <p className="eyebrow">Kontrolli institucional</p>
          <h1>Universitetet</h1>
          <p>
            Menaxhoni qasjen e universiteteve pa hyrë në të dhënat e tyre
            private.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadUniversities}
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
            aria-label="Kërko universitetet"
          />
        </form>
        <label>
          <span>Statusi</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSelected(null);
            }}
          >
            <option value="">Të gjitha</option>
            <option value="active">Aktiv</option>
            <option value="suspended">Pezulluar</option>
          </select>
        </label>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <div className="university-management-grid">
        <div className="university-table-wrap">
          <table className="university-table">
            <thead>
              <tr>
                <th>Universiteti</th>
                <th>Qyteti</th>
                <th>Përdorues</th>
                <th>Statusi</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                universities.map((university) => (
                  <tr
                    key={university.id}
                    className={
                      String(selected?.id) === String(university.id)
                        ? "is-selected"
                        : ""
                    }
                    onClick={() => {
                      setSelected(university);
                      setReason("");
                      setMessage({ type: "", text: "" });
                    }}
                  >
                    <td>
                      <button type="button">
                        <span className="request-acronym">
                          {university.acronym}
                        </span>
                        <span>
                          <strong>{university.name}</strong>
                          <small>{university.representativeEmail}</small>
                        </span>
                      </button>
                    </td>
                    <td>{university.city}</td>
                    <td>{university.userCount}</td>
                    <td>
                      <span
                        className={`status-badge status-${university.status}`}
                      >
                        {statusLabels[university.status]}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {loading && (
            <p className="platform-empty">Po ngarkohen universitetet…</p>
          )}
          {!loading && universities.length === 0 && (
            <p className="platform-empty">
              Nuk u gjet asnjë universitet për këta filtra.
            </p>
          )}
        </div>

        <aside className="university-action-panel">
          {!selected ? (
            <div className="platform-empty detail-empty">
              <strong>Zgjidhni një universitet</strong>
              <span>Kontrollet e statusit do të shfaqen këtu.</span>
            </div>
          ) : (
            <>
              <span className={`status-badge status-${selected.status}`}>
                {statusLabels[selected.status]}
              </span>
              <h2>{selected.name}</h2>
              <p>{selected.representativeEmail}</p>

              {selected.status === "active" ? (
                <div className="university-status-action">
                  <div className="action-warning">
                    <Ban size={20} />
                    <p>
                      Pezullimi revokon sesionet aktive dhe ndalon kyçjen e të
                      gjithë përdoruesve të universitetit.
                    </p>
                  </div>
                  <label>
                    Arsyeja e pezullimit
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows="4"
                      placeholder="Shpjegoni arsyen e pezullimit"
                    />
                  </label>
                  <Button
                    type="button"
                    onClick={() => changeStatus("suspended")}
                    disabled={actionLoading}
                  >
                    <Ban size={17} /> Pezullo universitetin
                  </Button>
                </div>
              ) : (
                <div className="university-status-action">
                  <div className="action-success">
                    <CheckCircle2 size={20} />
                    <div>
                      <strong>Arsyeja e pezullimit</strong>
                      <p>{selected.suspensionReason || "Nuk është shënuar."}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => changeStatus("active")}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 size={17} /> Riaktivizo universitetin
                  </Button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
