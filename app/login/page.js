"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";

export default function AuthPage() {
  const router = useRouter();
  const { currentUser, login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => { if (currentUser) router.replace("/dashboard"); }, [currentUser, router]);

  const handleSignIn = async () => {
    if (!email || !password) { setMessage("Please enter email and password."); return; }
    try {
      setLoading(true);
      await login(email, password);
      router.replace("/dashboard");
    } catch { setMessage("Invalid email or password."); setLoading(false); }
  };

  const handleCreateAccount = async () => {
    if (!name || !email || !password || !institution) { setMessage("Please fill in all fields."); return; }
    if (!agree) { setMessage("You must agree to the Terms & Conditions."); return; }
    try {
      setLoading(true);
      await signup(email, password, name, institution);
      setMessage("Account created! You can now sign in.");
      setIsLogin(true);
      setName(""); setEmail(""); setPassword(""); setInstitution(""); setAgree(false);
      setLoading(false);
    } catch (error) { setMessage(error.message); setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setMessage("Please enter your email."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) setMessage("Email not found.");
    else setMessage(`Password reset link sent to ${forgotEmail}`);
    setForgotEmail(""); setForgotModal(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          <span>TrustiQR</span>
        </div>
        {message && <p className="message">{message}</p>}
        {loading && <p className="loading">Processing...</p>}

        {isLogin ? (
          <>
            <h2>Welcome Back</h2>
            <p>Enter your credentials to access your dashboard.</p>
            <div className="input-group"><input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="input-group password-group">
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="show-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</span>
            </div>
            <div className="forgot-password"><span onClick={() => setForgotModal(true)}>Forgot Password?</span></div>
            <button className="btn-primary" onClick={handleSignIn} disabled={loading}>Sign In</button>
            <p className="switch-text">Don't have an account? <span onClick={() => setIsLogin(false)}>Create an Account</span></p>
          </>
        ) : (
          <>
            <h2>Create Your TrustiQR Account</h2>
            <p>Join TrustiQR to start verifying certificates today.</p>
            <div className="input-group"><input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="input-group"><input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="input-group password-group">
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="show-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</span>
            </div>
            <div className="input-group">
              <select value={institution} onChange={(e) => setInstitution(e.target.value)}>
                <option value="">Institution Type</option>
                <option value="Educational Institution">Educational Institution</option>
                <option value="Government Agency">Government Agency</option>
              </select>
            </div>
            <label className="checkbox">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I agree to the Terms & Conditions
            </label>
            <button className="btn-primary" onClick={handleCreateAccount} disabled={loading}>Create Account</button>
            <p className="switch-text">Already have an account? <span onClick={() => setIsLogin(true)}>Sign In</span></p>
          </>
        )}
      </div>

      {forgotModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reset Password</h3>
            <p>Enter your email to receive a password reset link.</p>
            <input type="email" placeholder="Work Email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            <div className="modal-buttons">
              <button onClick={handleForgotPassword} className="btn-primary">Send Link</button>
              <button onClick={() => setForgotModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
