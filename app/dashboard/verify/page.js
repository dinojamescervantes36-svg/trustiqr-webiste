"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiSearch, FiPlus, FiTrash2,
  FiEye, FiRefreshCw, FiX, FiExternalLink, FiEdit2, FiCheck,
} from "react-icons/fi";

export default function VerifyCertificate() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();

  const [search,       setSearch]       = useState("");
  const [certificates, setCertificates] = useState([]);
  const [showAdd,      setShowAdd]      = useState(false);
  const [viewCert,     setViewCert]     = useState(null);
  const [editingId,    setEditingId]    = useState(null);
  const [editDraft,    setEditDraft]    = useState("");
  const [verifyInput,  setVerifyInput]  = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying,    setVerifying]    = useState(false);
  const [adding, setAdding] = useState({
    id: "", name: "", issued: new Date().toISOString().slice(0, 10), status: "Issued",
  });

  const getVerifyUrl = (cert) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/verify/${cert.hash || cert.id}`;
  };

  const mapCert = (c) => ({
    id:               c.cert_id,
    name:             c.recipient_name    || "",
    issued:           c.completion_date   || c.created_at?.slice(0, 10),
    status:           c.status            || "Issued",
    hash:             c.unique_hash       || c.cert_id,
    title:            c.certificate_title || "",
    program:          c.program           || "",
    email:            c.email             || "",
    templateName:     c.template_name     || c.template || "",
    customFilename:   c.custom_filename   || c.certificate_title || c.cert_id,
    originalFilename: c.original_filename || "",
  });

  const loadCertificates = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("certificates").select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });
    if (data) setCertificates(data.map(mapCert));
  }, [currentUser]);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  useEffect(() => {
    const qr = searchParams?.get("qr");
    if (qr) { setVerifyInput(decodeURIComponent(qr)); runVerify(decodeURIComponent(qr)); }
  }, [searchParams]);

  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase.channel("certs-rt")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"certificates", filter:`user_id=eq.${currentUser.id}` },
        p => setCertificates(prev => [mapCert(p.new), ...prev]))
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"certificates", filter:`user_id=eq.${currentUser.id}` },
        p => setCertificates(prev => prev.map(c => c.id === p.new.cert_id ? mapCert(p.new) : c)))
      .on("postgres_changes", { event:"DELETE", schema:"public", table:"certificates", filter:`user_id=eq.${currentUser.id}` },
        p => setCertificates(prev => prev.filter(c => c.id !== p.old.cert_id)))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [currentUser]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(c =>
      [c.name, c.id, c.status, c.title, c.customFilename, c.templateName]
        .some(v => (v||"").toLowerCase().includes(q))
    );
  }, [certificates, search]);

  const saveFilename = async (certId) => {
    const cleaned = editDraft.trim().replace(/[\/\\:*?"<>|]/g,"").trim();
    if (!cleaned) { setEditingId(null); return; }
    await supabase.from("certificates").update({ custom_filename: cleaned })
      .eq("cert_id", certId).eq("user_id", currentUser.id);
    setCertificates(prev => prev.map(c => c.id===certId ? {...c, customFilename:cleaned} : c));
    setEditingId(null);
  };

  const runVerify = async (val) => {
    const v = (val ?? verifyInput).trim();
    if (!v) return;
    setVerifying(true); setVerifyResult(null);
    const { data } = await supabase.from("certificates").select("*")
      .or(`unique_hash.eq.${v},cert_id.eq.${v}`).single();
    setVerifyResult({ found:!!data, cert:data });
    setVerifying(false);
  };

  const handleAddOpen = () => {
    setAdding({ id:`CERT-${Math.random().toString(36).slice(2,9).toUpperCase()}`, name:"", issued:new Date().toISOString().slice(0,10), status:"Issued" });
    setShowAdd(true);
  };

  const handleAddSave = async () => {
    if (!adding.name.trim()||!adding.id.trim()) { alert("Please provide certificate ID and recipient name."); return; }
    const { error } = await supabase.from("certificates").insert({
      user_id:currentUser.id, cert_id:adding.id, recipient_name:adding.name,
      completion_date:adding.issued||null, status:adding.status,
      unique_hash:adding.id, original_filename:adding.name, custom_filename:adding.name,
    });
    if (!error) setShowAdd(false);
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this certificate?")) return;
    await supabase.from("certificates").delete().eq("cert_id",id).eq("user_id",currentUser.id);
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo"><img src="/img/logo.png" alt="TrustiQR"/><span>TrustiQR</span></div>
        <ul>
          <li onClick={()=>router.push("/dashboard")}><FiHome/> Dashboard</li>
          <li onClick={()=>router.push("/dashboard/create")}><FiFilePlus/> Create New Certificates</li>
          <li className="active"><FiCheckCircle/> Verify Certificate</li>
          <li onClick={()=>router.push("/dashboard/templates")}><FiLayers/> Manage Templates</li>
          <li onClick={()=>router.push("/dashboard/users")}><FiUsers/> User Accounts</li>
          <li onClick={()=>router.push("/dashboard/settings")}><FiSettings/> Settings</li>
        </ul>
      </aside>

      <main className="main verify-main">
        <div className="verify-header-section">
          <div className="verify-title">
            <h1>Verify Certificates</h1>
            <p>Search, manage, and verify issued certificates in real time.</p>
          </div>
          <div className="verify-controls">
            <div className="search-box-verify">
              <FiSearch/>
              <input placeholder="Search name, ID, file name, template…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button onClick={handleAddOpen} className="primary" style={{width:"auto",padding:"10px 16px"}}><FiPlus/> Add</button>
          </div>
        </div>

        {/* Manual verify */}
        <div className="card" style={{marginBottom:20,padding:"16px 20px"}}>
          <h3 style={{margin:"0 0 10px",fontSize:15,color:"#333"}}>🔍 Verify by Certificate ID or QR Hash</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input value={verifyInput} onChange={e=>{setVerifyInput(e.target.value);setVerifyResult(null);}}
              placeholder="Paste certificate ID or unique hash…"
              style={{flex:1,minWidth:200,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.1)",borderRadius:8,fontSize:14,fontFamily:"monospace"}}
              onKeyDown={e=>e.key==="Enter"&&runVerify()}/>
            <button onClick={()=>runVerify()} disabled={verifying||!verifyInput.trim()}
              style={{padding:"10px 20px",background:"#1e8e3e",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>
              {verifying?"Checking…":"Verify"}
            </button>
          </div>
          {verifyResult && (
            <div style={{marginTop:12,padding:"12px 16px",borderRadius:8,background:verifyResult.found?"#dcfce7":"#fee2e2",border:`1px solid ${verifyResult.found?"#86efac":"#fca5a5"}`}}>
              {verifyResult.found ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <strong style={{color:"#166534"}}>✅ Certificate Found &amp; Verified</strong>
                    <p style={{margin:"4px 0 0",fontSize:13,color:"#15803d"}}>
                      <strong>{verifyResult.cert.recipient_name}</strong> — {verifyResult.cert.certificate_title||verifyResult.cert.program}
                    </p>
                    {(verifyResult.cert.custom_filename||verifyResult.cert.original_filename) && (
                      <p style={{margin:"2px 0 0",fontSize:12,color:"#166534",fontFamily:"monospace"}}>
                        📄 {verifyResult.cert.custom_filename||verifyResult.cert.original_filename}
                      </p>
                    )}
                    <p style={{margin:"2px 0 0",fontSize:12,color:"#166534"}}>
                      Status: <strong>{verifyResult.cert.status}</strong>
                      {verifyResult.cert.completion_date&&` • Completed: ${verifyResult.cert.completion_date}`}
                    </p>
                  </div>
                  <a href={`/verify/${verifyResult.cert.unique_hash||verifyResult.cert.cert_id}`} target="_blank" rel="noopener noreferrer"
                    style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#166534",textDecoration:"none",fontWeight:600,padding:"6px 12px",background:"#bbf7d0",borderRadius:6}}>
                    <FiExternalLink size={13}/> View Certificate
                  </a>
                </div>
              ) : (
                <strong style={{color:"#991b1b"}}>❌ Certificate not found. This ID may be invalid or revoked.</strong>
              )}
            </div>
          )}
        </div>

        <div className="verify-content">
          <section className="card verify-card-list">
            <div className="card-header">
              <h3>Issued Certificates ({filtered.length})</h3>
              <div className="card-actions-header">
                <button className="btn" onClick={loadCertificates} title="Refresh"><FiRefreshCw/></button>
              </div>
            </div>

            <div className="table-container">
              <table className="cert-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Certificate ID</th>
                    <th>Issued On</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th className="actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0 ? (
                    <tr><td colSpan={6} className="empty-state">No certificates found.</td></tr>
                  ) : (
                    filtered.map(cert=>(
                      <tr key={cert.id}>
                        <td style={{maxWidth:180}}>
                          {editingId===cert.id ? (
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <input value={editDraft} onChange={e=>setEditDraft(e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter")saveFilename(cert.id);if(e.key==="Escape")setEditingId(null);}}
                                autoFocus
                                style={{width:"100%",padding:"4px 6px",border:"1px solid #1e8e3e",borderRadius:5,fontSize:12,fontFamily:"monospace"}}/>
                              <button onClick={()=>saveFilename(cert.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#1e8e3e"}}><FiCheck size={13}/></button>
                              <button onClick={()=>setEditingId(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999"}}><FiX size={13}/></button>
                            </div>
                          ) : (
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontSize:12,fontFamily:"monospace",color:"#555",wordBreak:"break-all"}}>{cert.customFilename||"—"}</span>
                              <button onClick={()=>{setEditingId(cert.id);setEditDraft(cert.customFilename||"");}}
                                style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",flexShrink:0}}>
                                <FiEdit2 size={11}/>
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="id-cell">{cert.id}</td>
                        <td>{cert.issued}</td>
                        <td>{cert.name}</td>
                        <td><span className={`badge ${(cert.status||"").toLowerCase()}`}>{cert.status}</span></td>
                        <td className="actions-cell">
                          <button title="View" onClick={()=>setViewCert(cert)} className="btn"><FiEye/></button>
                          <a href={getVerifyUrl(cert)} target="_blank" rel="noopener noreferrer" className="btn" title="Public page" style={{textDecoration:"none"}}><FiExternalLink/></a>
                          <button title="Delete" onClick={()=>handleRemove(cert.id)} className="btn danger"><FiTrash2/></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {filtered.length===0 ? (
                <div className="empty-state-mobile">No certificates found.</div>
              ) : (
                filtered.map(cert=>(
                  <div key={cert.id} className="cert-mobile-card">
                    <div className="card-top-section">
                      <div style={{display:"flex",flexDirection:"column",gap:2,flex:1}}>
                        <div className="cert-id-mobile">{cert.id}</div>
                        {cert.customFilename&&<div style={{fontSize:11,fontFamily:"monospace",color:"#888"}}>📄 {cert.customFilename}</div>}
                      </div>
                      <span className={`badge ${(cert.status||"").toLowerCase()}`}>{cert.status}</span>
                    </div>
                    <div className="card-middle-section">
                      <div className="cert-recipient">{cert.name}</div>
                      <div className="cert-date">{cert.issued}</div>
                    </div>
                    <div className="card-action-buttons">
                      <button onClick={()=>setViewCert(cert)} className="btn"><FiEye/> View</button>
                      <a href={getVerifyUrl(cert)} target="_blank" rel="noopener noreferrer" className="btn" style={{textDecoration:"none"}}><FiExternalLink/> Open</a>
                      <button onClick={()=>handleRemove(cert.id)} className="btn danger"><FiTrash2/> Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="card verify-activity-card">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {certificates.length===0 ? (
                <div className="activity-empty">No activity yet.</div>
              ) : (
                certificates.slice(0,6).map(c=>(
                  <div key={c.id} className="activity-item">
                    <div className="activity-info">
                      <div className="activity-name">{c.customFilename||c.name||c.id}</div>
                      <div className="activity-date">{c.issued}</div>
                    </div>
                    <div className="activity-status">{c.status}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid rgba(0,0,0,0.06)"}}>
              <button onClick={()=>router.push("/dashboard/create")}
                style={{width:"100%",padding:"10px",background:"#1e8e3e",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
                + Issue New Certificate
              </button>
            </div>
          </aside>
        </div>

        {showAdd && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Add Certificate</h3>
              <div className="modal-form">
                <label className="form-group"><small>Certificate ID</small><input value={adding.id} onChange={e=>setAdding(s=>({...s,id:e.target.value}))} placeholder="CERT-ABC123"/></label>
                <label className="form-group"><small>Recipient Name</small><input value={adding.name} onChange={e=>setAdding(s=>({...s,name:e.target.value}))} placeholder="Enter recipient name"/></label>
                <div className="form-row">
                  <label className="form-group"><small>Issued On</small><input type="date" value={adding.issued} onChange={e=>setAdding(s=>({...s,issued:e.target.value}))}/></label>
                  <label className="form-group"><small>Status</small>
                    <select value={adding.status} onChange={e=>setAdding(s=>({...s,status:e.target.value}))}>
                      <option>Issued</option><option>Pending</option><option>Revoked</option>
                    </select>
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="btn secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
                  <button className="btn primary" onClick={handleAddSave}>Add Certificate</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewCert && (
          <div className="modal-overlay" onClick={()=>setViewCert(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:32,width:"90%",maxWidth:580,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div>
                  <h3 style={{margin:0,color:"#1e8e3e"}}>Certificate</h3>
                  {viewCert.customFilename&&<p style={{margin:"4px 0 0",fontSize:12,color:"#888",fontFamily:"monospace"}}>📄 {viewCert.customFilename}</p>}
                </div>
                <button onClick={()=>setViewCert(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#666"}}><FiX/></button>
              </div>
              <div style={{border:"2px solid #e6f4ea",borderRadius:12,padding:24,textAlign:"center",marginBottom:20}}>
                <img src="/img/logo.png" alt="logo" style={{height:40,margin:"0 auto 10px"}}/>
                <h4 style={{margin:"0 0 4px",color:"#1e8e3e",fontSize:18}}>Certificate of Completion</h4>
                {viewCert.templateName&&<p style={{margin:"0 0 8px",fontSize:12,color:"#bbb"}}>Template: {viewCert.templateName}</p>}
                <p style={{color:"#888",margin:"0 0 12px",fontSize:13}}>This is to certify that</p>
                <h2 style={{margin:"0 0 6px",fontSize:24,color:"#111"}}>{viewCert.name||"—"}</h2>
                {(viewCert.title||viewCert.program)&&<p style={{color:"#666",margin:"0 0 6px",fontSize:14}}>{viewCert.title||viewCert.program}</p>}
                {viewCert.issued&&<p style={{color:"#999",margin:0,fontSize:13}}>Completed on: <strong>{viewCert.issued}</strong></p>}
              </div>
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:24,flexWrap:"wrap"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{background:"#fff",padding:10,border:"1px solid #eee",borderRadius:8,display:"inline-block"}}>
                    <QRCode value={getVerifyUrl(viewCert)} size={110}/>
                  </div>
                  <p style={{fontSize:11,color:"#999",marginTop:6}}>Scan to verify</p>
                </div>
                <div>
                  <p style={{fontSize:12,color:"#999",margin:"0 0 4px"}}>Certificate ID</p>
                  <p style={{fontSize:12,fontFamily:"monospace",color:"#555",wordBreak:"break-all",maxWidth:200}}>{viewCert.hash||viewCert.id}</p>
                  <p style={{fontSize:12,color:"#999",margin:"10px 0 4px"}}>File name</p>
                  <p style={{fontSize:12,fontFamily:"monospace",color:"#555",wordBreak:"break-all",maxWidth:200}}>{viewCert.customFilename||"—"}</p>
                  <span style={{display:"inline-block",marginTop:8,padding:"4px 12px",borderRadius:999,fontSize:12,fontWeight:600,background:"rgba(14,165,164,0.12)",color:"#0ea5a4"}}>{viewCert.status}</span>
                  <div style={{marginTop:12}}>
                    <a href={getVerifyUrl(viewCert)} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"#1e8e3e",textDecoration:"none",fontWeight:600}}>
                      <FiExternalLink size={13}/> Open public page
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}