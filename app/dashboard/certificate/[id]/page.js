"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/supabase";
import QRCode from "react-qr-code";
import { FiArrowLeft } from "react-icons/fi";

export default function CertificateViewPage() {
  const router = useRouter();
  const params = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    supabase.from('certificates').select('*').eq('cert_id', params.id).single()
      .then(({ data }) => { if (data) setCert(data); setLoading(false); });
  }, [params?.id]);

  if (loading) return <div style={{ padding: 40 }}>Loading certificate...</div>;
  if (!cert) return <div style={{ padding: 40 }}>Certificate not found.</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#666", marginBottom: 24, fontSize: 14 }}>
          <FiArrowLeft /> Back
        </button>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: "2px solid #e6f4ea" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #e6f4ea", paddingBottom: 24, marginBottom: 24 }}>
            <img src="/img/logo.png" alt="TrustiQR" style={{ height: 50, margin: "0 auto 12px" }} />
            <h1 style={{ margin: 0, fontSize: 28, color: "#1e8e3e", fontWeight: 700 }}>Certificate of Completion</h1>
          </div>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ color: "#666", margin: "0 0 8px", fontSize: 16 }}>This is to certify that</p>
            <h2 style={{ margin: "0 0 8px", fontSize: 32, color: "#111", fontWeight: 700 }}>{cert.recipient_name || "—"}</h2>
            <p style={{ color: "#666", margin: "0 0 16px", fontSize: 16 }}>has successfully completed</p>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#1e8e3e" }}>{cert.certificate_title || cert.program || "—"}</h3>
            {cert.completion_date && <p style={{ color: "#999", marginTop: 16, fontSize: 14 }}>Completed on: <strong>{cert.completion_date}</strong></p>}
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, flexWrap: "wrap", borderTop: "1px solid #e6f4ea", paddingTop: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "#fff", padding: 12, border: "1px solid #eee", borderRadius: 8, display: "inline-block" }}>
                <QRCode value={cert.unique_hash || cert.cert_id} size={120} />
              </div>
              <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>Scan to verify</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#999", margin: "0 0 4px" }}>Certificate ID</p>
              <p style={{ fontSize: 13, fontFamily: "monospace", color: "#555", wordBreak: "break-all", maxWidth: 200 }}>{cert.unique_hash || cert.cert_id}</p>
              <span style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "rgba(14,165,164,0.12)", color: "#0ea5a4" }}>{cert.status || "Issued"}</span>
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", color: "#999", fontSize: 12, marginTop: 16 }}>Verified by TrustiQR • {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
