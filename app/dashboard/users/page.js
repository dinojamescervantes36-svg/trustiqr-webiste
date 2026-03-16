"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FiHome, FiFilePlus, FiCheckCircle, FiUsers, FiLayers, FiSettings, FiUser, FiShield, FiCamera } from "react-icons/fi";

export default function UserAccountPage() {
  const router = useRouter();
  const { currentUser, isLoadingUser } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", team: "Registrar" });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [twoFA, setTwoFA] = useState(true);

  // Fetch user profile
  useEffect(() => {
    if (!isLoadingUser && !currentUser) {
      router.replace("/login");
      return;
    }
    if (!currentUser) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (data) {
        setForm({
          name: data.name || "",
          email: currentUser.email || "",
          team: data.team || "Registrar",
        });
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      } else if (error) {
        console.error("Error fetching profile:", error.message);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [currentUser, isLoadingUser, router]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Upload avatar
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const filePath = `avatars/${currentUser.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("certificates").upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from("certificates").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", currentUser.id);
      setAvatarUrl(data.publicUrl);
    } else {
      alert("Upload failed: " + uploadError.message);
    }

    setUploading(false);
  };

  // Save profile + password
  const handleSaveProfile = async () => {
    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: form.name, team: form.team })
      .eq("id", currentUser.id);

    if (profileError) {
      setSaveMsg("Failed to update profile.");
      console.error(profileError);
      return;
    }

    // Update password if entered
    if (newPassword) {
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwdError) {
        setSaveMsg("Profile updated but password change failed.");
        console.error(pwdError);
        return;
      }
    }

    setSaveMsg("Profile updated successfully!");
    setNewPassword("");
    setTimeout(() => setSaveMsg(""), 4000);
  };

  if (loading || isLoadingUser) return <p style={{ padding: 40 }}>Loading account...</p>;

  const initials = form.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "U";

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          <span>TrustiQR</span>
        </div>
        <ul>
          <li onClick={() => router.push("/dashboard")}><FiHome /> Dashboard</li>
          <li onClick={() => router.push("/dashboard/create")}><FiFilePlus /> Create New Certificates</li>
          <li onClick={() => router.push("/dashboard/verify")}><FiCheckCircle /> Verify Certificate</li>
          <li onClick={() => router.push("/dashboard/templates")}><FiLayers /> Manage Templates</li>
          <li className="active"><FiUsers /> User Accounts</li>
          <li onClick={() => router.push("/dashboard/settings")}><FiSettings /> Settings</li>
        </ul>
      </aside>

      <main className="main">
        <div className="settings-page">
          <h1>User Account</h1>

          {/* Profile Card */}
          <div className="card">
            <h3><FiUser /> Profile</h3>
            <div className="profile-grid">
              <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid #e6f4ea" }} />
                ) : (
                  <div className="avatar-placeholder">{initials}</div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Change photo"
                  style={{ position: "absolute", bottom: 0, right: 0, background: "#1e8e3e", border: "2px solid #fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
                >
                  <FiCamera size={13} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
                {uploading && <p style={{ fontSize: 11, color: "#666", marginTop: 4, textAlign: "center" }}>Uploading...</p>}
              </div>

              <div className="form">
                <label>Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name" />

                <label>Email</label>
                <input name="email" value={form.email} disabled />

                <label>New Password</label>
                <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

                <label>Default Team</label>
                <select name="team" value={form.team} onChange={handleChange}>
                  <option value="Registrar">Registrar</option>
                  <option value="Admin">Admin</option>
                  <option value="Verifier">Verifier</option>
                </select>

                {saveMsg && <p style={{ color: saveMsg.includes("Failed") ? "red" : "green", fontSize: 14, margin: 0 }}>{saveMsg}</p>}

                <button className="primary" onClick={handleSaveProfile}>Save Changes</button>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="card">
            <h3><FiShield /> Security</h3>
            <div className="twofa">
              <span>Two-Factor Authentication</span>
              <input type="checkbox" checked={twoFA} onChange={() => setTwoFA(!twoFA)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}