"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FiHome, FiFilePlus, FiCheckCircle, FiUsers, FiLayers, FiSettings, FiTrash2, FiUpload, FiEye, FiFile } from "react-icons/fi";

export default function ManageTemplates() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadTemplates(); }, [currentUser]);

  const loadTemplates = async () => {
    if (!currentUser) return;
    const { data, error } = await supabase.storage
      .from('certificates')
      .list(`templates/${currentUser.id}`, { sortBy: { column: 'created_at', order: 'desc' } });
    if (data) {
      setTemplates(data.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({
        id: f.id || f.name,
        name: f.name.replace(/^\d+_/, ''),
        fullPath: `templates/${currentUser.id}/${f.name}`,
        type: f.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE',
        createdAt: f.created_at?.slice(0, 10) || '—',
      })));
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const filePath = `templates/${currentUser.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('certificates').upload(filePath, file);
    if (error) alert("Upload failed: " + error.message);
    else await loadTemplates();
    setUploading(false);
    e.target.value = null;
  };

  const handleView = async (template) => {
    const { data } = await supabase.storage.from('certificates').createSignedUrl(template.fullPath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else alert("Could not open file.");
  };

  const handleDelete = async (template) => {
    if (!confirm("Delete this template permanently?")) return;
    const { error } = await supabase.storage.from('certificates').remove([template.fullPath]);
    if (!error) setTemplates(prev => prev.filter(t => t.id !== template.id));
    else alert("Delete failed: " + error.message);
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
          <li onClick={() => router.push("/dashboard/verify")}><FiCheckCircle /> Verify Certificate</li>
          <li className="active"><FiLayers /> Manage Templates</li>
          <li onClick={() => router.push("/dashboard/users")}><FiUsers /> User Accounts</li>
          <li onClick={() => router.push("/dashboard/settings")}><FiSettings /> Settings</li>
        </ul>
      </aside>

      <main className="main">
        <div className="create-navbar">
          <h1>Manage Templates</h1>
          <button className="primary small-btn" onClick={() => fileInputRef.current.click()} disabled={uploading}>
            <FiUpload /> {uploading ? "Uploading..." : "Upload Template"}
          </button>
        </div>

        <input type="file" ref={fileInputRef} hidden accept=".pdf,image/png,image/jpeg,image/jpg" onChange={handleFileSelected} />

        <div className="template-grid">
          {templates.length === 0 && (
            <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#999" }}>
              <FiFile size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>No templates yet</p>
              <p style={{ fontSize: 13, margin: 0 }}>Upload PDF, PNG or JPG files to use as certificate templates.</p>
            </div>
          )}
          {templates.map((template) => (
            <div key={template.id} className="card template-card">
              <h3 style={{ wordBreak: "break-word", fontSize: 16 }}>{template.name}</h3>
              <p><strong>Type:</strong> {template.type}</p>
              <p><strong>Uploaded:</strong> {template.createdAt}</p>
              <div className="template-actions">
                <button onClick={() => handleView(template)}><FiEye /> View</button>
                <button className="danger" onClick={() => handleDelete(template)}><FiTrash2 /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
