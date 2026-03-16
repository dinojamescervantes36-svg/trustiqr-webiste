"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiSearch, FiPlus, FiTrash2, FiEye, FiRefreshCw, FiX,
} from "react-icons/fi";

export default function VerifyCertificate() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewCert, setViewCert] = useState(null);
  const [adding, setAdding] = useState({
    id: "", name: "",
    issued: new Date().toISOString().slice(0, 10),
    status: "Issued",
  });

  const loadCertificates = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('certificates').select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (data) setCertificates(data.map(c => ({
      id: c.cert_id,
      name: c.recipient_name || '',
      issued: c.completion_date || c.created_at?.slice(0, 10),
      status: c.status || 'Issued',
      hash: c.unique_hash || c.cert_id,
      title: c.certificate_title || '',
      program: c.program || '',
      email: c.email || '',
    })));
  };

  useEffect(() => { loadCertificates(); }, [currentUser]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.id || "").toLowerCase().includes(q) ||
      (c.status || "").toLowerCase().includes(q)
    );
  }, [certificates, search]);

  const handleAddOpen = () => {
    setAdding({ id: `CERT-${Math.random().toString(36).slice(2, 9).toUpperCase()}`, name: "", issued: new Date().toISOString().slice(0, 10), status: "Issued" });
    setShowAdd(true);
  };

  const handleAddSave = async () => {
    if (!adding.name.trim() || !adding.id.trim()) { alert("Please provide certificate ID and recipient name."); return; }
    const { data, error } = await supabase.from('certificates').insert({
      user_id: currentUser.id,
      cert_id: adding.id,
      recipient_name: adding.name,
      completion_date: adding.issued || null,
      status: adding.status,
      unique_hash: adding.id,
    }).select().single();
    if (!error && data) {
      setCertificates(prev => [{ id: data.cert_id, name: data.recipient_name, issued: data.completion_date, status: data.status, hash: data.unique_hash || data.cert_id, title: '', program: '', email: '' }, ...prev]);
      setShowAdd(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this certificate?")) return;
    await supabase.from('certificates').delete().eq('cert_id', id).eq('user_id', currentUser.id);
    setCertificates(prev => prev.filter((c) => c.id !== id));
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
          <li onClick={() => router.push("/dashboard/create")}><FiFilePlus /> Create New Certificates</li>
          <li className="active"><FiCheckCircle /> Verify Certificate</li>
          <li onClick={() => router.push("/dashboard/templates")}><FiLayers /> Manage Templates</li>
          <li onClick={() => router.push("/dashboard/users")}><FiUsers /> User Accounts</li>
          <li onClick={() => router.push("/dashboard/settings")}><FiSettings /> Settings</li>
        </ul>
      </aside>

      <main className="main verify-main">
        <div className="verify-header-section">
          <div className="verify-title">
            <h1>Verify Certificates</h1>
            <p>Search and manage issued certificates.</p>
          </div>
          <div className="verify-controls">
            <div className="search-box-verify">
              <FiSearch />
              <input placeholder="Search by name, ID or status" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={handleAddOpen} className="primary"><FiPlus /> Add</button>
          </div>
        </div>

        <div className="verify-content">
          <section className="card verify-card-list">
            <div className="card-header">
              <h3>Issued Certificates</h3>
              <div className="card-actions-header">
                <button className="btn" onClick={loadCertificates} title="Refresh"><FiRefreshCw /></button>
              </div>
            </div>

            <div className="table-container">
              <table className="cert-table">
                <thead>
                  <tr>
                    <th>Certificate ID</th>
                    <th>Issued On</th>
                    <th>Recipient Name</th>
                    <th>Status</th>
                    <th className="actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="empty-state">No certificates found.</td></tr>
                  ) : (
                    filtered.map((cert) => (
                      <tr key={cert.id}>
                        <td className="id-cell">{cert.id}</td>
                        <td>{cert.issued}</td>
                        <td>{cert.name}</td>
                        <td><span className={`badge ${(cert.status || '').toLowerCase()}`}>{cert.status}</span></td>
                        <td className="actions-cell">
                          <button title="View" onClick={() => setViewCert(cert)} className="btn"><FiEye /></button>
                          <button title="Remove" onClick={() => handleRemove(cert.id)} className="btn danger"><FiTrash2 /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {filtered.length === 0 ? (
                <div className="empty-state-mobile">No certificates found.</div>
              ) : (
                filtered.map((cert) => (
                  <div key={cert.id} className="cert-mobile-card">
                    <div className="card-top-section">
                      <div className="cert-id-mobile">{cert.id}</div>
                      <span className={`badge ${(cert.status || '').toLowerCase()}`}>{cert.status}</span>
                    </div>
                    <div className="card-middle-section">
                      <div className="cert-recipient">{cert.name}</div>
                      <div className="cert-date">{cert.issued}</div>
                    </div>
                    <div className="card-action-buttons">
                      <button onClick={() => setViewCert(cert)} className="btn"><FiEye /> View</button>
                      <button onClick={() => handleRemove(cert.id)} className="btn danger"><FiTrash2 /> Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="card verify-activity-card">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {certificates.length === 0 ? (
                <div className="activity-empty">No activity yet.</div>
              ) : (
                certificates.slice(0, 6).map((c) => (
                  <div key={c.id} className="activity-item">
                    <div className="activity-info">
                      <div className="activity-name">{c.name || c.id}</div>
                      <div className="activity-date">{c.issued}</div>
                    </div>
                    <div className="activity-status">{c.status}</div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Add Certificate</h3>
              <div className="modal-form">
                <label className="form-group">
                  <small>Certificate ID</small>
                  <input value={adding.id} onChange={(e) => setAdding((s) => ({ ...s, id: e.target.value }))} placeholder="CERT-ABC123" />
                </label>
                <label className="form-group">
                  <small>Recipient Name</small>
                  <input value={adding.name} onChange={(e) => setAdding((s) => ({ ...s, name: e.target.value }))} placeholder="Enter recipient name" />
                </label>
                <div className="form-row">
                  <label className="form-group">
                    <small>Issued On</small>
                    <input type="date" value={adding.issued} onChange={(e) => setAdding((s) => ({ ...s, issued: e.target.value }))} />
                  </label>
                  <label className="form-group">
                    <small>Status</small>
                    <select value={adding.status} onChange={(e) => setAdding((s) => ({ ...s, status: e.target.value }))}>
                      <option>Issued</option>
                      <option>Pending</option>
                      <option>Revoked</option>
                    </select>
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="btn secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button className="btn primary" onClick={handleAddSave}>Add Certificate</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Certificate Modal */}
        {viewCert && (
          <div className="modal-overlay" onClick={() => setViewCert(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 32, width: "90%", maxWidth: 580, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: "#1e8e3e" }}>Certificate</h3>
                <button onClick={() => setViewCert(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#666" }}><FiX /></button>
              </div>

              <div style={{ border: "2px solid #e6f4ea", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20 }}>
                <img src="/img/logo.png" alt="logo" style={{ height: 40, margin: "0 auto 10px" }} />
                <h4 style={{ margin: "0 0 4px", color: "#1e8e3e", fontSize: 18 }}>Certificate of Completion</h4>
                <p style={{ color: "#888", margin: "0 0 12px", fontSize: 13 }}>This is to certify that</p>
                <h2 style={{ margin: "0 0 6px", fontSize: 24, color: "#111" }}>{viewCert.name || "—"}</h2>
                {(viewCert.title || viewCert.program) && (
                  <p style={{ color: "#666", margin: "0 0 6px", fontSize: 14 }}>{viewCert.title || viewCert.program}</p>
                )}
                {viewCert.issued && (
                  <p style={{ color: "#999", margin: 0, fontSize: 13 }}>Completed on: <strong>{viewCert.issued}</strong></p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ background: "#fff", padding: 10, border: "1px solid #eee", borderRadius: 8, display: "inline-block" }}>
                    <QRCode value={viewCert.hash || viewCert.id} size={110} />
                  </div>
                  <p style={{ fontSize: 11, color: "#999", marginTop: 6 }}>Scan to verify</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "#999", margin: "0 0 4px" }}>Certificate ID</p>
                  <p style={{ fontSize: 12, fontFamily: "monospace", color: "#555", wordBreak: "break-all", maxWidth: 200 }}>{viewCert.hash || viewCert.id}</p>
                  <span style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "rgba(14,165,164,0.12)", color: "#0ea5a4" }}>{viewCert.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
