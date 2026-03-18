"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]     = useState("");
  const [confirm,  setConfirm]      = useState("");
  const [showPw,   setShowPw]       = useState(false);
  const [status,   setStatus]       = useState(null); // null | "success" | "error"
  const [message,  setMessage]      = useState("");
  const [loading,  setLoading]      = useState(false);
  const [countdown, setCountdown]   = useState(null);

  // Start countdown redirect after success
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { router.push("/login"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      setStatus("error"); setMessage("Password must be at least 6 characters."); return;
    }
    if (password !== confirm) {
      setStatus("error"); setMessage("Passwords do not match."); return;
    }
    try {
      setLoading(true); setStatus(null);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      setMessage("Your password has been updated successfully.");
      setCountdown(5);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Failed to update password. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          <span style={{ fontWeight: 700, fontSize: 20, color: "var(--text-heading)" }}>TrustiQR</span>
        </div>

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🔐</div>
            <h2 style={{ margin: "0 0 10px", color: "var(--text-heading)" }}>Password Updated!</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
              Your new password has been saved.
            </p>
            <div style={{
              background: "rgba(30,142,62,0.1)", border: "1px solid rgba(30,142,62,0.3)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              color: "#166534", fontSize: 14,
            }}>
              ✅ {message}
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
              Redirecting to sign in in <strong style={{ color: "var(--primary)" }}>{countdown}s</strong>…
            </p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/login")}>
              Sign In Now
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h2>Set New Password</h2>
            <p>Choose a strong password for your TrustiQR account.</p>

            {status === "error" && (
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#b91c1c", fontSize: 13, border: "1px solid rgba(239,68,68,0.2)", textAlign: "left" }}>
                ❌ {message}
              </div>
            )}

            <div className="input-group password-group">
              <input
                type={showPw ? "text" : "password"}
                placeholder="New password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <span className="show-password" onClick={() => setShowPw(!showPw)}>
                {showPw ? "Hide" : "Show"}
              </span>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div style={{ marginBottom: 12, marginTop: -8 }}>
                <div style={{ height: 4, borderRadius: 999, background: "var(--border-light)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 999, transition: "width 0.3s, background 0.3s",
                    width: password.length < 6 ? "25%" : password.length < 10 ? "55%" : password.length < 14 ? "80%" : "100%",
                    background: password.length < 6 ? "#ef4444" : password.length < 10 ? "#f97316" : password.length < 14 ? "#eab308" : "#22c55e",
                  }} />
                </div>
                <small style={{ color: "var(--text-faint)", fontSize: 11 }}>
                  {password.length < 6 ? "Too short" : password.length < 10 ? "Weak" : password.length < 14 ? "Good" : "Strong"}
                </small>
              </div>
            )}

            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReset()}
                style={{ borderColor: confirm && confirm !== password ? "#ef4444" : undefined }}
              />
            </div>
            {confirm && confirm !== password && (
              <p style={{ color: "#ef4444", fontSize: 12, margin: "-10px 0 10px", textAlign: "left" }}>
                Passwords do not match
              </p>
            )}

            <button className="btn-primary" onClick={handleReset} disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </button>

            <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-faint)" }}>
              Remembered it?{" "}
              <span style={{ color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/login")}>
                Back to sign in
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}