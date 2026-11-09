import type { Scheme } from "@/types/types";
import { navigate } from "@/services/navigation";

export default function Dashboard({ schemes }: { schemes: Scheme[] }) {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">National Scholarship Index & Gazette</span>
          <h2>
            Verified eligibility criteria.
            <br />
            Exact source citations.
          </h2>
          <p>
            Search central and state government scholarships in plain English.
            Review income ceilings, academic criteria, and required application documents
            grounded directly in official gazette guidelines.
          </p>
          <div className="hero-actions">
            <button
              className="button light"
              onClick={() => navigate("/assistant")}
            >
              Ask about scholarships <span aria-hidden="true">→</span>
            </button>
            <button
              className="button secondary-hero"
              onClick={() => navigate("/eligibility")}
            >
              Check eligibility
            </button>
          </div>
        </div>

        <div className="hero-ledger" aria-label="Official Scholarship Registry Preview">
          <div className="ledger-card">
            <div className="ledger-header">
              <span className="ledger-stamp">REGISTRY // 2026</span>
              <span className="ledger-status">
                <span className="status-dot live" /> Verified Corpus
              </span>
            </div>
            <div className="ledger-entries">
              <div className="ledger-row">
                <div className="ledger-cell-main">
                  <strong>Pragati Scholarship for Girls</strong>
                  <small>AICTE · Technical Degree & Diploma</small>
                </div>
                <div className="ledger-cell-amt">₹50,000 / yr</div>
              </div>
              <div className="ledger-row">
                <div className="ledger-cell-main">
                  <strong>Central Sector Scheme (CSSS)</strong>
                  <small>Dept. of Higher Education · Top 20th %ile</small>
                </div>
                <div className="ledger-cell-amt">₹12,000–₹20,000</div>
              </div>
              <div className="ledger-row">
                <div className="ledger-cell-main">
                  <strong>Post-Matric Scholarship (SC/ST)</strong>
                  <small>Ministry of Social Justice & Empowerment</small>
                </div>
                <div className="ledger-cell-amt">100% Tuition</div>
              </div>
            </div>
            <div className="ledger-footer">
              <span className="ledger-meta">Official Index · Grounded in Ministry Guidelines</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="Workspace summary">
        <div className="stat-card">
          <div className="stat-label">Indexed Schemes</div>
          <strong className="stat-value">{schemes.length || 139}</strong>
          <span className="stat-caption">Official government gazettes</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Source Traceability</div>
          <strong className="stat-value">100%</strong>
          <span className="stat-caption">Exact chunk citation check</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rule Verification</div>
          <strong className="stat-value">Deterministic</strong>
          <span className="stat-caption">Income, category & discipline rules</span>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <h2>Featured Schemes</h2>
          <p>Verified higher education opportunities from the scholarship corpus.</p>
        </div>
        <a href="#/scholarships" className="browse-link">
          View all scholarships <span aria-hidden="true">→</span>
        </a>
      </div>
    </>
  );
}
