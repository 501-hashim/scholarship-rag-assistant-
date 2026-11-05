import { useEffect, useRef, useState } from "react";
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

  // Google OAuth configuration
  const [googleClientId, setGoogleClientId] = useState<string>(
    localStorage.getItem("google_client_id") || "",
  );
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tokenClientRef = useRef<any>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize Google Identity Services
  const initGoogleAuth = (clientId: string) => {
    if (!clientId || typeof window === "undefined") return;

    const setupGsi = () => {
      const google = (window as any).google;
      if (!google?.accounts) return;

      // 1. Setup ID Token receiver (One Tap and official rendered button)
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (response.credential) {
              setBusy(true);
              setError("");
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
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: 340,
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
          });
        }
      } catch (err) {
        console.warn("Google Accounts ID init error:", err);
      }

      // 2. Setup OAuth2 Token Client with prompt='select_account'
      // This forces Google to show ALL accounts logged into the system/browser
      try {
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          prompt: "select_account",
          callback: async (tokenResponse: { access_token?: string; error?: string; error_description?: string }) => {
            if (tokenResponse.error) {
              setError(tokenResponse.error_description || tokenResponse.error || "Google authorization cancelled.");
              return;
            }
            if (tokenResponse.access_token) {
              setBusy(true);
              setError("");
              try {
                const user = await loginWithGoogle({ access_token: tokenResponse.access_token });
                onAuthSuccess(user);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Google login failed.");
              } finally {
                setBusy(false);
              }
            }
          },
        });
      } catch (err) {
        console.warn("Google OAuth2 Token Client init error:", err);
      }
    };

    if ((window as any).google?.accounts) {
      setupGsi();
    } else {
      const timer = setInterval(() => {
        if ((window as any).google?.accounts) {
          clearInterval(timer);
          setupGsi();
        }
      }, 200);
      setTimeout(() => clearInterval(timer), 8000);
    }
  };

  // Fetch backend config on mount
  useEffect(() => {
    api<{ google_client_id?: string }>("/auth/config")
      .then((cfg) => {
        const id = cfg.google_client_id || localStorage.getItem("google_client_id") || "";
        if (id) {
          setGoogleClientId(id);
          localStorage.setItem("google_client_id", id);
          initGoogleAuth(id);
        }
      })
      .catch(() => {});
  }, []);

  // When clicking "Sign in with Google"
  const handleGoogleSignInClick = () => {
    setError("");

    if (!googleClientId) {
      // Prompt user/admin to connect Google OAuth Client ID
      setConfigModalOpen(true);
      return;
    }

    if (tokenClientRef.current) {
      // Trigger Google's native popup showing all system Gmail accounts
      try {
        tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
      } catch (err) {
        console.error("Failed to request Google access token:", err);
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.prompt();
        }
      }
    } else {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.prompt();
      } else {
        // Re-initialize and prompt
        initGoogleAuth(googleClientId);
        setError("Connecting to Google Identity Services… Please click again in a second.");
      }
    }
  };

  // Save custom Google Client ID
  const handleSaveGoogleClientId = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = customClientIdInput.trim();
    if (!id) return;

    setSavingConfig(true);
    setError("");
    try {
      await api("/auth/config/update", { google_client_id: id });
      setGoogleClientId(id);
      localStorage.setItem("google_client_id", id);
      setConfigModalOpen(false);
      initGoogleAuth(id);

      // Launch Google account chooser immediately
      setTimeout(() => {
        const google = (window as any).google;
        if (google?.accounts?.oauth2) {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: id,
            scope: "email profile openid",
            prompt: "select_account",
            callback: async (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                setBusy(true);
                try {
                  const user = await loginWithGoogle({ access_token: tokenResponse.access_token });
                  onAuthSuccess(user);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Google authentication failed.");
                } finally {
                  setBusy(false);
                }
              }
            },
          });
          tokenClientRef.current = client;
          client.requestAccessToken({ prompt: "select_account" });
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Google Client ID.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Email & Password submission
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
          maxWidth: "960px",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          background: "#fff",
        }}
        className="auth-gateway-box"
      >
        {/* Left Side: Platform Highlights */}
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

            <h1 style={{ fontSize: "27px", lineHeight: "1.3", color: "#f4f7f0", margin: "0 0 14px", fontWeight: 800 }}>
              Unlock scholarship opportunities tailored to you.
            </h1>

            <p style={{ fontSize: "13px", color: "#b0c9be", lineHeight: "1.7", margin: "0 0 28px" }}>
              Sign in with your Google or student account to access government scholarship databases, eligibility verification, and AI guidance.
            </p>

            {/* Highlights */}
            <div style={{ display: "grid", gap: "12px" }}>
              {[
                { icon: "🎓", title: "16 Verified Scholarship Schemes", desc: "UGC, AICTE, and Ministry of Education schemes with verified guidelines." },
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

        {/* Right Side: Product-Ready Authentication Form */}
        <div style={{ padding: "44px 38px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "22px", margin: "0 0 6px", color: "#1f382e" }}>
              {mode === "login" ? "Student Sign In" : "Create Student Account"}
            </h2>
            <p style={{ fontSize: "13px", color: "#6d7d74", margin: 0 }}>
              {mode === "login"
                ? "Sign in using your Google account or email credentials."
                : "Register your student credentials to access your dashboard."}
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
              marginBottom: "20px",
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
                cursor: "pointer",
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
                cursor: "pointer",
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
              style={{ marginBottom: "16px", fontSize: "12px", padding: "10px 14px", borderRadius: "8px" }}
            >
              {error}
            </div>
          )}

          {/* Google Sign-In Primary Button */}
          <button
            type="button"
            onClick={handleGoogleSignInClick}
            disabled={busy}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "12px 18px",
              borderRadius: "8px",
              border: "1px solid #c8d3ca",
              background: "#fff",
              color: "#1e372e",
              fontSize: "14px",
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              marginBottom: "12px",
            }}
          >
            <svg width="19" height="19" viewBox="0 0 48 48">
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
            <span>Sign in with Google</span>
          </button>

          {/* Official Google Button Render Mount (when client_id initialized) */}
          <div ref={googleBtnContainerRef} style={{ display: "none" }} />

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "16px 0",
              color: "#9ca7a0",
              fontSize: "11px",
              letterSpacing: "1px",
              fontWeight: 700,
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#e5ece4" }} />
            <span style={{ padding: "0 12px" }}>OR CONTINUE WITH EMAIL</span>
            <div style={{ flex: 1, height: "1px", background: "#e5ece4" }} />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <label style={{ marginBottom: "12px", display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Full Name</span>
                <input
                  type="text"
                  placeholder="e.g. Student Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
            )}

            <label style={{ marginBottom: "12px", display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Email Address</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                autoFocus
              />
            </label>

            <label style={{ marginBottom: "18px", display: "grid", gap: "6px" }}>
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
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
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
              {busy ? "Authenticating…" : mode === "login" ? "Sign In & Enter Dashboard →" : "Create Account & Enter →"}
            </button>
          </form>
        </div>
      </div>

      {/* Google OAuth Setup Dialog (appears if no client_id is configured) */}
      {configModalOpen && (
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
          onClick={() => setConfigModalOpen(false)}
        >
          <div
            className="panel"
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "28px",
              background: "#fff",
              borderRadius: "14px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
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
              <h3 style={{ margin: 0, fontSize: "17px", color: "#223b32" }}>Connect Google Sign-In</h3>
            </div>

            <p style={{ fontSize: "13px", color: "#54685e", lineHeight: "1.6", marginBottom: "16px" }}>
              To open Google’s account chooser showing all Gmail accounts on this system, please provide your Google Cloud OAuth Client ID:
            </p>

            <form onSubmit={handleSaveGoogleClientId}>
              <label style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#365145" }}>
                  Google OAuth 2.0 Web Client ID
                </span>
                <input
                  type="text"
                  placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                  value={customClientIdInput}
                  onChange={(e) => setCustomClientIdInput(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <div
                style={{
                  background: "#f4f8f2",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#476152",
                  lineHeight: "1.5",
                  marginBottom: "16px",
                }}
              >
                <strong>Setup Steps in Google Cloud:</strong>
                <ol style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
                  <li>Go to Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</li>
                  <li>Create OAuth Client ID (Web Application)</li>
                  <li>Set Authorized JavaScript Origin to <code>http://localhost:5173</code></li>
                </ol>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  className="button primary"
                  disabled={savingConfig || !customClientIdInput.trim()}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {savingConfig ? "Saving…" : "Save & Launch Google Sign-In →"}
                </button>
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => setConfigModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
