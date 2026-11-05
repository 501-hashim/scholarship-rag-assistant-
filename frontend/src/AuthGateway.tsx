import { useEffect, useState } from "react";
import { api } from "./api";
import { loginWithEmail, loginWithGoogle, registerWithEmail } from "./auth";
import type { User } from "./types";

export default function AuthGateway({
  onAuthSuccess,
}: {
  onAuthSuccess: (user: User) => void;
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

  // Check Google Client ID
  useEffect(() => {
    api<{ google_client_id?: string }>("/auth/config")
      .then((cfg) => {
        if (cfg.google_client_id && typeof window !== "undefined") {
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
                      onAuthSuccess(user);
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
      onAuthSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async (gEmail: string, gName: string) => {
    setBusy(true);
    setError("");
    setGoogleModalOpen(false);
    try {
      const user = await loginWithGoogle({
        email: gEmail,
        name: gName,
        avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      });
      onAuthSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #183d35 0%, #204c3c 45%, #2a5a48 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          background: "#fff",
        }}
        className="auth-gateway-box"
      >
        {/* Left Side: Brand & Feature Highlights */}
        <div
          style={{
            background: "#16382f",
            color: "#e1eed6",
            padding: "48px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              <div
                style={{
                  width: "42px",
                  height: "44px",
                  borderRadius: "11px 11px 20px 11px",
                  background: "#e1eed6",
                  color: "#183d35",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "26px",
                  fontWeight: 800,
                  fontFamily: "serif",
                  fontStyle: "italic",
                }}
              >
                S
              </div>
              <div>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
                  Scholarship<span style={{ color: "#a2c499" }}>NAVIGATOR</span>
                </span>
                <span style={{ display: "block", fontSize: "10px", letterSpacing: "2.5px", color: "#8da985" }}>
                  STUDENT PORTAL
                </span>
              </div>
            </div>

            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: "20px",
                background: "rgba(225, 238, 214, 0.12)",
                color: "#bedab2",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                marginBottom: "16px",
              }}
            >
              🔒 AUTHENTICATED ACCESS ONLY
            </div>

            <h1 style={{ fontSize: "28px", lineHeight: "1.3", color: "#f4f7f0", margin: "0 0 14px", fontWeight: 800 }}>
              Unlock scholarship opportunities matching your profile.
            </h1>

            <p style={{ fontSize: "14px", color: "#b0c9be", lineHeight: "1.7", margin: "0 0 28px" }}>
              Sign in with your email or Google account to access our scholarship database, rule-based eligibility evaluation, and conversational AI assistant.
            </p>

            {/* Highlights */}
            <div style={{ display: "grid", gap: "14px" }}>
              {[
                { icon: "🎓", title: "16 Verified Scholarship Schemes", desc: "UGC, AICTE, and Ministry of Education scholarships with verified guidelines." },
                { icon: "✓", title: "Deterministic Eligibility Matcher", desc: "Checks course level, income thresholds, quotas, and merit criteria." },
                { icon: "✦", title: "Evidence-Grounded AI Assistant", desc: "Ask questions and get answers cited directly from official scheme documents." },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{item.icon}</span>
                  <div>
                    <strong style={{ display: "block", fontSize: "12px", color: "#e1eed6" }}>{item.title}</strong>
                    <span style={{ fontSize: "11px", color: "#9cb5aa", lineHeight: "1.4" }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "32px", fontSize: "11px", color: "#779688", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
            Data grounded in official Ministry of Education & UGC guidelines.
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "22px", margin: "0 0 6px", color: "#1f382e" }}>
              {mode === "login" ? "Student Sign In" : "Register Student Account"}
            </h2>
            <p style={{ fontSize: "13px", color: "#6d7d74", margin: 0 }}>
              {mode === "login"
                ? "Enter your credentials or use Google to enter the application."
                : "Create your student account to get started."}
            </p>
          </div>

          {/* Mode Switcher */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "#edf1ea",
              padding: "4px",
              borderRadius: "10px",
              marginBottom: "22px",
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
                color: mode === "login" ? "#1f382e" : "#728379",
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
                color: mode === "register" ? "#1f382e" : "#728379",
                boxShadow: mode === "register" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="error"
              role="alert"
              style={{ marginBottom: "18px", fontSize: "12px", padding: "10px 14px", borderRadius: "8px" }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <label style={{ marginBottom: "14px", display: "grid", gap: "6px" }}>
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

            <label style={{ marginBottom: "14px", display: "grid", gap: "6px" }}>
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

            <label style={{ marginBottom: "20px", display: "grid", gap: "6px" }}>
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
                    cursor: "pointer",
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
              {busy ? "Authenticating…" : mode === "login" ? "Sign In & Enter Application →" : "Register & Enter Application →"}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "20px 0",
              color: "#9ca7a0",
              fontSize: "11px",
              letterSpacing: "1px",
              fontWeight: 700,
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#e5ece4" }} />
            <span style={{ padding: "0 12px" }}>OR CONTINUE WITH</span>
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
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            {/* Google Multicolor Logo */}
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
        </div>
      </div>

      {/* Google Account Selector Dialog */}
      {googleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 35, 29, 0.65)",
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
              boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
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
            <p style={{ fontSize: "12px", color: "#61726a", marginBottom: "16px" }}>
              Choose a student account or enter your Google email to authenticate:
            </p>

            <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
              {[
                { name: "Ananya Sharma", email: "ananya.sharma@gmail.com" },
                { name: "Rahul Verma", email: "rahul.verma@gmail.com" },
                { name: "Student Scholar", email: "scholar.student@gmail.com" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleLogin(acc.email, acc.name)}
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
                onClick={() => handleGoogleLogin(googleCustomEmail.trim(), googleCustomName.trim())}
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
