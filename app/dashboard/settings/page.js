"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/supabase";

import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers, FiLayers, FiSettings,
} from "react-icons/fi";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, isLoadingUser } = useAuth();
  const { isDark, setTheme } = useTheme();

  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoadingUser && !currentUser) router.push("/login");
  }, [currentUser, isLoadingUser, router]);

  useEffect(() => {
    if (!currentUser) return;
    supabase.from("profiles").select("settings").eq("id", currentUser.id).single()
      .then(({ data }) => {
        const s = data?.settings || {
          darkMode: isDark,
          emailAlerts: true,
          multiUser: true,
          roleAccess: false,
          securityLock: true,
        };
        s.darkMode = isDark; // sync ThemeContext
        setSettings(s);
      })
      .catch(err => console.error("Failed to fetch settings:", err));
  }, [currentUser, isDark]);

  // Keep settings.darkMode in sync with ThemeContext
  useEffect(() => {
    if (settings) setSettings(s => ({ ...s, darkMode: isDark }));
  }, [isDark]);

  const toggleSetting = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);

    if (key === "darkMode") setTheme(updated.darkMode);

    const { error } = await supabase.from("profiles").update({ settings: updated }).eq("id", currentUser.id);
    if (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    }
    setSaving(false);
  };

  if (isLoadingUser || !settings) return <h6 style={{ padding: 40, color: "var(--text-dark)" }}>Loading Settings...</h6>;

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
          <li onClick={() => router.push("/dashboard/users")}><FiUsers /> User Accounts</li>
          <li className="active"><FiSettings /> Settings</li>
        </ul>
      </aside>

      <main className="main">
        <div className="create-navbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>System Settings</h1>
          {saving && <span className="saving-indicator">Saving…</span>}
        </div>

        <div className="settings-grid">
          <div className="card settings-card">
            <h3>Application Appearance</h3>
            <SettingRow
              label="Dark Mode"
              description="Toggle dark/light theme"
              value={settings.darkMode}
              onChange={() => toggleSetting("darkMode")}
            />
          </div>

          <div className="card settings-card">
            <h3>Notifications</h3>
            <SettingRow
              label="Email Alerts"
              value={settings.emailAlerts}
              onChange={() => toggleSetting("emailAlerts")}
            />
          </div>

          <div className="card settings-card">
            <h3>Security &amp; Access</h3>
            <SettingRow
              label="Security Lock"
              value={settings.securityLock}
              onChange={() => toggleSetting("securityLock")}
            />
          </div>

          <div className="card settings-card">
            <h3>User Permissions</h3>
            <SettingRow
              label="Multi User"
              value={settings.multiUser}
              onChange={() => toggleSetting("multiUser")}
            />
            <SettingRow
              label="Role Access"
              value={settings.roleAccess}
              onChange={() => toggleSetting("roleAccess")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingRow({ label, description, value, onChange }) {
  return (
    <div className="setting-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div>
        <span>{label}</span>
        {description && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{description}</div>}
      </div>
      <label className="switch">
        <input type="checkbox" checked={value} onChange={onChange} />
        <span className="slider"></span>
      </label>
    </div>
  );
}