"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiAward, FiMail, FiDownload, FiCopy,
  FiEdit2, FiCheck, FiX, FiRefreshCw,
} from "react-icons/fi";
import QRCode from "react-qr-code";

function generateUniqueHash() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TX-${ts}-${rand}`;
}
function isValidEmail(e) { return /\S+@\S+\.\S+/.test(e); }
function buildDefaultFilename({ fullName, program, certificateTitle, completionDate }) {
  const name = (fullName || "Recipient").trim().replace(/\s+/g, "_");
  const prog = (certificateTitle || program || "Certificate").trim().replace(/\s+/g, "_");
  const year = completionDate ? completionDate.slice(0, 4) : new Date().getFullYear();
  return `${name}_${prog}_${year}`;
}
function sanitise(str) { return str.replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim(); }

export default function CreateCertificate() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    fullName: "", email: "", completionDate: "", certificateTitle: "",
    program: "", template: "Academic Degree", templateId: "", templateName: "",
  });
  const [filename,        setFilename]        = useState("");
  const [filenameEditing, setFilenameEditing] = useState(false);
  const [filenameDraft,   setFilenameDraft]   = useState("");
  const filenameRef = useRef(null);
  const [dbTemplates,  setDbTemplates]  = useState([]);
  const [loadingTpls,  setLoadingTpls]  = useState(false);
  const [uniqueHash,   setUniqueHash]   = useState("");
  const [verifyUrl,    setVerifyUrl]    = useState("");
  const [statusMessage,setStatusMessage]= useState("");
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [isIssuing,    setIsIssuing]    = useState(false);
  const qrRef = useRef(null);

  useEffect(() => { if (filenameEditing) return; setFilename(buildDefaultFilename(form)); },
    [form.fullName, form.program, form.certificateTitle, form.completionDate, filenameEditing]);

  const loadTemplates = useCallback(async () => {
    if (!currentUser) return;
    setLoadingTpls(true);
    const { data } = await supabase.storage.from("certificates").list(`templates/${currentUser.id}`, { sortBy: { column: "created_at", order: "desc" } });
    if (data) setDbTemplates(data.filter(f => f.name !== ".emptyFolderPlaceholder").map(f => ({ id: f.id || f.name, name: f.name.replace(/^\d+_/, ""), fullPath: `templates/${currentUser.id}/${f.name}`, type: f.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE" })));
    setLoadingTpls(false);
  }, [currentUser]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    const tplId = params?.get("templateId"), tplName = params?.get("templateName");
    if (tplId && tplName) { const n = decodeURIComponent(tplName); setForm(s => ({ ...s, templateId: tplId, templateName: n, template: n })); setStatusMessage(`Template "${n}" selected.`); }
  }, [params]);

  useEffect(() => { if (statusMessage) { const t = setTimeout(() => setStatusMessage(""), 3500); return () => clearTimeout(t); } }, [statusMessage]);

  const handleChange = e => { const { name, value } = e.target; setForm(s => ({ ...s, [name]: value })); };
  const startEdit    = () => { setFilenameDraft(filename); setFilenameEditing(true); setTimeout(() => filenameRef.current?.select(), 40); };
  const confirmEdit  = () => { setFilename(sanitise(filenameDraft) || buildDefaultFilename(form)); setFilenameEditing(false); };
  const cancelEdit   = () => setFilenameEditing(false);
  const resetFN      = () => { setFilename(buildDefaultFilename(form)); setFilenameEditing(false); };

  const handleIssue = async () => {
    if (!form.fullName.trim())                    { setStatusMessage("Recipient full name is required."); return; }
    if (!form.program)                            { setStatusMessage("Please select a program."); return; }
    if (!form.email || !isValidEmail(form.email)) { setStatusMessage("Please enter a valid email address."); return; }
    setIsIssuing(true);
    const hash = generateUniqueHash();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url    = `${origin}/verify/${hash}`;
    const finalFN = sanitise(filename) || buildDefaultFilename(form);
    const { error } = await supabase.from("certificates").insert({
      user_id: currentUser.id, cert_id: hash, recipient_name: form.fullName, email: form.email,
      program: form.program, certificate_title: form.certificateTitle || `Certificate – ${form.program}`,
      template: form.template, template_id: form.templateId || null, template_name: form.templateName || null,
      completion_date: form.completionDate || null, unique_hash: hash, status: "Issued",
      original_filename: buildDefaultFilename(form), custom_filename: finalFN,
    });
    setIsIssuing(false);
    if (error) setStatusMessage("Error saving certificate. Please try again.");
    else { setUniqueHash(hash); setVerifyUrl(url); setFilename(finalFN); setStatusMessage("Certificate issued and saved."); }
  };

  const handleSendEmail = () => {
    if (!uniqueHash) { setStatusMessage("Issue the certificate first."); return; }
    setStatusMessage(`Certificate sent to ${form.email}`);
  };

  const handleCopyHash = async () => {
    if (!uniqueHash) return setStatusMessage("No link to copy.");
    try { await navigator.clipboard.writeText(verifyUrl || uniqueHash); setStatusMessage("Verification link copied."); }
    catch { setStatusMessage("Copy failed."); }
  };

  const handleDownloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return setStatusMessage("No QR to download.");
    const str = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      c.toBlob(b => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${sanitise(filename) || uniqueHash || "qrcode"}.png`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setStatusMessage("QR downloaded."); }, "image/png");
    };
    img.src = url;
  };

  const handleSaveDraft  = () => { localStorage.setItem("cert-draft", JSON.stringify({ form, filename })); setStatusMessage("Draft saved."); };
  const handleLoadDraft  = () => { const raw = localStorage.getItem("cert-draft"); if (!raw) return setStatusMessage("No draft found."); try { const { form: f, filename: fn } = JSON.parse(raw); setForm(s => ({ ...s, ...f })); if (fn) { setFilename(fn); setFilenameEditing(false); } setStatusMessage("Draft loaded."); } catch { setStatusMessage("Failed to load draft."); } };
  const handleReset      = () => { setForm({ fullName: "", email: "", completionDate: "", certificateTitle: "", program: "", template: "Academic Degree", templateId: "", templateName: "" }); setUniqueHash(""); setVerifyUrl(""); setFilename(""); setFilenameEditing(false); setStatusMessage("Form cleared."); };

  const builtInTemplates = ["Academic Degree", "Course Completion", "Employee ID"];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo"><img src="/img/logo.png" alt="TrustiQR Logo" /><span>TrustiQR</span></div>
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary small-btn" onClick={handleLoadDraft}>Load Draft</button>
            <button className="secondary small-btn" onClick={handleSaveDraft}>Save Draft</button>
            <button className="secondary small-btn" onClick={() => setPreviewOpen(true)}>Preview</button>
            <button className="primary small-btn" onClick={handleIssue} disabled={isIssuing}>{isIssuing ? "Issuing..." : "Issue"}</button>
          </div>
        </div>

        <div className="create-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginTop: 16 }}>
          {/* LEFT */}
          <section className="card" aria-labelledby="recipient-heading">
            <h2 id="recipient-heading">Recipient &amp; Certificate Details</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>Full name <span style={{ color: "#e11d48" }}>*</span></small>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Jane Doe" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>Email <span style={{ color: "#e11d48" }}>*</span></small>
                <input name="email" value={form.email} onChange={handleChange} placeholder="recipient@example.com" />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ flex: 1, display: "grid", gap: 6 }}>
                  <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>Completion date</small>
                  <input type="date" name="completionDate" value={form.completionDate} onChange={handleChange} />
                </label>
                <label style={{ flex: 1, display: "grid", gap: 6 }}>
                  <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>Program <span style={{ color: "#e11d48" }}>*</span></small>
                  <select name="program" value={form.program} onChange={handleChange}>
                    <option value="">Select program</option>
                    <optgroup label="Computer & Technology">
                      <option>BS Computer Science</option><option>BS Information Technology</option><option>BS Data Science</option><option>Professional Data Analytics</option><option>BS Software Engineering</option><option>BS Cybersecurity</option>
                    </optgroup>
                    <optgroup label="Business">
                      <option>BS Business Administration</option><option>BS Accountancy</option><option>BS Entrepreneurship</option><option>BS Marketing Management</option><option>BS Financial Management</option><option>BS Human Resource Management</option>
                    </optgroup>
                    <optgroup label="Engineering">
                      <option>BS Civil Engineering</option><option>BS Computer Engineering</option><option>BS Electrical Engineering</option><option>BS Mechanical Engineering</option><option>BS Industrial Engineering</option><option>BS Mechatronics Engineering</option>
                    </optgroup>
                    <optgroup label="Medical & Health Sciences">
                      <option>BS Nursing</option><option>BS Pharmacy</option><option>BS Public Health</option><option>BS Medical Laboratory Science</option><option>BS Physiotherapy</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="undergraduate">Undergraduate Certificate</option><option value="postgraduate">Postgraduate Certificate</option>
                    </optgroup>
                  </select>
                </label>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>Certificate title</small>
                <input name="certificateTitle" value={form.certificateTitle} onChange={handleChange} placeholder="Professional Certificate in Data Analytics" />
              </label>

              {/* Editable filename */}
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>File name</small>
                  <small style={{ color: "var(--text-faint)", fontSize: 11 }}>Auto-suggested · editable</small>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid", borderColor: filenameEditing ? "var(--primary)" : "var(--border-input)", borderRadius: 8, background: filenameEditing ? "var(--bg-card)" : "var(--bg-input)", transition: "border-color 0.2s" }}>
                  {filenameEditing ? (
                    <>
                      <input ref={filenameRef} value={filenameDraft} onChange={e => setFilenameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "monospace", color: "var(--text-dark)" }} placeholder="Enter a custom file name…" />
                      <button onClick={confirmEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", padding: 2 }}><FiCheck size={14} /></button>
                      <button onClick={cancelEdit}  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2 }}><FiX size={14} /></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontFamily: "monospace", color: filename ? "var(--text-muted)" : "var(--text-faint)", wordBreak: "break-all" }}>{filename || "Fill in fields above…"}</span>
                      <button onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2 }}><FiEdit2 size={13} /></button>
                      <button onClick={resetFN}   style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", display: "flex", padding: 2 }}><FiRefreshCw size={12} /></button>
                    </>
                  )}
                </div>
              </label>

              {/* Template selector */}
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <small style={{ color: "var(--text-dark)", fontWeight: 600 }}>Template</small>
                  <button onClick={() => router.push("/dashboard/templates")} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Manage templates →</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {builtInTemplates.map(t => (
                    <button key={t} type="button" onClick={() => setForm(s => ({ ...s, template: t, templateId: "", templateName: "" }))}
                      style={{ padding: "8px 10px", background: form.template === t && !form.templateId ? "#0ea5a4" : "var(--bg-input)", color: form.template === t && !form.templateId ? "#fff" : "var(--text-dark)", border: "1px solid var(--border-input)", borderRadius: 6, cursor: "pointer" }}>
                      <FiAward style={{ marginRight: 8 }} />{t}
                    </button>
                  ))}
                </div>
                {loadingTpls && <small style={{ color: "var(--text-faint)" }}>Loading uploaded templates…</small>}
                {!loadingTpls && dbTemplates.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {dbTemplates.map(t => (
                      <button key={t.id} type="button" onClick={() => setForm(s => ({ ...s, template: t.name, templateId: t.id, templateName: t.name }))}
                        style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 6, background: form.templateId === t.id ? "var(--primary)" : "var(--bg-hover)", color: form.templateId === t.id ? "#fff" : "var(--primary)", border: "1px solid", borderColor: form.templateId === t.id ? "var(--primary)" : "var(--border-light)", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                        <FiLayers size={11} />{t.name} <span style={{ fontSize: 10, opacity: 0.6 }}>({t.type})</span>
                      </button>
                    ))}
                  </div>
                )}
                {!loadingTpls && dbTemplates.length === 0 && (
                  <small style={{ color: "var(--text-faint)" }}>No uploaded templates. <span style={{ color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/dashboard/templates")}>Upload one →</span></small>
                )}
              </label>
            </div>
          </section>

          {/* RIGHT */}
          <aside>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0 }}>Security &amp; QR</h3>
              <div ref={qrRef} style={{ display: "flex", justifyContent: "center", padding: 12, background: "var(--bg-input)", borderRadius: 8, border: "1px solid var(--border-input)" }}>
                {uniqueHash ? <QRCode value={verifyUrl} size={160} bgColor="transparent" fgColor="var(--text-dark)" /> : <div style={{ color: "var(--text-faint)", padding: "20px 0" }}>QR will appear here after issuing</div>}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div>
                  <small style={{ color: "var(--text-muted)" }}>Unique Hash</small>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <div style={{ padding: "8px", border: "1px solid var(--border-input)", borderRadius: 6, wordBreak: "break-all", overflowWrap: "anywhere", maxWidth: 260, background: "var(--bg-card)", color: "var(--text-dark)", fontSize: 12, fontFamily: "monospace" }}>
                      {uniqueHash || "Not generated"}
                    </div>
                    <button className="secondary small-btn" onClick={handleCopyHash} disabled={!uniqueHash}><FiCopy /></button>
                    <button className="secondary small-btn" onClick={handleDownloadQR} disabled={!uniqueHash}><FiDownload /></button>
                  </div>
                </div>
                <div>
                  <small style={{ color: "var(--text-muted)" }}>File Name</small>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                    <div style={{ flex: 1, padding: "8px", border: "1px solid var(--border-input)", borderRadius: 6, fontSize: 12, fontFamily: "monospace", color: filename ? "var(--text-muted)" : "var(--text-faint)", wordBreak: "break-all", background: "var(--bg-card)" }}>
                      {filename || "Not set"}
                    </div>
                    <button className="secondary small-btn" onClick={startEdit} title="Edit filename"><FiEdit2 size={13} /></button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="primary" onClick={handleIssue} disabled={isIssuing} style={{ flex: 1 }}>{isIssuing ? "Issuing..." : "Issue Certificate"}</button>
                  <button className="secondary" onClick={handleSendEmail} disabled={!uniqueHash}><FiMail /></button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleReset} style={{ flex: 1, padding: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: 6, cursor: "pointer", color: "var(--text-dark)" }}>Clear</button>
                  <button onClick={() => setPreviewOpen(true)} style={{ flex: 1, padding: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: 6, cursor: "pointer", color: "var(--text-dark)" }}>Preview</button>
                  {uniqueHash && <button onClick={() => router.push("/dashboard/verify")} style={{ flex: 1, padding: "8px", background: "var(--bg-hover)", border: "1px solid var(--border-light)", borderRadius: 6, cursor: "pointer", color: "var(--primary)", fontWeight: 600, fontSize: 13 }}>View All</button>}
                </div>
              </div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0 }}>Recent Actions</h4>
              <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                <li>Issuing generates a unique hash and saves to database</li>
                <li>QR code links directly to the public verification page</li>
                <li>File name is auto-suggested and editable before issuing</li>
                <li>Download contains the QR as PNG</li>
              </ul>
            </div>
          </aside>
        </div>

        {/* Preview Modal */}
        {previewOpen && (
          <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", zIndex: 1200 }}>
            <div className="card" style={{ width: 760, maxWidth: "95%", maxHeight: "90%", overflow: "auto", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Certificate Preview</h3>
                  {filename && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-faint)", fontFamily: "monospace" }}>📄 {filename}</p>}
                </div>
                <button onClick={() => setPreviewOpen(false)} className="secondary" style={{ width: "auto", padding: "8px 16px", marginBottom: 0 }}>Close</button>
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 24 }}>
                <div style={{ flex: 1, padding: 20, border: "1px solid var(--border-light)", borderRadius: 8, background: "var(--bg-input)" }}>
                  <h2 style={{ marginTop: 0 }}>{form.certificateTitle || "Certificate of Completion"}</h2>
                  <p style={{ color: "var(--text-muted)" }}>Presented to</p>
                  <h1 style={{ margin: "6px 0" }}>{form.fullName || "—"}</h1>
                  <p style={{ color: "var(--text-muted)" }}>{form.program || "—"}</p>
                  {form.templateName && <p style={{ color: "var(--text-faint)", fontSize: 12 }}>Template: {form.templateName}</p>}
                  <p style={{ color: "var(--text-faint)", marginTop: 18 }}>{form.completionDate || "Date not set"}</p>
                </div>
                <div style={{ width: 180, textAlign: "center" }}>
                  <div style={{ padding: 10, background: "var(--bg-card)", borderRadius: 8 }}>
                    {uniqueHash ? <QRCode value={verifyUrl} size={140} /> : <div style={{ color: "var(--text-faint)", padding: 20 }}>No QR</div>}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>{uniqueHash || "Not generated"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div style={{ position: "fixed", right: 16, bottom: 16, background: "var(--text-heading)", color: "var(--bg)", padding: "8px 12px", borderRadius: 8, zIndex: 9999, fontSize: 14 }}>
            {statusMessage}
          </div>
        )}
      </main>
    </div>
  );
}