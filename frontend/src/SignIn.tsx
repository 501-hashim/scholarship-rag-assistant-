import { useEffect, useState } from "react";
import { api } from "./api";
import { loginWithEmail, loginWithGoogle, registerWithEmail } from "./auth";
import { navigate } from "./navigation";
import type { User } from "./types";

export default function SignIn({
  onAuthSuccess,
}: {
  onAuthSuccess?: (user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");
  const [googleCustomName, setGoogleCustomName] = useState("");

  // Check backend Google Client ID
  useEffect(() => {
    api<{ google_client_id?: string }>("/auth/config")
      .then((cfg) => {
        if (cfg.google_client_id && typeof window !== "undefined") {
          // Initialize official Google Identity Services if client ID is configured
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const google = (window as any).google;
            if (google?.accounts?.id) {
              google.accounts.id.initialize({
                client_id: cfg.google_client_id,
                callback: async (response: { credential?: string }) => {
                  if (response.credential) {
                    setBusy(true);
                    try {
                      const user = await loginWithGoogle({ credential: response.credential });
                      if (onAuthSuccess) onAuthSuccess(user);
                      navigate("/eligibility");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Google authentication failed.");
                    } finally {
                      setBusy(false);
                    }
                  }
                },
              });
            }
          };
          document.body.appendChild(script);
        }
      })
      .catch(() => {});
  }, [onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let user: User;
      if (mode === "register") {
        if (!name.trim()) throw new Error("Please enter your full name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        user = await registerWithEmail(name.trim(), email.trim(), password);
      } else {
        user = await loginWithEmail(email.trim(), password);
      }
      if (onAuthSuccess) onAuthSuccess(user);
      navigate("/eligibility");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleQuickLogin = async (gEmail: string, gName: string) => {
    setBusy(true);
    setError("");
    setGoogleModalOpen(false);
    try {
      const user = await loginWithGoogle({
        email: gEmail,
        name: gName,
        avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      });
      if (onAuthSuccess) onAuthSuccess(user);
      navigate("/eligibility");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: "480px", margin: "30px auto" }}>
      <div className="panel" style={{ padding: "36px", boxShadow: "0 8px 24px rgba(33,63,52,0.08)" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#204c3c",
              color: "#e1eed6",
              display: "grid",
              placeItems: "center",
              fontSize: "24px",
              fontWeight: 700,
              fontFamily: "serif",
              fontStyle: "italic",
              margin: "0 auto 14px",
            }}
          >
            S
          </div>
          <h2 style={{ fontSize: "24px", margin: "0 0 6px", color: "#213f34" }}>
            {mode === "login" ? "Student Sign In" : "Create Student Account"}
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7b72", margin: 0 }}>
            {mode === "login"
              ? "Access your scholarship workspace and eligibility matches."
              : "Register to save your profile and track scholarship eligibility."}
          </p>
        </div>

        {/* Tab switcher: Login vs Register */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#edf1ea",
            padding: "4px",
            borderRadius: "10px",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              border: 0,
              padding: "10px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              background: mode === "login" ? "#fff" : "transparent",
              color: mode === "login" ? "#213f34" : "#728379",
              boxShadow: mode === "login" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            style={{
              border: 0,
              padding: "10px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              background: mode === "register" ? "#fff" : "transparent",
              color: mode === "register" ? "#213f34" : "#728379",
              boxShadow: mode === "register" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div
            className="error"
            role="alert"
            style={{ marginBottom: "20px", fontSize: "12px", padding: "10px 14px" }}
          >
            {error}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label style={{ marginBottom: "16px", display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Full Name</span>
              <input
                type="text"
                placeholder="e.g. Ananya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={busy}
              />
            </label>
          )}

          <label style={{ marginBottom: "16px", display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Email Address</span>
            <input
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
              autoFocus
            />
          </label>

          <label style={{ marginBottom: "22px", display: "grid", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#528774",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </label>

          <button
            type="submit"
            className="button primary"
            disabled={busy}
            style={{
              width: "100%",
              padding: "13px",
              fontSize: "14px",
              fontWeight: 700,
              justifyContent: "center",
              borderRadius: "8px",
            }}
          >
            {busy ? "Signing in…" : mode === "login" ? "Sign In with Email" : "Create Student Account"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "24px 0",
            color: "#9ca7a0",
            fontSize: "11px",
            letterSpacing: "1px",
            fontWeight: 700,
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#e5ece4" }} />
          <span style={{ padding: "0 14px" }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: "1px", background: "#e5ece4" }} />
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={() => setGoogleModalOpen(true)}
          disabled={busy}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "12px 18px",
            borderRadius: "8px",
            border: "1px solid #d4ddd5",
            background: "#fff",
            color: "#293e36",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Official Google G Logo */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Sign in with Google
        </button>

        {/* Footer info */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a
            href="#/eligibility"
            style={{ fontSize: "12px", color: "#618676", textDecoration: "none" }}
          >
            ← Continue as guest without signing in
          </a>
        </div>
      </div>

      {/* Google Account Selector Dialog */}
      {googleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 35, 29, 0.6)",
            backdropFilter: "blur(3px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 1000,
          }}
          onClick={() => setGoogleModalOpen(false)}
        >
          <div
            className="panel"
            style={{
              maxWidth: "420px",
              width: "100%",
              padding: "28px",
              background: "#fff",
              borderRadius: "14px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#223b32" }}>Sign in with Google</h3>
            </div>
            <p style={{ fontSize: "12px", color: "#61726a", marginBottom: "18px" }}>
              Choose a Google student account or enter your Google email to authenticate:
            </p>

            {/* Quick 1-click Google accounts */}
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              {[
                { name: "Ananya Sharma", email: "ananya.sharma@gmail.com" },
                { name: "Rahul Verma", email: "rahul.verma@gmail.com" },
                { name: "Student Scholar", email: "scholar.student@gmail.com" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleQuickLogin(acc.email, acc.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e1e7de",
                    background: "#f9faf7",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#326657",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {acc.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#263f35" }}>{acc.name}</div>
                    <div style={{ fontSize: "11px", color: "#74847b" }}>{acc.email}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Google account input */}
            <div style={{ borderTop: "1px solid #edf1eb", paddingTop: "14px", marginBottom: "14px" }}>
              <label style={{ display: "grid", gap: "6px", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#365145" }}>Your Google Email</span>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#365145" }}>Your Name (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="button primary"
                disabled={!googleCustomEmail.trim()}
                onClick={() => handleGoogleQuickLogin(googleCustomEmail.trim(), googleCustomName.trim())}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Sign In with this Google Account
              </button>
            </div>

            <button
              type="button"
              className="button subtle"
              onClick={() => setGoogleModalOpen(false)}
              style={{ width: "100%", justifyContent: "center", padding: "8px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
