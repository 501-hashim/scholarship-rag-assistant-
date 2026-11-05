import type { ReactNode } from "react";
import { navigate } from "./navigation";
import type { User } from "./types";

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
    : "G";

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
            [
              "/signin",
              "👤",
              currentUser ? "Student Profile" : "Sign In / Register",
            ],
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
              {path === "/signin" && !currentUser && <small>AUTH</small>}
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
              background: currentUser ? "#204c3c" : "#e5eadc",
              color: currentUser ? "#e1eed6" : "#243f34",
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
              {currentUser ? currentUser.name : "Guest Student"}
            </strong>
            <small
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {currentUser ? currentUser.email : "Not signed in"}
            </small>
          </div>
          {currentUser ? (
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
              Exit
            </button>
          ) : (
            <a
              href="#/signin"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#285d48",
                textDecoration: "none",
              }}
            >
              Login
            </a>
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
            {currentUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#eef3ea",
                  padding: "6px 12px",
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
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                className="button primary"
                href="#/signin"
                style={{
                  fontSize: "11px",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  gap: "6px",
                }}
              >
                Sign In / Register ↗
              </a>
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
