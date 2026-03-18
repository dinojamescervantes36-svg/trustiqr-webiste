"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";

// Google "G" SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { currentUser, login, signup, signInWithGoogle } = useAuth();

  const [isLogin, setIsLogin]           = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName]                 = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [institution, setInstitution]   = useState("");
  const [agree, setAgree]               = useState(false);
  const [message, setMessage]           = useState({ text: "", type: "info" }); // type: info | success | error
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password
  const [forgotModal, setForgotModal]   = useState(false);
  const [forgotEmail, setForgotEmail]   = useState("");
  const [forgotSent,  setForgotSent]    = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (currentUser) router.replace("/dashboard");
  }, [currentUser, router]);

  const showMsg = (text, type = "info") => setMessage({ text, type });
  const clearMsg = () => setMessage({ text: "", type: "info" });

  const handleSignIn = async () => {
    if (!email || !password) { showMsg("Please enter email and password.", "error"); return; }
    try {
      setLoading(true); clearMsg();
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      showMsg(err.message?.includes("Invalid") ? "Incorrect email or password." : (err.message || "Sign in failed."), "error");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true); clearMsg();
      await signInWithGoogle();
      // OAuth redirect happens automatically
    } catch (err) {
      showMsg(err.message || "Google sign in failed.", "error");
      setGoogleLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!name || !email || !password || !institution) { showMsg("Please fill in all fields.", "error"); return; }
    if (!agree) { showMsg("You must agree to the Terms & Conditions.", "error"); return; }
    try {
      setLoading(true); clearMsg();
      await signup(email, password, name, institution);
      showMsg("Account created! You can now sign in.", "success");
      setIsLogin(true);
      setName(""); setEmail(""); setPassword(""); setInstitution(""); setAgree(false);
      setLoading(false);
    } catch (err) {
      showMsg(err.message || "Account creation failed.", "error");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { showMsg("Please enter your email address.", "error"); return; }
    try {
      setForgotLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
      setForgotLoading(false);
    } catch (err) {
      showMsg(err.message || "Failed to send reset email.", "error");
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotModal(false);
    setForgotEmail("");
    setForgotSent(false);
    setForgotLoading(false);
  };

  const msgBg = message.type === "success"
    ? "rgba(30,142,62,0.1)" : message.type === "error"
    ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)";
  const msgColor = message.type === "success" ? "#166534"
    : message.type === "error" ? "#b91c1c" : "#1e40af";

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          <span style={{ fontWeight: 700, fontSize: 20, color: "var(--text-heading)" }}>TrustiQR</span>
        </div>

        {message.text && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: msgBg, color: msgColor, fontSize: 13, textAlign: "left", border: `1px solid ${msgColor}22` }}>
            {message.type === "success" ? "✅ " : message.type === "error" ? "❌ " : "ℹ️ "}
            {message.text}
          </div>
        )}

        {isLogin ? (
          <>
            <h2>Welcome Back</h2>
            <p>Enter your credentials to access your dashboard.</p>

            {/* Google Sign In */}
            <button className="btn-google" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
              <GoogleIcon />
              {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
            </button>

            <div className="auth-divider">or sign in with email</div>

            <div className="input-group">
              <input type="email" placeholder="Work Email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()} />
            </div>
            <div className="input-group password-group">
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()} />
              <span className="show-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>
            <div className="forgot-password">
              <span onClick={() => { setForgotModal(true); setForgotSent(false); }}>Forgot Password?</span>
            </div>
            <button className="btn-primary" onClick={handleSignIn} disabled={loading || googleLoading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <p className="switch-text">
              Don&apos;t have an account?{" "}
              <span onClick={() => { setIsLogin(false); clearMsg(); }}>Create an Account</span>
            </p>
          </>
        ) : (
          <>
            <h2>Create Your TrustiQR Account</h2>
            <p>Join TrustiQR to start verifying certificates today.</p>

            {/* Google Sign Up */}
            <button className="btn-google" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
              <GoogleIcon />
              {googleLoading ? "Redirecting to Google…" : "Sign up with Google"}
            </button>

            <div className="auth-divider">or create account with email</div>

            <div className="input-group"><input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="input-group"><input type="email" placeholder="Work Email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="input-group password-group">
              <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} />
              <span className="show-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>
            <div className="input-group">
              <select value={institution} onChange={e => setInstitution(e.target.value)}>
                <option value="">Institution Type</option>
                <option value="Educational Institution">Educational Institution</option>
                <option value="Government Agency">Government Agency</option>
              </select>
            </div>
            <label className="checkbox">
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
              I agree to the Terms &amp; Conditions
            </label>
            <button className="btn-primary" onClick={handleCreateAccount} disabled={loading || googleLoading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
            <p className="switch-text">
              Already have an account?{" "}
              <span onClick={() => { setIsLogin(true); clearMsg(); }}>Sign In</span>
            </p>
          </>
        )}
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="modal-overlay" onClick={closeForgotModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {!forgotSent ? (
              <>
                <h3>Reset Your Password</h3>
                <p>Enter the email address associated with your account. We&apos;ll send a secure reset link.</p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                  autoFocus
                />
                <div className="modal-buttons">
                  <button onClick={handleForgotPassword} className="btn-primary" disabled={forgotLoading} style={{ flex: 1 }}>
                    {forgotLoading ? "Sending…" : "Send Reset Link"}
                  </button>
                  <button onClick={closeForgotModal} className="btn-secondary">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
                  <h3 style={{ margin: "0 0 10px" }}>Check your inbox</h3>
                  <p style={{ margin: "0 0 6px" }}>
                    A password reset link was sent to
                  </p>
                  <p style={{ fontWeight: 700, color: "var(--primary)", margin: "0 0 16px", wordBreak: "break-all" }}>
                    {forgotEmail}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 20px" }}>
                    Didn&apos;t receive it? Check your spam folder, or{" "}
                    <span style={{ color: "var(--primary)", cursor: "pointer" }} onClick={() => setForgotSent(false)}>
                      try again
                    </span>.
                  </p>
                  <button onClick={closeForgotModal} className="btn-primary">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}