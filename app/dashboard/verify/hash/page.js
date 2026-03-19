// app/verify/[hash]/page.js
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
    if (!params?.hash) return;
    const hash = decodeURIComponent(params.hash);
    
    supabase
      .from("certificates")
      .select("*")
      .or(`unique_hash.eq.${hash},cert_id.eq.${hash}`)
      .single()
      .then(({ data, error }) => {
        if (data) setCert(data);
        else setNotFound(true);
        setLoading(false);
      });
  }, [params?.hash]);

  if (loading) return <div style={{ padding: 40 }}>Loading certificate...</div>;
  if (notFound) return <NotFoundPage />;

  return <CertificateDisplay cert={cert} />;
}

function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f7fa",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 720, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ color: "#dc2626" }}>Certificate Not Found</h2>
        <p>This certificate ID does not exist or may have been revoked.</p>
      </div>
    </div>
  );
}

function CertificateDisplay({ cert }) {
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${cert.unique_hash || cert.cert_id}`;
  
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f7fa",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        {/* Verified Banner */}
        <div style={{
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: 10,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <strong style={{ color: "#166534", fontSize: 15 }}>Certificate Verified</strong>
            <p style={{ margin: 0, color: "#15803d", fontSize: 13 }}>
              This certificate is authentic and was issued by TrustiQR.
            </p>
          </div>
        </div>

        {/* Certificate Card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          border: "2px solid #e6f4ea",
        }}>
          {/* Header */}
          <div style={{
            textAlign: "center",
            borderBottom: "2px solid #e6f4ea",
            paddingBottom: 24,
            marginBottom: 24,
          }}>
            <img src="/img/logo.png" alt="TrustiQR" style={{ height: 50, margin: "0 auto 12px" }} />
            <h1 style={{ margin: 0, fontSize: 28, color: "#1e8e3e", fontWeight: 700 }}>
              Certificate of Completion
            </h1>
          </div>

          {/* Certificate Details */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ color: "#666", margin: "0 0 8px", fontSize: 16 }}>
              This is to certify that
            </p>
            <h2 style={{ margin: "0 0 8px", fontSize: 32, color: "#111", fontWeight: 700 }}>
              {cert.recipient_name || "—"}
            </h2>
            <p style={{ color: "#666", margin: "0 0 16px", fontSize: 16 }}>
              has successfully completed
            </p>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#1e8e3e" }}>
              {cert.certificate_title || cert.program || "—"}
            </h3>
            {cert.completion_date && (
              <p style={{ color: "#999", marginTop: 16, fontSize: 14 }}>
                Completed on: <strong>{cert.completion_date}</strong>
              </p>
            )}
          </div>

          {/* QR & ID Footer */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 32,
            flexWrap: "wrap",
            borderTop: "1px solid #e6f4ea",
            paddingTop: 24,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                background: "#fff",
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 8,
                display: "inline-block",
              }}>
                <QRCode value={verifyUrl} size={120} />
              </div>
              <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>Scan to verify</p>
            </div>

            <div>
              <p style={{ fontSize: 12, color: "#999", margin: "0 0 4px" }}>Certificate ID</p>
              <p style={{
                fontSize: 13,
                fontFamily: "monospace",
                color: "#555",
                wordBreak: "break-all",
                maxWidth: 200,
              }}>
                {cert.unique_hash || cert.cert_id}
              </p>
              {(cert.custom_filename || cert.original_filename) && (
                <>
                  <p style={{ fontSize: 12, color: "#999", margin: "10px 0 4px" }}>File name</p>
                  <p style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "#555",
                    wordBreak: "break-all",
                    maxWidth: 200,
                  }}>
                    {cert.custom_filename || cert.original_filename}
                  </p>
                </>
              )}
              <span style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(14,165,164,0.12)",
                color: "#0ea5a4",
              }}>
                {cert.status || "Issued"}
              </span>
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#999", fontSize: 12, marginTop: 16 }}>
          Verified by TrustiQR • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
