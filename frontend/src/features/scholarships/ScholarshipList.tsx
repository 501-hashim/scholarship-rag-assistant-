import { schemeHref } from "@/services/navigation";
import type { Scheme } from "@/types/types";

type Props = {
  route: string;
  schemes: Scheme[];
  search: string;
  setSearch: (v: string) => void;
  busy: boolean;
  error: string;
  discover: (event: React.FormEvent) => Promise<void>;
};

export default function ScholarshipList({
  route,
  schemes,
  search,
  setSearch,
  busy,
  error,
  discover,
}: Props) {
  return (
    <>
      {route === "/scholarships" && (
        <div className="search-row">
          <form onSubmit={discover} className="search-form">
            <label className="sr-only" htmlFor="search">
              Search scholarships
            </label>
            <div className="search-input-wrapper">
              <span className="search-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                id="search"
                placeholder="Filter by scheme name, ministry, caste category, or degree level…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="button primary" disabled={busy}>
              {busy ? "Searching…" : "Search"}
            </button>
          </form>
        </div>
      )}

      <div className="cards">
        {(route === "/" ? schemes.slice(0, 4) : schemes).map((s) => (
          <article className="scholar-card" key={s.scheme_id}>
            <div className="card-top">
              <span className="provider-tag">{s.provider || "Official Authority"}</span>
              <span className="archive-code">SCH-{s.scheme_id.slice(0, 8).toUpperCase()}</span>
            </div>
            <h3>{s.name}</h3>
            <p className="card-objective">
              {s.objective || "Official government scholarship scheme with verified eligibility guidelines and application directives."}
            </p>
            <div className="card-footer">
              <span className="source-note">
                <span className="status-dot live" /> Verified Record
              </span>
              <a href={schemeHref(s.scheme_id)} className="card-link">
                View Scheme Details <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      {!schemes.length && !busy && !error && (
        <div className="panel empty">
          <p>No matching scholarships found in the official registry.</p>
          <small>Try searching with broader terms like "Technical", "Girl", "Merit", or "Post-Matric".</small>
        </div>
      )}
    </>
  );
}
