"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/supabase";
import QRCode from "react-qr-code";

export default function PublicVerifyPage() {
  const params = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    supabase
      .from("certificates")
      .select("*")
      .or(`cert_id.eq.${params.id},unique_hash.eq.${params.id}`)
      .single()
      .then(({ data, error }) => {
        if (data) setCert(data);
        else setNotFound(true);
        setLoading(false);
      });
  }, [params?.id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>
        Verifying certificate...
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 12 }}>
        <div style={{ fontSize: 48 }}>❌</div>
        <h2 style={{ margin: 0, fontSize: 24 }}>Certificate Not Found</h2>
        <p style={{ color: "#999", margin: 0 }}>The certificate ID <strong style={{ color: "#fff" }}>{params?.id}</strong> does not exist in our records.</p>
      </div>
    );
  }

  const isRevoked = cert.status?.toLowerCase() === "revoked";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: `2px solid ${isRevoked ? "#fde8e8" : "#e6f4ea"}` }}>
          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: `2px solid ${isRevoked ? "#fde8e8" : "#e6f4ea"}`, paddingBottom: 24, marginBottom: 24 }}>
            <img src="/img/logo.png" alt="TrustiQR" style={{ height: 50, margin: "0 auto 12px" }} onError={(e) => { e.target.style.display = "none"; }} />
            <h1 style={{ margin: 0, fontSize: 28, color: isRevoked ? "#e53e3e" : "#1e8e3e", fontWeight: 700 }}>
              {isRevoked ? "Certificate Revoked" : "Certificate of Completion"}
            </h1>
            {isRevoked && (
              <p style={{ color: "#e53e3e", marginTop: 8, fontSize: 14 }}>This certificate has been revoked and is no longer valid.</p>
            )}
          </div>

          {/* Recipient */}
          {!isRevoked && (
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <p style={{ color: "#666", margin: "0 0 8px", fontSize: 16 }}>This is to certify that</p>
              <h2 style={{ margin: "0 0 8px", fontSize: 32, color: "#111", fontWeight: 700 }}>{cert.recipient_name || "—"}</h2>
              <p style={{ color: "#666", margin: "0 0 16px", fontSize: 16 }}>has successfully completed</p>
              <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#1e8e3e" }}>{cert.certificate_title || cert.program || "—"}</h3>
              {cert.completion_date && (
                <p style={{ color: "#999", marginTop: 16, fontSize: 14 }}>Completed on: <strong>{cert.completion_date}</strong></p>
              )}
            </div>
          )}

          {/* QR + ID */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, flexWrap: "wrap", borderTop: `1px solid ${isRevoked ? "#fde8e8" : "#e6f4ea"}`, paddingTop: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "#fff", padding: 12, border: "1px solid #eee", borderRadius: 8, display: "inline-block" }}>
                <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${cert.cert_id || cert.unique_hash}`} size={120} />
              </div>
              <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>Scan to verify</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#999", margin: "0 0 4px" }}>Certificate ID</p>
              <p style={{ fontSize: 13, fontFamily: "monospace", color: "#555", wordBreak: "break-all", maxWidth: 200 }}>{cert.unique_hash || cert.cert_id}</p>
              <span style={{
                display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: isRevoked ? "rgba(229,62,62,0.12)" : "rgba(30,142,62,0.12)",
                color: isRevoked ? "#e53e3e" : "#1e8e3e"
              }}>
                {isRevoked ? "Revoked" : (cert.status || "Valid")}
              </span>
            </div>
          </div>
        </div>

        {/* Verified badge */}
        <div style={{ textAlign: "center", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{isRevoked ? "⚠️" : "✅"}</span>
          <p style={{ color: "#999", fontSize: 12, margin: 0 }}>
            {isRevoked ? "This certificate is invalid" : "Authenticity verified"} by TrustiQR • {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
