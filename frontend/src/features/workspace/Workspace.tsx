import type { ReactNode } from "react";
import { navigate } from "@/services/navigation";
import type { User } from "@/types/types";

export default function Workspace({
  route,
  title,
  currentUser,
  onLogout,
  children,
}: {
  route: string;
  title: string;
  currentUser?: User | null;
  onLogout?: () => void;
  children: ReactNode;
}) {
  const userInitial = currentUser?.name
    ? currentUser.name.trim()[0].toUpperCase()
    : "S";

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="M6 14h6" />
            </svg>
          </span>
          <span className="brand-text">
            Scholarship <span className="brand-sub">Navigator</span>
          </span>
        </a>

        <div className="nav-group-label">Navigation</div>
        <nav aria-label="Main navigation">
          {[
            {
              path: "/",
              label: "Overview",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
              ),
            },
            {
              path: "/eligibility",
              label: "Check Eligibility",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 11 3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              ),
            },
            {
              path: "/scholarships",
              label: "Scholarships",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              ),
            },
            {
              path: "/assistant",
              label: "Research Assistant",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" x2="15" y1="9" y2="9" />
                  <line x1="9" x2="13" y1="13" y2="13" />
                </svg>
              ),
            },
          ].map(({ path, label, icon }) => (
            <a
              key={path}
              className={
                (path === "/" ? route === "/" : route.startsWith(path))
                  ? "active"
                  : ""
              }
              href={"#" + path}
            >
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              <span className="nav-label">{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-note">
          <div className="note-badge">
            <span className="status-dot online" />
            <span>Registry Database</span>
          </div>
          <strong>Verified Evidence Base</strong>
          <p>139 central and state schemes indexed with direct gazette source citations.</p>
        </div>

        <div className="sidebar-footer">
          <span className="avatar">
            {userInitial}
          </span>
          <div className="user-info">
            <strong className="user-name">
              {currentUser?.name || "Student Researcher"}
            </strong>
            <small className="user-email">
              {currentUser?.email || "Academic Workspace"}
            </small>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="logout-button"
              title="Sign Out"
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            <span className="crumb-root">Scholarship Navigator</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{title}</span>
          </div>
          <div className="topbar-actions">
            <span className="data-label">
              <span className="status-dot live" /> Verified gazette index
            </span>
            {currentUser && (
              <div className="account-pill">
                <span className="account-name">{currentUser.name}</span>
                <span className="account-provider">
                  {currentUser.provider === "google" ? "Google" : "Email"}
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="account-signout"
                  >
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">National & State Scholarship Index</span>
              <h1>{title}</h1>
              <p>
                Direct access to eligibility criteria, award grants, and required application documents.
              </p>
            </div>
            {route !== "/assistant" && (
              <button
                className="button primary"
                onClick={() => navigate("/assistant")}
              >
                Research with Assistant
              </button>
            )}
          </div>

          {children}

          <footer className="page-footer">
            <div className="footer-left">
              <strong>Scholarship Navigator</strong>
              <span>Grounded scholarship research system for Indian higher education.</span>
            </div>
            <div className="footer-right">
              <span className="footer-tag">Official Gazette Records</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
