import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const categoryLabels = {
  platform_auth: "Autentikimi",
  university_registration: "Regjistrimet",
  university: "Universitetet",
  platform: "Cilësimet",
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function categoryFor(action) {
  return Object.keys(categoryLabels).find((category) =>
    action.startsWith(`${category}.`),
  );
}

export function PlatformActivityPage() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const parameters = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });
      if (submittedSearch) parameters.set("search", submittedSearch);
      if (category) parameters.set("category", category);
      const response = await api.get(
        `/api/platform/activity?${parameters.toString()}`,
      );
      setActivities(response.data.activities);
      setPagination(response.meta.pagination);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [category, page, submittedSearch]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  return (
    <section className="platform-activity">
      <div className="platform-page-heading">
        <div>
          <p className="eyebrow">Gjurmueshmëria</p>
          <h1>Historiku i veprimeve</h1>
          <p>
            Shikoni veprimet administrative pa hapur të dhënat private të
            universiteteve.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadActivities}
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
            placeholder="Kërko veprimin ose administratorin"
            aria-label="Kërko historikun"
          />
        </form>
        <label>
          <span>Kategoria</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Të gjitha</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p className="form-message error" role="alert">
          {message}
        </p>
      )}

      <div className="activity-list" aria-busy={loading}>
        {loading ? (
          <p className="platform-empty">Po ngarkohet historiku…</p>
        ) : activities.length === 0 ? (
          <p className="platform-empty">
            Nuk u gjet asnjë veprim për këta filtra.
          </p>
        ) : (
          activities.map((activity) => {
            const activityCategory = categoryFor(activity.action);
            return (
              <article key={activity.id}>
                <span className="activity-icon">
                  <History size={17} />
                </span>
                <div>
                  <div className="activity-title">
                    <strong>{activity.description}</strong>
                    {activityCategory && (
                      <span>{categoryLabels[activityCategory]}</span>
                    )}
                  </div>
                  <p>
                    {activity.administratorName} ·{" "}
                    {formatDate(activity.createdAt)}
                  </p>
                  <small>Kodi: {activity.action}</small>
                </div>
              </article>
            );
          })
        )}
      </div>

      {!loading && pagination.total > 0 && (
        <div className="activity-pagination">
          <span>
            {pagination.total} veprime · Faqja {pagination.page} nga{" "}
            {pagination.pages}
          </span>
          <div>
            <Button
              type="button"
              variant="outline"
              aria-label="Faqja e mëparshme"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Faqja tjetër"
              disabled={page >= pagination.pages}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
