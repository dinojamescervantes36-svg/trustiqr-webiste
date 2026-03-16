"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || password.length < 6) { setMessage("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated! Redirecting...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (error) { setMessage(error.message); setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo"><img src="/img/logo.png" alt="TrustiQR Logo" /><span>TrustiQR</span></div>
        <h2>Set New Password</h2>
        <p>Enter your new password below.</p>
        {message && <p className="message">{message}</p>}
        <div className="input-group"><input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="input-group"><input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <button className="btn-primary" onClick={handleReset} disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
      </div>
    </div>
  );
}
