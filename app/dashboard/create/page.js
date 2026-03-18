"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiAward, FiMail, FiDownload,
  FiCopy, FiExternalLink, FiEdit2, FiCheck, FiX, FiRefreshCw,
} from "react-icons/fi";
import QRCode from "react-qr-code";

function generateUniqueHash() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TX-${ts}-${rand}`;
}

function isValidEmail(e) { return /\S+@\S+\.\S+/.test(e); }

function buildDefaultFilename({ fullName, program, certificateTitle, completionDate }) {
  const name = (fullName        || "Recipient").trim().replace(/\s+/g, "_");
  const prog = (certificateTitle || program || "Certificate").trim().replace(/\s+/g, "_");
  const year = completionDate ? completionDate.slice(0, 4) : new Date().getFullYear();
  return `${name}_${prog}_${year}`;
}

function sanitise(str) {
  return str.replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}

export default function CreateCertificate() {
  const router  = useRouter();
  const params  = useSearchParams();
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    fullName: "", email: "", completionDate: "",
    certificateTitle: "", program: "", template: "Academic Degree",
    templateId: "", templateName: "",
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
  const [statusType,   setStatusType]   = useState("info");
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [isIssuing,    setIsIssuing]    = useState(false);
  const qrRef = useRef(null);

  /* auto-suggest filename */
  useEffect(() => {
    if (filenameEditing) return;
    setFilename(buildDefaultFilename(form));
  }, [form.fullName, form.program, form.certificateTitle, form.completionDate, filenameEditing]);

  /* load uploaded templates */
  const loadTemplates = useCallback(async () => {
    if (!currentUser) return;
    setLoadingTpls(true);
    const { data } = await supabase.storage
      .from("certificates")
      .list(`templates/${currentUser.id}`, { sortBy: { column: "created_at", order: "desc" } });
    if (data) {
      setDbTemplates(
        data
          .filter(f => f.name !== ".emptyFolderPlaceholder")
          .map(f => ({
            id: f.id || f.name,
            name: f.name.replace(/^\d+_/, ""),
            fullPath: `templates/${currentUser.id}/${f.name}`,
            type: f.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE",
          }))
      );
    }
    setLoadingTpls(false);
  }, [currentUser]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  /* pre-fill from query params (from Manage Templates "Use" button) */
  useEffect(() => {
    const tplId   = params?.get("templateId");
    const tplName = params?.get("templateName");
    if (tplId && tplName) {
      const name = decodeURIComponent(tplName);
      setForm(s => ({ ...s, templateId: tplId, templateName: name, template: name }));
      showStatus(`Template "${name}" selected.`, "success");
    }
  }, [params]);

  const showStatus = (msg, type = "info") => {
    setStatusMessage(msg); setStatusType(type);
    setTimeout(() => setStatusMessage(""), 3800);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value }));
  };

  /* filename editing */
  const startEdit = () => {
    setFilenameDraft(filename);
    setFilenameEditing(true);
    setTimeout(() => filenameRef.current?.select(), 40);
  };
  const confirmEdit = () => {
    const cleaned = sanitise(filenameDraft) || buildDefaultFilename(form);
    setFilename(cleaned);
    setFilenameEditing(false);
  };
  const cancelEdit   = () => setFilenameEditing(false);
  const resetFilename= () => { setFilename(buildDefaultFilename(form)); setFilenameEditing(false); };

  /* issue */
  const handleIssue = async () => {
    if (!form.fullName.trim())                    { showStatus("Recipient full name is required.", "error"); return; }
    if (!form.program)                            { showStatus("Please select a program.", "error"); return; }
    if (!form.email || !isValidEmail(form.email)) { showStatus("Please enter a valid email address.", "error"); return; }

    setIsIssuing(true);
    const hash          = generateUniqueHash();
    const origin        = typeof window !== "undefined" ? window.location.origin : "";
    const url           = `${origin}/verify/${hash}`;
    const certTitle     = form.certificateTitle || `Certificate – ${form.program}`;
    const finalFilename = sanitise(filename) || buildDefaultFilename(form);

    const { error } = await supabase.from("certificates").insert({
      user_id:           currentUser.id,
      cert_id:           hash,
      recipient_name:    form.fullName,
      email:             form.email,
      program:           form.program,
      certificate_title: certTitle,
      template:          form.template,
      template_id:       form.templateId   || null,
      template_name:     form.templateName || null,
      completion_date:   form.completionDate || null,
      unique_hash:       hash,
      status:            "Issued",
      original_filename: buildDefaultFilename(form),
      custom_filename:   finalFilename,
    });

    setIsIssuing(false);

    if (error) { showStatus("Error saving certificate.", "error"); }
    else       { setUniqueHash(hash); setVerifyUrl(url); setFilename(finalFilename); showStatus("Certificate issued successfully!", "success"); }
  };

  /* download QR */
  const handleDownloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return showStatus("No QR to download.", "error");
    const str  = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      c.toBlob(b => {
        if (!b) return showStatus("Failed to create PNG.", "error");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `${sanitise(filename) || uniqueHash || "qrcode"}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showStatus("QR downloaded.", "success");
      }, "image/png");
    };
    img.src = url;
  };

  const handleCopyLink = async () => {
    if (!verifyUrl) return showStatus("Issue the certificate first.", "error");
    try { await navigator.clipboard.writeText(verifyUrl); showStatus("Verification link copied!", "success"); }
    catch { showStatus("Copy failed.", "error"); }
  };

  const handleSaveDraft = () => {
    localStorage.setItem("cert-draft", JSON.stringify({ form, filename }));
    showStatus("Draft saved.", "info");
  };

  const handleLoadDraft = () => {
    const raw = localStorage.getItem("cert-draft");
    if (!raw) return showStatus("No draft found.", "info");
    try {
      const { form: f, filename: fn } = JSON.parse(raw);
      setForm(s => ({ ...s, ...f }));
      if (fn) { setFilename(fn); setFilenameEditing(false); }
      showStatus("Draft loaded.", "success");
    } catch { showStatus("Failed to load draft.", "error"); }
  };

  const handleReset = () => {
    setForm({ fullName: "", email: "", completionDate: "", certificateTitle: "", program: "", template: "Academic Degree", templateId: "", templateName: "" });
    setUniqueHash(""); setVerifyUrl(""); setFilename(""); setFilenameEditing(false);
    showStatus("Form cleared.", "info");
  };

  const builtInTemplates = ["Academic Degree", "Course Completion", "Employee ID"];

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo"><img src="/img/logo.png" alt="TrustiQR" /><span>TrustiQR</span></div>
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
        {/* topbar */}
        <div className="create-navbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <h1 style={{ margin:0 }}>Create Certificate</h1>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button className="secondary small-btn" onClick={handleLoadDraft}>Load Draft</button>
            <button className="secondary small-btn" onClick={handleSaveDraft}>Save Draft</button>
            <button className="secondary small-btn" onClick={() => setPreviewOpen(true)}>Preview</button>
            <button className="primary small-btn"   onClick={handleIssue} disabled={isIssuing}>
              {isIssuing ? "Issuing…" : "Issue Certificate"}
            </button>
          </div>
        </div>

        <div className="create-grid" style={{ display:"grid", gridTemplateColumns:"1fr 390px", gap:20, marginTop:16 }}>

          {/* ── LEFT ── */}
          <section className="card">
            <h2 style={{ marginTop:0 }}>Recipient & Certificate Details</h2>
            <div style={{ display:"grid", gap:12 }}>

              <label style={{ display:"grid", gap:5 }}>
                <small style={{ fontWeight:600, color:"#444" }}>Full name <span style={{ color:"#e11d48" }}>*</span></small>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Jane Doe" />
              </label>

              <label style={{ display:"grid", gap:5 }}>
                <small style={{ fontWeight:600, color:"#444" }}>Email <span style={{ color:"#e11d48" }}>*</span></small>
                <input name="email" value={form.email} onChange={handleChange} placeholder="recipient@example.com" />
              </label>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <label style={{ display:"grid", gap:5 }}>
                  <small style={{ fontWeight:600, color:"#444" }}>Completion date</small>
                  <input type="date" name="completionDate" value={form.completionDate} onChange={handleChange} />
                </label>
                <label style={{ display:"grid", gap:5 }}>
                  <small style={{ fontWeight:600, color:"#444" }}>Program <span style={{ color:"#e11d48" }}>*</span></small>
                  <select name="program" value={form.program} onChange={handleChange}>
                    <option value="">Select program</option>
                    <optgroup label="Computer & Technology">
                      <option>BS Computer Science</option><option>BS Information Technology</option>
                      <option>BS Data Science</option><option>Professional Data Analytics</option>
                      <option>BS Software Engineering</option><option>BS Cybersecurity</option>
                    </optgroup>
                    <optgroup label="Business">
                      <option>BS Business Administration</option><option>BS Accountancy</option>
                      <option>BS Entrepreneurship</option><option>BS Marketing Management</option>
                      <option>BS Financial Management</option><option>BS Human Resource Management</option>
                    </optgroup>
                    <optgroup label="Engineering">
                      <option>BS Civil Engineering</option><option>BS Computer Engineering</option>
                      <option>BS Electrical Engineering</option><option>BS Mechanical Engineering</option>
                      <option>BS Industrial Engineering</option><option>BS Mechatronics Engineering</option>
                    </optgroup>
                    <optgroup label="Medical & Health Sciences">
                      <option>BS Nursing</option><option>BS Pharmacy</option>
                      <option>BS Public Health</option><option>BS Medical Laboratory Science</option>
                      <option>BS Physiotherapy</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="undergraduate">Undergraduate Certificate</option>
                      <option value="postgraduate">Postgraduate Certificate</option>
                    </optgroup>
                  </select>
                </label>
              </div>

              <label style={{ display:"grid", gap:5 }}>
                <small style={{ fontWeight:600, color:"#444" }}>Certificate title</small>
                <input name="certificateTitle" value={form.certificateTitle} onChange={handleChange} placeholder="e.g. Professional Certificate in Data Analytics" />
              </label>

              {/* ── Editable filename ── */}
              <div style={{ display:"grid", gap:5 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <small style={{ fontWeight:600, color:"#444" }}>File name</small>
                  <span style={{ fontSize:11, color:"#aaa" }}>Auto-suggested · editable</span>
                </div>
                <div style={{
                  display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                  border:"1px solid", borderColor: filenameEditing ? "#1e8e3e" : "rgba(0,0,0,0.1)",
                  borderRadius:8, background: filenameEditing ? "#fff" : "#f9fafb",
                  transition:"border-color 0.2s, background 0.2s",
                }}>
                  {filenameEditing ? (
                    <>
                      <input
                        ref={filenameRef}
                        value={filenameDraft}
                        onChange={e => setFilenameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key==="Enter") confirmEdit(); if (e.key==="Escape") cancelEdit(); }}
                        style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, fontFamily:"monospace", color:"#111" }}
                        placeholder="Enter a custom file name…"
                      />
                      <button onClick={confirmEdit} title="Confirm" style={{ background:"none", border:"none", cursor:"pointer", color:"#1e8e3e", display:"flex" }}><FiCheck size={15}/></button>
                      <button onClick={cancelEdit}  title="Cancel"  style={{ background:"none", border:"none", cursor:"pointer", color:"#999",    display:"flex" }}><FiX    size={15}/></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex:1, fontSize:13, fontFamily:"monospace", color: filename ? "#555" : "#bbb", wordBreak:"break-all" }}>
                        {filename || "Fill in fields above…"}
                      </span>
                      <button onClick={startEdit}      title="Edit file name"    style={{ background:"none", border:"none", cursor:"pointer", color:"#888", display:"flex" }}><FiEdit2    size={14}/></button>
                      <button onClick={resetFilename}  title="Reset to default"  style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", display:"flex" }}><FiRefreshCw size={13}/></button>
                    </>
                  )}
                </div>
                <small style={{ color:"#bbb", fontSize:11 }}>
                  Stored as <code style={{ background:"#f3f4f6", padding:"1px 4px", borderRadius:3 }}>custom_filename</code>; the auto-generated name is always saved separately as <code style={{ background:"#f3f4f6", padding:"1px 4px", borderRadius:3 }}>original_filename</code>.
                </small>
              </div>

              {/* ── Template selector ── */}
              <div style={{ display:"grid", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <small style={{ fontWeight:600, color:"#444" }}>Template</small>
                  <button onClick={() => router.push("/dashboard/templates")}
                    style={{ fontSize:11, color:"#1e8e3e", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                    Manage templates →
                  </button>
                </div>

                {/* Built-in */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {builtInTemplates.map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(s => ({ ...s, template:t, templateId:"", templateName:"" }))}
                      style={{
                        padding:"8px 12px", display:"flex", alignItems:"center", gap:6,
                        background: form.template===t && !form.templateId ? "#0ea5a4" : "#f9fafb",
                        color:      form.template===t && !form.templateId ? "#fff"    : "#555",
                        border:"1px solid", borderColor: form.template===t && !form.templateId ? "#0ea5a4" : "rgba(0,0,0,0.08)",
                        borderRadius:8, cursor:"pointer", fontSize:13, transition:"all 0.15s",
                      }}>
                      <FiAward size={13}/>{t}
                    </button>
                  ))}
                </div>

                {/* Uploaded DB templates */}
                {loadingTpls && <p style={{ color:"#aaa", fontSize:12, margin:0 }}>Loading uploaded templates…</p>}
                {!loadingTpls && dbTemplates.length > 0 && (
                  <div>
                    <small style={{ color:"#999", fontSize:11 }}>Your uploaded templates</small>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                      {dbTemplates.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => setForm(s => ({ ...s, template:t.name, templateId:t.id, templateName:t.name }))}
                          style={{
                            padding:"7px 12px", display:"flex", alignItems:"center", gap:6,
                            background: form.templateId===t.id ? "#1e8e3e" : "#f0fdf4",
                            color:      form.templateId===t.id ? "#fff"    : "#166534",
                            border:"1px solid", borderColor: form.templateId===t.id ? "#1e8e3e" : "#bbf7d0",
                            borderRadius:8, cursor:"pointer", fontSize:12, transition:"all 0.15s",
                          }}>
                          <FiLayers size={12}/>{t.name}
                          <span style={{ fontSize:10, opacity:0.6 }}>({t.type})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!loadingTpls && dbTemplates.length === 0 && (
                  <p style={{ color:"#ccc", fontSize:12, margin:0 }}>
                    No uploaded templates yet.{" "}
                    <span style={{ color:"#1e8e3e", cursor:"pointer" }} onClick={() => router.push("/dashboard/templates")}>
                      Upload one →
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── RIGHT ── */}
          <aside style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card" style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <h3 style={{ margin:0 }}>QR Code & Security</h3>

              {/* QR */}
              <div ref={qrRef} style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:20, background:"#f9fafb", borderRadius:12, border:"1px solid rgba(0,0,0,0.06)", minHeight:200 }}>
                {uniqueHash ? (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ background:"#fff", padding:12, border:"1px solid #eee", borderRadius:10, display:"inline-block" }}>
                      <QRCode value={verifyUrl} size={160}/>
                    </div>
                    <p style={{ fontSize:11, color:"#999", margin:"8px 0 0" }}>Scan to verify</p>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", color:"#ccc" }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🔐</div>
                    <p style={{ fontSize:12, margin:0 }}>QR generated after issuing</p>
                  </div>
                )}
              </div>

              {/* Verify URL row */}
              <div>
                <small style={{ fontWeight:600, color:"#444" }}>Verification URL</small>
                <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:6 }}>
                  <div style={{ flex:1, padding:"8px 10px", border:"1px solid rgba(0,0,0,0.08)", borderRadius:8, fontSize:11, fontFamily:"monospace", color:"#666", wordBreak:"break-all", background:"#f9fafb" }}>
                    {verifyUrl || <span style={{ color:"#ccc" }}>Not generated yet</span>}
                  </div>
                  <button onClick={handleCopyLink} disabled={!uniqueHash} title="Copy link"
                    style={{ padding:"8px 10px", background:"#f1f5f9", border:"1px solid rgba(0,0,0,0.08)", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center" }}>
                    <FiCopy size={14}/>
                  </button>
                </div>
              </div>

              {/* Filename row */}
              <div>
                <small style={{ fontWeight:600, color:"#444" }}>File name</small>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                  <div style={{ flex:1, padding:"8px 10px", border:"1px solid rgba(0,0,0,0.08)", borderRadius:8, fontSize:12, fontFamily:"monospace", color: filename ? "#555" : "#ccc", background:"#f9fafb", wordBreak:"break-all" }}>
                    {filename || "Fill form to generate…"}
                  </div>
                  <button onClick={startEdit} title="Edit filename"
                    style={{ padding:"8px 10px", background:"#f1f5f9", border:"1px solid rgba(0,0,0,0.08)", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center" }}>
                    <FiEdit2 size={14}/>
                  </button>
                </div>
              </div>

              {uniqueHash && (
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#1e8e3e", textDecoration:"none", fontWeight:600 }}>
                  <FiExternalLink size={13}/> Open public verification page
                </a>
              )}

              {/* Primary actions */}
              <div style={{ display:"flex", gap:8 }}>
                <button className="primary" onClick={handleIssue} disabled={isIssuing} style={{ flex:1 }}>
                  {isIssuing ? "Issuing…" : "Issue Certificate"}
                </button>
                <button onClick={handleDownloadQR} disabled={!uniqueHash} title="Download QR"
                  style={{ padding:"10px 12px", background:"#f1f5f9", border:"none", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center" }}>
                  <FiDownload size={15}/>
                </button>
                <button onClick={() => { if (!uniqueHash) { showStatus("Issue first.", "error"); return; } showStatus(`Sent to ${form.email}`, "success"); }}
                  disabled={!uniqueHash} title="Send email"
                  style={{ padding:"10px 12px", background:"#f1f5f9", border:"none", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center" }}>
                  <FiMail size={15}/>
                </button>
              </div>

              {/* Secondary */}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={handleReset}
                  style={{ flex:1, padding:"8px", background:"#fff5f5", border:"1px solid #fecaca", borderRadius:8, cursor:"pointer", color:"#b91c1c", fontSize:13 }}>
                  Clear form
                </button>
                {uniqueHash && (
                  <button onClick={() => router.push("/dashboard/verify")}
                    style={{ flex:1, padding:"8px", background:"#e6f4ea", border:"1px solid #bbf7d0", borderRadius:8, cursor:"pointer", color:"#166534", fontWeight:600, fontSize:13 }}>
                    View all →
                  </button>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="card" style={{ fontSize:13 }}>
              <h4 style={{ margin:"0 0 10px", color:"#444" }}>How it works</h4>
              <ol style={{ margin:0, paddingLeft:18, color:"#666", lineHeight:1.9 }}>
                <li>Fill in recipient details &amp; choose a template</li>
                <li>Edit the <strong>file name</strong> if needed (auto-suggested)</li>
                <li>Press <strong>Issue Certificate</strong></li>
                <li>A QR code linking to the verify page is generated</li>
                <li>Certificate appears live in <strong>Verify Certificates</strong></li>
              </ol>
            </div>
          </aside>
        </div>

        {/* ── Preview modal ── */}
        {previewOpen && (
          <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", zIndex:1200 }}>
            <div className="card" style={{ width:760, maxWidth:"95%", maxHeight:"90%", overflow:"auto", padding:28 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <h3 style={{ margin:0 }}>Certificate Preview</h3>
                  {filename && <p style={{ margin:"4px 0 0", fontSize:12, color:"#888", fontFamily:"monospace" }}>📄 {filename}</p>}
                </div>
                <button onClick={() => setPreviewOpen(false)} style={{ background:"#f1f5f9", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer" }}>Close</button>
              </div>
              <div style={{ border:"2px solid #e6f4ea", borderRadius:12, padding:28, background:"#fff" }}>
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <img src="/img/logo.png" alt="logo" style={{ height:40, margin:"0 auto 10px" }}/>
                  <h2 style={{ margin:"0 0 6px", color:"#1e8e3e" }}>Certificate of Completion</h2>
                  {form.templateName && <p style={{ margin:"0 0 6px", fontSize:12, color:"#bbb" }}>Template: {form.templateName}</p>}
                  <p style={{ color:"#888", margin:"0 0 6px", fontSize:14 }}>This is to certify that</p>
                  <h1 style={{ margin:"0 0 8px", fontSize:28, color:"#111" }}>{form.fullName || "Recipient Name"}</h1>
                  <p style={{ color:"#888", margin:"0 0 6px", fontSize:14 }}>has successfully completed</p>
                  <h3 style={{ margin:"0 0 6px", color:"#1e8e3e" }}>{form.certificateTitle || `Certificate – ${form.program}` || "Program Name"}</h3>
                  {form.completionDate && <p style={{ color:"#999", fontSize:13 }}>Completed on: <strong>{form.completionDate}</strong></p>}
                </div>
                <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap", borderTop:"1px solid #e6f4ea", paddingTop:20 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ padding:10, background:"#fff", border:"1px solid #eee", borderRadius:8, display:"inline-block" }}>
                      {uniqueHash
                        ? <QRCode value={verifyUrl} size={110}/>
                        : <div style={{ width:110, height:110, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#bbb", borderRadius:4 }}>QR after issue</div>
                      }
                    </div>
                    <p style={{ fontSize:11, color:"#999", marginTop:6 }}>Scan to verify</p>
                  </div>
                  <div>
                    <p style={{ fontSize:12, color:"#999", margin:"0 0 4px" }}>Certificate ID</p>
                    <p style={{ fontSize:12, fontFamily:"monospace", color:"#555", wordBreak:"break-all", maxWidth:200 }}>{uniqueHash || "Not issued yet"}</p>
                    <p style={{ fontSize:12, color:"#999", margin:"10px 0 4px" }}>File name</p>
                    <p style={{ fontSize:12, fontFamily:"monospace", color:"#555", wordBreak:"break-all", maxWidth:200 }}>{filename || "—"}</p>
                    <span style={{ display:"inline-block", marginTop:8, padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:600, background:"rgba(14,165,164,0.12)", color:"#0ea5a4" }}>
                      {uniqueHash ? "Issued" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {statusMessage && (
          <div style={{
            position:"fixed", right:20, bottom:20,
            background: statusType==="success" ? "#1e8e3e" : statusType==="error" ? "#dc2626" : "#1e293b",
            color:"#fff", padding:"10px 18px", borderRadius:10, zIndex:9999,
            boxShadow:"0 4px 16px rgba(0,0,0,0.25)", fontSize:14, maxWidth:340,
            display:"flex", alignItems:"center", gap:8,
          }}>
            {statusType==="success" ? "✅" : statusType==="error" ? "❌" : "ℹ️"} {statusMessage}
          </div>
        )}
      </main>
    </div>
  );
}