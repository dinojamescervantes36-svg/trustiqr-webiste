"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";

import {
  FiHome,
  FiFilePlus,
  FiCheckCircle,
  FiUsers,
  FiLayers,
  FiSettings,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiEye,
  FiRefreshCw,
  FiX,
  FiExternalLink,
  FiEdit2,
  FiCheck,
} from "react-icons/fi";

export const dynamic = "force-dynamic";

export default function VerifyCertificate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [viewCert, setViewCert] = useState(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const mapCert = (c) => ({
    id: c.cert_id,
    name: c.recipient_name,
    issued: c.completion_date || c.created_at?.slice(0, 10),
    status: c.status || "Issued",
    hash: c.unique_hash || c.cert_id,
    filename: c.custom_filename || c.original_filename || "",
  });

  const loadCertificates = useCallback(async () => {
    if (!currentUser) return;

    const { data } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (data) setCertificates(data.map(mapCert));
  }, [currentUser]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    const qr = searchParams?.get("qr");
    if (qr) {
      setVerifyInput(qr);
      runVerify(qr);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return certificates;

    return certificates.filter((c) =>
      [c.name, c.id, c.status, c.filename]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [search, certificates]);

  const getVerifyUrl = (cert) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${cert.hash}`
      : "";

  const runVerify = async (val) => {
    const v = (val || verifyInput).trim();
    if (!v) return;

    setVerifying(true);
    setVerifyResult(null);

    const { data } = await supabase
      .from("certificates")
      .select("*")
      .or(`unique_hash.eq.${v},cert_id.eq.${v}`)
      .single();

    setVerifyResult({
      found: !!data,
      cert: data,
    });

    setVerifying(false);
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img src="/img/logo.png" />
          <span>TrustiQR</span>
        </div>

        <ul>
          <li onClick={() => router.push("/dashboard")}>
            <FiHome /> Dashboard
          </li>
          <li onClick={() => router.push("/dashboard/create")}>
            <FiFilePlus /> Create
          </li>
          <li className="active">
            <FiCheckCircle /> Verify
          </li>
          <li onClick={() => router.push("/dashboard/templates")}>
            <FiLayers /> Templates
          </li>
          <li onClick={() => router.push("/dashboard/users")}>
            <FiUsers /> Users
          </li>
          <li onClick={() => router.push("/dashboard/settings")}>
            <FiSettings /> Settings
          </li>
        </ul>
      </aside>

      <main className="main">
        <h1>Verify Certificates</h1>

        <div className="card">
          <input
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            placeholder="Enter certificate ID or hash"
          />

          <button onClick={() => runVerify()} disabled={verifying}>
            {verifying ? "Checking..." : "Verify"}
          </button>

          {verifyResult && (
            <div>
              {verifyResult.found ? (
                <div>
                  ✅ Verified — {verifyResult.cert.recipient_name}
                </div>
              ) : (
                <div>❌ Certificate not found</div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Issued Certificates</h3>

          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filtered.map((cert) => (
            <div key={cert.id} className="cert-row">
              <div>
                <strong>{cert.name}</strong>
                <div>{cert.id}</div>
              </div>

              <button onClick={() => setViewCert(cert)}>
                <FiEye />
              </button>

              <a href={getVerifyUrl(cert)} target="_blank">
                <FiExternalLink />
              </a>
            </div>
          ))}
        </div>

        {viewCert && (
          <div className="modal" onClick={() => setViewCert(null)}>
            <div onClick={(e) => e.stopPropagation()}>
              <h2>{viewCert.name}</h2>

              <QRCode value={getVerifyUrl(viewCert)} size={120} />

              <p>{viewCert.id}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}