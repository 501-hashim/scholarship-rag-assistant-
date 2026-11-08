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
          <span className="brand-icon">S</span>
          <span>
            Scholarship<span className="brand-sub">NAVIGATOR</span>
          </span>
        </a>
        <div className="workspace-label">STUDENT WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            ["/", "◫", "Overview"],
            ["/eligibility", "✓", "Check Eligibility"],
            ["/scholarships", "▤", "Scholarships"],
            ["/assistant", "✦", "AI assistant"],
          ].map(([path, icon, label]) => (
            <a
              key={path}
              className={
                (path === "/" ? route === "/" : route.startsWith(path))
                  ? "active"
                  : ""
              }
              href={"#" + path}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {label === "AI assistant" && <small>ASK</small>}
              {label === "Check Eligibility" && <small>NEW</small>}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✓</span>
          <strong>Clarity, with evidence.</strong>
          <p>Ask a question. Explore the sources. Take your next step.</p>
        </div>
        <div className="sidebar-footer">
          <span
            className="avatar"
            style={{
              background: "#204c3c",
              color: "#e1eed6",
              fontWeight: 700,
            }}
          >
            {userInitial}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {currentUser?.name || "Authenticated Student"}
            </strong>
            <small
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {currentUser?.email || "Student"}
            </small>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                border: 0,
                background: "transparent",
                color: "#c62828",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 4px",
              }}
              title="Sign Out"
            >
              Sign Out
            </button>
          )}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>Scholarship Eligibility Navigator</span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span className="data-label">
              <i /> Dataset grounded
            </span>
            {currentUser && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#eef3ea",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                }}
              >
                <span style={{ fontWeight: 600, color: "#254839" }}>
                  👤 {currentUser.name}
                </span>
                <span style={{ color: "#77877e", fontSize: "11px" }}>
                  ({currentUser.provider === "google" ? "Google" : "Email"})
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#a93226",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      marginLeft: "4px",
                    }}
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                A LITTLE GUIDANCE. MORE POSSIBILITY.
              </span>
              <h1>{title}</h1>
              <p>
                Find support for your education, with the information you need
                to move forward.
              </p>
            </div>
            {route !== "/assistant" && (
              <button
                className="button primary"
                onClick={() => navigate("/assistant")}
              >
                Ask the AI assistant ↗
              </button>
            )}
          </div>
          {children}
          <footer className="page-footer">
            <span>Scholarship Navigator</span>
            <span>Scholarship guidance, grounded in sources.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
