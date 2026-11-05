import { useState } from "react";
import { loginWithEmail, registerWithEmail } from "./auth";
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

  return (
    <div style={{ maxWidth: "480px", margin: "20px auto" }}>
      <div className="panel" style={{ padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: "22px", margin: "0 0 6px", color: "#1f382e", textAlign: "center" }}>
          {mode === "login" ? "Student Sign In" : "Create Student Account"}
        </h2>
        <p style={{ fontSize: "13px", color: "#6d7d74", textAlign: "center", marginBottom: "20px" }}>
          {mode === "login"
            ? "Enter your student credentials to continue."
            : "Register your account to access your workspace."}
        </p>

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
              padding: "9px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              background: mode === "login" ? "#fff" : "transparent",
              color: mode === "login" ? "#1f382e" : "#728379",
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
              padding: "9px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              background: mode === "register" ? "#fff" : "transparent",
              color: mode === "register" ? "#1f382e" : "#728379",
              cursor: "pointer",
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="error" role="alert" style={{ marginBottom: "16px", fontSize: "12px", padding: "10px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label style={{ marginBottom: "12px", display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Full Name</span>
              <input
                type="text"
                placeholder="e.g. Your Name"
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
            />
          </label>

          <label style={{ marginBottom: "18px", display: "grid", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#365145" }}>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ border: 0, background: "transparent", color: "#528774", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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
            style={{ width: "100%", padding: "12px", justifyContent: "center" }}
          >
            {busy ? "Authenticating…" : mode === "login" ? "Sign In with Email" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
