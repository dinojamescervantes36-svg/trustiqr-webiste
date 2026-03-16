"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line, Doughnut } from "react-chartjs-2";
import jsQR from "jsqr";

import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiUpload, FiCamera, FiAward,
} from "react-icons/fi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isLoadingUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [certificates, setCertificates] = useState([]);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);

  const [form, setForm] = useState({
    id: "", recipient: "",
    date: new Date().toISOString().slice(0, 10),
    status: "issued", summary: "",
  });

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [decodedQR, setDecodedQR] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [permissionState, setPermissionState] = useState("unknown");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [permissionErrorName, setPermissionErrorName] = useState("");

  // Load user profile + certificates
  useEffect(() => {
    if (isLoadingUser) return;
    if (!currentUser) { router.replace("/"); return; }

    supabase.from('profiles').select('*').eq('id', currentUser.id).single()
      .then(({ data }) => {
        setUser({ email: currentUser.email, ...data });
      });

    loadCertificates();
    setLoading(false);
  }, [currentUser, isLoadingUser, router]);

  const loadCertificates = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (data) {
      setCertificates(data.map(c => ({
        id: c.cert_id,
        recipient: c.recipient_name || '',
        date: c.completion_date || c.created_at?.slice(0, 10),
        status: (c.status || 'issued').toLowerCase(),
        summary: c.certificate_title || c.cert_id,
      })));
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const certId = form.id || `manual-${Date.now()}`;
    const { data, error } = await supabase.from('certificates').insert({
      user_id: currentUser.id,
      cert_id: certId,
      recipient_name: form.recipient || 'Unknown',
      completion_date: form.date || null,
      status: form.status || 'Issued',
      certificate_title: form.summary || `Certificate ${certId}`,
    }).select().single();

    if (!error && data) {
      setCertificates(prev => [{
        id: data.cert_id,
        recipient: data.recipient_name,
        date: data.completion_date || data.created_at?.slice(0, 10),
        status: data.status.toLowerCase(),
        summary: data.certificate_title,
      }, ...prev]);
    }
    setForm({ id: "", recipient: "", date: new Date().toISOString().slice(0, 10), status: "issued", summary: "" });
  };

  const overviewTotals = useMemo(() => {
    const totals = { issued: 0, pending: 0, fraud: 0 };
    certificates.forEach((c) => {
      if (c.status === "issued") totals.issued++;
      else if (c.status === "pending") totals.pending++;
      else if (c.status === "fraud") totals.fraud++;
    });
    return totals;
  }, [certificates]);

  const lineData = useMemo(() => {
    const map = {};
    const labels = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      labels.push(dateStr.slice(5));
      map[dateStr] = 0;
    }
    certificates.forEach((c) => {
      if (c.status === "issued" && c.date && map[c.date] !== undefined) map[c.date] += 1;
    });
    return {
      labels,
      datasets: [{
        label: "Issued (last 14 days)",
        data: Object.values(map),
        borderColor: "#1e8e3e",
        backgroundColor: "rgba(30,142,62,0.08)",
        tension: 0.3,
        fill: true,
      }],
    };
  }, [certificates]);

  const doughnutData = useMemo(() => ({
    labels: ["Issued", "Pending", "Fraud"],
    datasets: [{
      data: [overviewTotals.issued, overviewTotals.pending, overviewTotals.fraud],
      backgroundColor: ["#1e8e3e", "#3b82f6", "#ef4444"],
      borderWidth: 0,
    }],
  }), [overviewTotals]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const checkPermissions = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    try {
      const p = await navigator.permissions.query({ name: "camera" });
      setPermissionState(p.state);
      p.onchange = () => setPermissionState(p.state);
    } catch {
      setPermissionState("prompt");
    }
  }, []);

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
      if (!selectedDeviceId && videoInputs.length) setSelectedDeviceId(videoInputs[0].deviceId);
    } catch { setDevices([]); }
  }, [selectedDeviceId]);

  const requestPermissionAndEnumerate = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera not available. Use HTTPS or localhost.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionState("granted");
      await enumerateDevices();
      return true;
    } catch {
      setPermissionState("denied");
      return false;
    }
  }, [enumerateDevices]);

  const processFile = async (f) => {
    if (!f) return;
    setUploadedFile(f);
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result);
    reader.readAsDataURL(f);

    // Upload to Supabase storage
    const filePath = `${currentUser.id}/${Date.now()}_${f.name}`;
    const { error: uploadError } = await supabase.storage.from('certificates').upload(filePath, f);

    const certId = `file-${Date.now()}`;
    const { data } = await supabase.from('certificates').insert({
      user_id: currentUser.id,
      cert_id: certId,
      certificate_title: `Uploaded: ${f.name}`,
      status: 'Issued',
      completion_date: new Date().toISOString().slice(0, 10),
    }).select().single();

    if (data) {
      setCertificates(prev => [{
        id: data.cert_id,
        recipient: '',
        date: data.completion_date,
        status: 'issued',
        summary: data.certificate_title,
      }, ...prev]);
    }
  };

  const handleFileChange = (e) => processFile(e.target.files?.[0]);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const handleDrop = (e) => { e.preventDefault(); processFile(e.dataTransfer.files?.[0]); };

  const startCamera = useCallback(async (deviceId) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera not available.");
      return false;
    }
    try {
      const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: { facingMode: "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia({ ...constraints, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      await new Promise((resolve) => {
        let attempts = 0;
        const id = setInterval(() => {
          attempts++;
          if (videoRef.current || attempts > 20) { clearInterval(id); resolve(); }
        }, 30);
      });
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.srcObject = streamRef.current;
        try { await videoRef.current.play(); } catch { }
      }
      setPermissionState("granted");
      setShowPermissionHelp(false);
      await enumerateDevices();
      return true;
    } catch (err) {
      const name = err.name || "";
      setPermissionErrorName(name);
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        setPermissionState("denied");
        setShowPermissionHelp(true);
        return false;
      }
      alert("Could not open camera: " + (err.message || name));
      return false;
    }
  }, [enumerateDevices]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
    setCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setScannedImage(dataUrl);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      if (code?.data) {
        setDecodedQR(code.data);
        stopCamera();
        router.push(`/dashboard/verify?qr=${encodeURIComponent(code.data)}`);
        return;
      } else {
        alert("No QR code detected. Try again.");
      }
    } catch (err) { console.error("QR decode error", err); }
    stopCamera();
  }, [stopCamera, router]);

  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { });
    }
  }, [cameraOpen]);

  useEffect(() => { checkPermissions(); }, [checkPermissions]);
  useEffect(() => { if (permissionState === "granted") enumerateDevices(); }, [permissionState, enumerateDevices]);

  const openBrowserSettings = () => {
    const ua = navigator.userAgent || "";
    if (/Edg\//.test(ua)) { window.open("edge://settings/content/camera", "_blank"); return; }
    if (/Chrome\//.test(ua)) { window.open("chrome://settings/content/camera", "_blank"); return; }
    alert("Open your browser's site settings and allow Camera permissions for this site.");
  };

  if (loading || isLoadingUser) return <div style={{ padding: 40 }}>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          <span>TrustiQR</span>
        </div>
        <ul>
          <li onClick={() => router.push("/dashboard")} className={pathname === "/dashboard" ? "active" : ""}><FiHome /> Dashboard</li>
          <li onClick={() => router.push("/dashboard/create")} className={pathname === "/dashboard/create" ? "active" : ""}><FiFilePlus /> Create New Certificates</li>
          <li onClick={() => router.push("/dashboard/verify")} className={pathname === "/dashboard/verify" ? "active" : ""}><FiCheckCircle /> Verify Certificate</li>
          <li onClick={() => router.push("/dashboard/templates")} className={pathname === "/dashboard/templates" ? "active" : ""}><FiLayers /> Manage Templates</li>
          <li onClick={() => router.push("/dashboard/users")} className={pathname === "/dashboard/users" ? "active" : ""}><FiUsers /> User Accounts</li>
          <li onClick={() => router.push("/dashboard/settings")} className={pathname === "/dashboard/settings" ? "active" : ""}><FiSettings /> Settings</li>
        </ul>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>Welcome, {user?.name || user?.email || "User"}!</h1>
          <button className="logout" onClick={handleLogout}>Logout</button>
        </div>

        <div className="overview">
          <div className="card">
            <h3>Overview Analytics</h3>
            <div style={{ height: 160 }} className="chart-sm">
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <strong>Issued:</strong> {overviewTotals.issued} &nbsp;|&nbsp;
              <strong>Pending:</strong> {overviewTotals.pending}
            </div>
            {decodedQR && (
              <div style={{ marginTop: 8, color: "#064e3b" }}>
                <strong>Last scan:</strong> {decodedQR}
              </div>
            )}
          </div>

          <div className="card actions" onDragOver={handleDragOver} onDrop={handleDrop} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label className="primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <FiUpload />
                Issue New Certificate
                <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFileChange} />
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} style={{ padding: "6px 8px" }}>
                  {devices.length === 0 && <option value="">No camera devices</option>}
                  {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId}`}</option>))}
                </select>
                <button className="primary" onClick={async () => { const ok = await requestPermissionAndEnumerate(); if (ok) await startCamera(selectedDeviceId || undefined); }}>
                  <FiCamera /> Scan to Verify (Enable)
                </button>
                <button className="secondary" onClick={() => startCamera(selectedDeviceId || undefined)}>Open camera</button>
                <div style={{ marginLeft: 12, fontSize: 13, color: permissionState === "denied" ? "#ef4444" : "#666" }}>
                  Permission: {permissionState}
                </div>
              </div>
            </div>

            <div style={{ border: "2px dashed rgba(0,0,0,0.08)", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 12, background: "#fafafa" }}>
              <div style={{ flex: 1 }}>
                <strong>Drag a file here</strong>
                <div style={{ fontSize: 13, color: "#666" }}>Drop image or PDF to create a certificate entry</div>
              </div>
              <FiUpload size={20} />
            </div>

            {uploadedFile && (
              <div style={{ marginTop: 10 }}>
                <strong>Selected:</strong> {uploadedFile.name}
                {uploadPreview && <div style={{ marginTop: 8 }}><img src={uploadPreview} alt="preview" style={{ maxWidth: 200 }} /></div>}
              </div>
            )}
            {scannedImage && (
              <div style={{ marginTop: 10 }}>
                <strong>Captured Image:</strong>
                <div style={{ marginTop: 8 }}><img src={scannedImage} alt="captured" style={{ maxWidth: 240 }} /></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ margin: "16px 0" }} className="card">
          <h4>Add Certificate (manual)</h4>
          <form onSubmit={submitForm} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input name="id" placeholder="Certificate ID" value={form.id} onChange={handleFormChange} />
            <input name="recipient" placeholder="Recipient name" value={form.recipient} onChange={handleFormChange} />
            <input type="date" name="date" value={form.date} onChange={handleFormChange} />
            <select name="status" value={form.status} onChange={handleFormChange}>
              <option value="issued">Issued</option>
              <option value="pending">Pending</option>
              <option value="fraud">Fraud</option>
            </select>
            <input name="summary" placeholder="Summary" value={form.summary} onChange={handleFormChange} style={{ gridColumn: "1 / -1" }} />
            <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
              <button type="submit" className="primary">Add Certificate</button>
            </div>
          </form>
        </div>

        <div className="grid">
          <div className="card">
            <h3>Issuance Trends</h3>
            <div style={{ height: 260 }} className="chart-md">
              <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>

          <div className="card">
            <h3>Recent Activity</h3>
            <div style={{ maxHeight: 260, overflow: "auto" }}>
              {certificates.slice(0, 10).map((c) => (
                <div key={c.id + (c.date || "")} style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 13, color: "#333" }}>{c.summary || c.recipient || c.id}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {c.date || "—"} — <strong style={{ color: c.status === "issued" ? "#1e8e3e" : c.status === "pending" ? "#3b82f6" : "#ef4444" }}>{c.status}</strong>
                  </div>
                </div>
              ))}
              {certificates.length === 0 && <div style={{ color: "#666", padding: 12 }}>No certificates yet — add one above.</div>}
            </div>
          </div>
        </div>
      </main>

      {cameraOpen && (
        <div className="camera-modal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div style={{ width: "92%", maxWidth: 720, background: "#fff", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>Scan QR / Capture</h4>
              <div>
                <button onClick={capturePhoto} className="primary" style={{ marginRight: 8 }}>Capture</button>
                <button onClick={stopCamera} className="secondary">Close</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <video ref={videoRef} style={{ width: "100%", borderRadius: 6, background: "#000" }} playsInline />
              </div>
              <div style={{ width: 240 }}>
                <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 6, background: "#f6f6f6" }} />
                <div style={{ marginTop: 8 }}><small>Captured preview will appear here after you press Capture.</small></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPermissionHelp && (
        <div className="permission-modal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300 }}>
          <div style={{ width: "92%", maxWidth: 640, background: "#fff", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Camera Permission Needed</h3>
            <p>We couldn't access your camera. This usually happens if you denied the permission.</p>
            <p style={{ fontSize: 13, color: "#666" }}><strong>Error:</strong> {permissionErrorName || "Permission denied"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button className="primary" onClick={openBrowserSettings}>Open browser settings</button>
              <button className="secondary" onClick={async () => { setShowPermissionHelp(false); await requestPermissionAndEnumerate(); }}>Try again</button>
              <button onClick={() => setShowPermissionHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
