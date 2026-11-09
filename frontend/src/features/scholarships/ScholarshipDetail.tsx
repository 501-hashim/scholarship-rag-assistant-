import Assistant from "@/features/assistant/Assistant";
import { Facts, Source } from "@/components/components";
import type { Citation, Scheme } from "@/types/types";

export default function ScholarshipDetail({
  detail,
  schemeId,
}: {
  detail: { scholarship: Scheme; citation: Citation };
  schemeId: string;
}) {
  return (
    <section className="panel detail">
      <div className="detail-nav">
        <a href="#/scholarships" className="back-link">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to registry</span>
        </a>
        <span className="archive-code">DOSSIER // SCH-{schemeId.slice(0, 10).toUpperCase()}</span>
      </div>

      <div className="detail-heading">
        <div className="detail-heading-top">
          <span className="eyebrow">{detail.scholarship.provider || "Government Ministry / Authority"}</span>
          <span className="status-dot live" title="Active Index" />
        </div>
        <h2>{detail.scholarship.name}</h2>
        {detail.scholarship.objective && (
          <p className="detail-objective">{detail.scholarship.objective}</p>
        )}
      </div>

      <div className="detail-grid">
        <div className="detail-sections">
          <section className="dossier-block">
            <h3>Target Groups & Beneficiaries</h3>
            <Facts value={detail.scholarship.target_groups} />
          </section>

          <section className="dossier-block">
            <h3>Eligibility Criteria</h3>
            <Facts value={detail.scholarship.eligibility} />
          </section>

          <section className="dossier-block">
            <h3>Financial Assistance & Benefits</h3>
            <Facts value={detail.scholarship.benefits} />
          </section>

          <section className="dossier-block">
            <h3>Required Documents</h3>
            <Facts value={detail.scholarship.documents_required} />
          </section>

          <section className="dossier-block">
            <h3>Application Procedure</h3>
            <Facts value={detail.scholarship.application} />
          </section>

          {Boolean(detail.scholarship.exclusions) && (
            <section className="dossier-block">
              <h3>Exclusions & Restrictions</h3>
              <Facts value={detail.scholarship.exclusions} />
            </section>
          )}

          {Boolean(detail.scholarship.selection) && (
            <section className="dossier-block">
              <h3>Selection & Renewal Directives</h3>
              <Facts value={detail.scholarship.selection} />
            </section>
          )}

          {Boolean(detail.scholarship.important_notes?.length) && (
            <section className="dossier-block notes">
              <h3>Administrative Notes</h3>
              <Facts value={detail.scholarship.important_notes} />
            </section>
          )}
        </div>

        <aside className="detail-sidebar">
          <div className="detail-aside">
            <span className="aside-eyebrow">Corpus Citation</span>
            <h4>Official Source Record</h4>
            <p>
              Information extracted directly from authorized gazette notifications.
              The awarding authority makes final determinations upon application submission.
            </p>
            <Source citation={detail.citation} />
          </div>
        </aside>
      </div>

      <div className="detail-assistant-wrap">
        <Assistant schemeId={schemeId} />
      </div>
    </section>
  );
}
