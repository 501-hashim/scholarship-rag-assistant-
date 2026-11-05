import { useEffect, useState } from "react";
import { api } from "./api";
import { fetchCurrentUser, getStoredUser, logout } from "./auth";
import Assistant from "./Assistant";
import EligibilityChecker from "./EligibilityChecker";
import SignIn from "./SignIn";
import Workspace from "./Workspace";
import Dashboard from "./Dashboard";
import ScholarshipDetail from "./ScholarshipDetail";
import ScholarshipList from "./ScholarshipList";
import { navigate } from "./navigation";
import type { Citation, Scheme, User } from "./types";

export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [detail, setDetail] = useState<{
    scholarship: Scheme;
    citation: Citation;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());

  useEffect(() => {
    sessionStorage.removeItem("scholar-profile");
    const onHash = () => setRoute(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (route === "/profile") window.location.hash = "/eligibility";
  }, [route]);

  // Synchronize authenticated user with backend on startup
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setCurrentUser(u);
    });
  }, []);

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    navigate("/");
  };

  useEffect(() => {
    let active = true;
    api<{ results: Scheme[] }>("/scholarships/search", { top_k: 16 })
      .then((d) => {
        if (active) setSchemes(d.results);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const schemeId = route.startsWith("/scholarships/")
    ? decodeURIComponent(route.split("/")[2])
    : undefined;

  useEffect(() => {
    if (!schemeId) {
      setDetail(null);
      return;
    }
    let active = true;
    setBusy(true);
    setError("");
    api<{ scholarship: Scheme; citation: Citation }>(
      "/scholarships/" + encodeURIComponent(schemeId),
    )
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [schemeId]);

  async function discover(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ results: Scheme[] }>("/scholarships/search", {
        question: search,
        top_k: 16,
      });
      setSchemes(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const isAuthRoute = route === "/signin" || route === "/login";

  const title =
    route === "/assistant"
      ? "Let’s find some clarity"
      : route === "/eligibility"
        ? "Check your scholarship eligibility"
        : isAuthRoute
          ? currentUser
            ? "Your student account"
            : "Sign in to your student workspace"
          : route.startsWith("/scholarships")
            ? "Explore your opportunities"
            : "Your next chapter starts here";

  return (
    <Workspace
      route={route}
      title={title}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {busy && (
        <p role="status" className="loading">
          Loading scholarship information…
        </p>
      )}

      {/* Authentication Route */}
      {isAuthRoute && (
        <>
          {currentUser ? (
            <div style={{ maxWidth: "560px", margin: "20px auto" }}>
              <div
                className="panel"
                style={{
                  padding: "36px",
                  textAlign: "center",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "#204c3c",
                    color: "#e1eed6",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "26px",
                    fontWeight: 800,
                    margin: "0 auto 16px",
                  }}
                >
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "S"}
                </div>
                <h2 style={{ margin: "0 0 6px" }}>{currentUser.name}</h2>
                <p style={{ margin: "0 0 16px", color: "#61746b" }}>
                  {currentUser.email}
                </p>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    background: "#eaf2e7",
                    color: "#214a37",
                    fontSize: "12px",
                    fontWeight: 600,
                    marginBottom: "24px",
                  }}
                >
                  Authenticated via{" "}
                  {currentUser.provider === "google"
                    ? "Google Account"
                    : "Email & Password"}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="button primary"
                    onClick={() => navigate("/eligibility")}
                  >
                    Check My Scholarship Eligibility →
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => navigate("/assistant")}
                  >
                    Ask AI Assistant ↗
                  </button>
                  <button
                    className="button subtle"
                    onClick={handleLogout}
                    style={{ color: "#c62828" }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <SignIn onAuthSuccess={(u) => setCurrentUser(u)} />
          )}
        </>
      )}

      {route === "/" && <Dashboard schemes={schemes} />}
      {route === "/eligibility" && <EligibilityChecker />}
      {route === "/assistant" && <Assistant />}
      {schemeId && detail && (
        <ScholarshipDetail detail={detail} schemeId={schemeId} />
      )}
      {(route === "/" || route === "/scholarships") && (
        <ScholarshipList
          route={route}
          schemes={schemes}
          search={search}
          setSearch={setSearch}
          busy={busy}
          error={error}
          discover={discover}
        />
      )}
    </Workspace>
  );
}
