import { useEffect, useState } from "react";
import { api } from "./api";
import { fetchCurrentUser, getStoredUser, logout } from "./auth";
import Assistant from "./Assistant";
import EligibilityChecker from "./EligibilityChecker";
import AuthGateway from "./AuthGateway";
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
    if (!currentUser) return;
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
  }, [currentUser]);

  const schemeId = route.startsWith("/scholarships/")
    ? decodeURIComponent(route.split("/")[2])
    : undefined;

  useEffect(() => {
    if (!currentUser || !schemeId) {
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
  }, [currentUser, schemeId]);

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

  // If candidate is not authenticated, render standalone authentication gateway UI
  if (!currentUser) {
    return (
      <AuthGateway
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (route === "/signin" || route === "/login") {
            navigate("/");
          }
        }}
      />
    );
  }

  const title =
    route === "/assistant"
      ? "Let’s find some clarity"
      : route === "/eligibility"
        ? "Check your scholarship eligibility"
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
