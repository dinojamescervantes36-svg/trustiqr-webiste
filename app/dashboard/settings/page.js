"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers, FiLayers, FiSettings,
} from "react-icons/fi";

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, isLoadingUser } = useAuth();

  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoadingUser && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, isLoadingUser, router]);

  useEffect(() => {
    if (!currentUser) return;

    supabase.from('profiles').select('settings').eq('id', currentUser.id).single()
      .then(({ data }) => {
        const s = data?.settings || {
          darkMode: false,
          emailAlerts: true,
          multiUser: true,
          roleAccess: false,
          securityLock: true,
        };
        setSettings(s);
        applyTheme(s.darkMode);
      });
  }, [currentUser]);

  const applyTheme = (isDark) => {
    if (isDark) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleSetting = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);

    const { error } = await supabase.from('profiles')
      .update({ settings: updated })
      .eq('id', currentUser.id);

    if (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    }

    if (key === "darkMode") applyTheme(updated.darkMode);
    setSaving(false);
  };

  if (isLoadingUser || !settings) {
    return <h6 style={{ padding: 40 }}>Loading Settings...</h6>;
  }

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
        <div className="create-navbar">
          <h1>System Settings</h1>
          {saving && <span className="saving-indicator">Saving…</span>}
        </div>

        <div className="settings-grid">
          <div className="card settings-card">
            <h3>Application Appearance</h3>
            <SettingRow label="Dark Mode" value={settings.darkMode} onChange={() => toggleSetting("darkMode")} />
          </div>

          <div className="card settings-card">
            <h3>Notifications</h3>
            <SettingRow label="Email Alerts" value={settings.emailAlerts} onChange={() => toggleSetting("emailAlerts")} />
          </div>

          <div className="card settings-card">
            <h3>Security & Access</h3>
            <SettingRow label="Security Lock" value={settings.securityLock} onChange={() => toggleSetting("securityLock")} />
          </div>

          <div className="card settings-card">
            <h3>User Permissions</h3>
            <SettingRow label="Multi User" value={settings.multiUser} onChange={() => toggleSetting("multiUser")} />
            <SettingRow label="Role Access" value={settings.roleAccess} onChange={() => toggleSetting("roleAccess")} />
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingRow({ label, value, onChange }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <label className="switch">
        <input type="checkbox" checked={value} onChange={onChange} />
        <span className="slider"></span>
      </label>
    </div>
  );
}
