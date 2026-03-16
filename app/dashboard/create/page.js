"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiAward, FiMail, FiDownload, FiCopy,
} from "react-icons/fi";
import QRCode from "react-qr-code";

function generateUniqueHash() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TX-${ts}-${rand}`;
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

export default function CreateCertificate() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    completionDate: "",
    certificateTitle: "",
    program: "",
    template: "Academic Degree",
  });

  const [uniqueHash, setUniqueHash] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(""), 3500);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleIssue = async () => {
    if (!form.fullName.trim()) { setStatusMessage("Recipient full name is required."); return; }
    if (!form.program) { setStatusMessage("Please select a program."); return; }
    if (!form.email || !isValidEmail(form.email)) { setStatusMessage("Please enter a valid email address."); return; }

    const hash = generateUniqueHash();
    setUniqueHash(hash);

    // Save to Supabase
    const { error } = await supabase.from('certificates').insert({
      user_id: currentUser.id,
      cert_id: hash,
      recipient_name: form.fullName,
      email: form.email,
      program: form.program,
      certificate_title: form.certificateTitle || `Certificate – ${form.program}`,
      template: form.template,
      completion_date: form.completionDate || null,
      unique_hash: hash,
      status: 'Issued',
    });

    if (error) setStatusMessage("Error saving certificate. Please try again.");
    else setStatusMessage("Certificate issued and saved.");
  };

  const handleSendEmail = () => {
    if (!uniqueHash) { setStatusMessage("Issue the certificate first before sending."); return; }
    if (!form.email || !isValidEmail(form.email)) { setStatusMessage("Enter a valid recipient email first."); return; }
    setStatusMessage(`Certificate sent to ${form.email}`);
  };

  const handleCopyHash = async () => {
    if (!uniqueHash) return setStatusMessage("No hash to copy.");
    try {
      await navigator.clipboard.writeText(uniqueHash);
      setStatusMessage("Unique hash copied to clipboard.");
    } catch {
      setStatusMessage("Copy failed — please copy manually.");
    }
  };

  const handleDownloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return setStatusMessage("No QR to download.");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return setStatusMessage("Failed to create PNG.");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${uniqueHash || "qrcode"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatusMessage("QR downloaded.");
      }, "image/png");
    };
    img.src = url;
  };

  const handleSaveDraft = () => {
    localStorage.setItem("cert-draft", JSON.stringify(form));
    setStatusMessage("Draft saved locally.");
  };

  const handleLoadDraft = () => {
    const raw = localStorage.getItem("cert-draft");
    if (!raw) return setStatusMessage("No draft found.");
    try {
      const parsed = JSON.parse(raw);
      setForm((s) => ({ ...s, ...parsed }));
      setStatusMessage("Draft loaded.");
    } catch {
      setStatusMessage("Failed to load draft.");
    }
  };

  const handleReset = () => {
    setForm({ fullName: "", email: "", completionDate: "", certificateTitle: "", program: "", template: "Academic Degree" });
    setUniqueHash("");
    setStatusMessage("Form cleared.");
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          <span>TrustiQR</span>
        </div>
        <ul>
          <li onClick={() => router.push("/dashboard")}><FiHome /> Dashboard</li>
          <li className="active"><FiFilePlus /> Create New Certificates</li>
          <li onClick={() => router.push("/dashboard/verify")}><FiCheckCircle /> Verify Certificate</li>
          <li onClick={() => router.push("/dashboard/templates")}><FiLayers /> Manage Templates</li>
          <li onClick={() => router.push("/dashboard/users")}><FiUsers /> User Accounts</li>
          <li onClick={() => router.push("/dashboard/settings")}><FiSettings /> Settings</li>
        </ul>
      </aside>

      <main className="main">
        <div className="create-navbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0 }}>Create Certificate</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="secondary small-btn" onClick={handleLoadDraft}>Load Draft</button>
            <button className="secondary small-btn" onClick={handleSaveDraft}>Save Draft</button>
            <button className="secondary small-btn" onClick={() => setPreviewOpen(true)}>Preview</button>
            <button className="primary small-btn" onClick={handleIssue}>Issue</button>
          </div>
        </div>

        <div className="create-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginTop: 16 }}>
          <section className="card" aria-labelledby="recipient-heading">
            <h2 id="recipient-heading">Recipient & Certificate Details</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "#333", fontWeight: 600 }}>Full name <span style={{ color: "#e11d48" }}>*</span></small>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Jane Doe" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "#333", fontWeight: 600 }}>Email <span style={{ color: "#e11d48" }}>*</span></small>
                <input name="email" value={form.email} onChange={handleChange} placeholder="recipient@example.com" />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ flex: 1, display: "grid", gap: 6 }}>
                  <small style={{ color: "#333", fontWeight: 600 }}>Completion date</small>
                  <input type="date" name="completionDate" value={form.completionDate} onChange={handleChange} />
                </label>
                <label style={{ flex: 1, display: "grid", gap: 6 }}>
                  <small style={{ color: "#333", fontWeight: 600 }}>Program <span style={{ color: "#e11d48" }}>*</span></small>
                  <select name="program" value={form.program} onChange={handleChange}>
                    <option value="">Select program</option>
                    <optgroup label="Computer & Technology">
                      <option value="BS Computer Science">BS Computer Science</option>
                      <option value="BS Information Technology">BS Information Technology</option>
                      <option value="BS Data Science">BS Data Science</option>
                      <option value="Professional Data Analytics">Professional Data Analytics</option>
                      <option value="BS Software Engineering">BS Software Engineering</option>
                      <option value="BS Cybersecurity">BS Cybersecurity</option>
                    </optgroup>
                    <optgroup label="Business">
                      <option value="BS Business Administration">BS Business Administration</option>
                      <option value="BS Accountancy">BS Accountancy</option>
                      <option value="BS Entrepreneurship">BS Entrepreneurship</option>
                      <option value="BS Marketing Management">BS Marketing Management</option>
                      <option value="BS Financial Management">BS Financial Management</option>
                      <option value="BS Human Resource Management">BS Human Resource Management</option>
                    </optgroup>
                    <optgroup label="Engineering">
                      <option value="BS Civil Engineering">BS Civil Engineering</option>
                      <option value="BS Computer Engineering">BS Computer Engineering</option>
                      <option value="BS Electrical Engineering">BS Electrical Engineering</option>
                      <option value="BS Mechanical Engineering">BS Mechanical Engineering</option>
                      <option value="BS Industrial Engineering">BS Industrial Engineering</option>
                      <option value="BS Mechatronics Engineering">BS Mechatronics Engineering</option>
                    </optgroup>
                    <optgroup label="Medical & Health Sciences">
                      <option value="BS Nursing">BS Nursing</option>
                      <option value="BS Pharmacy">BS Pharmacy</option>
                      <option value="BS Public Health">BS Public Health</option>
                      <option value="BS Medical Laboratory Science">BS Medical Laboratory Science</option>
                      <option value="BS Physiotherapy">BS Physiotherapy</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="undergraduate">Undergraduate Certificate</option>
                      <option value="postgraduate">Postgraduate Certificate</option>
                    </optgroup>
                  </select>
                </label>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "#333", fontWeight: 600 }}>Certificate title</small>
                <input name="certificateTitle" value={form.certificateTitle} onChange={handleChange} placeholder="Professional Certificate in Data Analytics" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "#333", fontWeight: 600 }}>Template</small>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Academic Degree", "Course Completion", "Employee ID"].map((t) => (
                    <button key={t} type="button"
                      onClick={() => setForm((s) => ({ ...s, template: t }))}
                      style={{
                        padding: "8px 10px",
                        background: form.template === t ? "#0ea5a4" : "#fff",
                        color: form.template === t ? "#fff" : "#111",
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 6, cursor: "pointer",
                      }}>
                      <FiAward style={{ marginRight: 8 }} />{t}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </section>

          <aside>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0 }}>Security & QR</h3>
              <div ref={qrRef} style={{ display: "flex", justifyContent: "center", padding: 12, background: "#fff", borderRadius: 8, border: "1px solid rgba(0,0,0,0.04)" }}>
                {uniqueHash ? <QRCode value={uniqueHash} size={160} /> : <div style={{ color: "#666" }}>QR will appear here after issuing</div>}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div>
                  <small style={{ color: "#666" }}>Unique Hash</small>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <div title={uniqueHash || ""} style={{ padding: "8px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 6, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", wordBreak: "break-all", overflowWrap: "anywhere", maxWidth: 260, background: "#fff" }}>
                      {uniqueHash || "Not generated"}
                    </div>
                    <button className="secondary small-btn" onClick={handleCopyHash} disabled={!uniqueHash}><FiCopy /></button>
                    <button className="secondary small-btn" onClick={handleDownloadQR} disabled={!uniqueHash}><FiDownload /></button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="primary" onClick={handleIssue} style={{ flex: 1 }}>Issue Certificate</button>
                  <button className="secondary" onClick={handleSendEmail} disabled={!uniqueHash}><FiMail /></button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleReset} className="tertiary">Clear</button>
                  <button onClick={() => setPreviewOpen(true)} className="tertiary">Preview</button>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0 }}>Recent Actions</h4>
              <ul style={{ marginTop: 8, paddingLeft: 16, color: "#666" }}>
                <li>Issuing generates a unique hash and saves to database</li>
                <li>Download contains the QR as PNG</li>
                <li>Save draft stores data locally</li>
              </ul>
            </div>
          </aside>
        </div>

        {previewOpen && (
          <div className="modal" role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", zIndex: 1200 }}>
            <div className="card" style={{ width: 760, maxWidth: "95%", maxHeight: "90%", overflow: "auto", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Certificate Preview</h3>
                <button onClick={() => setPreviewOpen(false)} className="secondary">Close</button>
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 24 }}>
                <div style={{ flex: 1, padding: 20, border: "1px solid rgba(0,0,0,0.04)", borderRadius: 8, background: "#fff" }}>
                  <h2 style={{ marginTop: 0 }}>{form.certificateTitle || "Certificate of Completion"}</h2>
                  <p style={{ color: "#666" }}>Presented to</p>
                  <h1 style={{ margin: "6px 0" }}>{form.fullName || "—"}</h1>
                  <p style={{ color: "#666" }}>{form.program || "—"}</p>
                  <p style={{ color: "#999", marginTop: 18 }}>{form.completionDate || "Date not set"}</p>
                </div>
                <div style={{ width: 180, textAlign: "center" }}>
                  <div style={{ padding: 10, background: "#fff", borderRadius: 8 }}>
                    {uniqueHash ? <QRCode value={uniqueHash} size={140} /> : <div style={{ color: "#999" }}>No QR</div>}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#666", wordBreak: "break-all" }}>{uniqueHash || "Not generated"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div style={{ position: "fixed", right: 16, bottom: 16, background: "#111", color: "#fff", padding: "8px 12px", borderRadius: 8, zIndex: 9999 }}>
            {statusMessage}
          </div>
        )}
      </main>
    </div>
  );
}
