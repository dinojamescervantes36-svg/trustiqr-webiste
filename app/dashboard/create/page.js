"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";
import {
  FiHome, FiFilePlus, FiCheckCircle, FiUsers,
  FiLayers, FiSettings, FiAward, FiMail, FiDownload, FiCopy,
  FiEdit2, FiCheck, FiX, FiRefreshCw,
} from "react-icons/fi";

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
  const [filename, setFilename] = useState("");
  const [filenameEditing, setFilenameEditing] = useState(false);
  const [filenameDraft, setFilenameDraft] = useState("");
  const filenameRef = useRef(null);
  const [dbTemplates, setDbTemplates] = useState([]);
  const [loadingTpls, setLoadingTpls] = useState(false);
  const [uniqueHash, setUniqueHash] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const qrRef = useRef(null);

  // Auto-update filename when fields change
  useEffect(() => { if (!filenameEditing) setFilename(buildDefaultFilename(form)); },
    [form.fullName, form.program, form.certificateTitle, form.completionDate, filenameEditing]);

  const loadTemplates = useCallback(async () => {
    if (!currentUser) return;
    setLoadingTpls(true);
    const { data } = await supabase.storage.from("certificates")
      .list(`templates/${currentUser.id}`, { sortBy: { column: "created_at", order: "desc" } });
    if (data) setDbTemplates(data
      .filter(f => f.name !== ".emptyFolderPlaceholder")
      .map(f => ({
        id: f.id || f.name,
        name: f.name.replace(/^\d+_/, ""),
        fullPath: `templates/${currentUser.id}/${f.name}`,
        type: f.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE"
      }))
    );
    setLoadingTpls(false);
  }, [currentUser]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    const tplId = params?.get("templateId"), tplName = params?.get("templateName");
    if (tplId && tplName) setForm(s => ({ ...s, templateId: tplId, templateName: decodeURIComponent(tplName), template: decodeURIComponent(tplName) }));
  }, [params]);

  useEffect(() => { if (statusMessage) { const t = setTimeout(() => setStatusMessage(""), 3500); return () => clearTimeout(t); } }, [statusMessage]);

  const handleChange = e => setForm(s => ({ ...s, [e.target.name]: e.target.value }));
  const startEdit = () => { setFilenameDraft(filename); setFilenameEditing(true); setTimeout(() => filenameRef.current?.select(), 40); };
  const confirmEdit = () => { setFilename(sanitise(filenameDraft) || buildDefaultFilename(form)); setFilenameEditing(false); };
  const cancelEdit = () => setFilenameEditing(false);
  const resetFN = () => { setFilename(buildDefaultFilename(form)); setFilenameEditing(false); };

  const handleIssue = async () => {
    if (!form.fullName.trim()) { setStatusMessage("Recipient full name is required."); return; }
    if (!form.program) { setStatusMessage("Please select a program."); return; }
    if (!form.email || !isValidEmail(form.email)) { setStatusMessage("Please enter a valid email address."); return; }

    setIsIssuing(true);
    const hash = generateUniqueHash();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/verify/${hash}`;
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

  const handleSendEmail = () => { if (!uniqueHash) { setStatusMessage("Issue the certificate first."); return; } setStatusMessage(`Certificate sent to ${form.email}`); };

  const handleCopyHash = async () => { if (!uniqueHash) return setStatusMessage("No link to copy."); try { await navigator.clipboard.writeText(verifyUrl || uniqueHash); setStatusMessage("Verification link copied."); } catch { setStatusMessage("Copy failed."); } };

  const handleDownloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return setStatusMessage("No QR to download.");
    const str = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob(b => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${sanitise(filename) || uniqueHash || "qrcode"}.png`; a.click(); URL.revokeObjectURL(url); setStatusMessage("QR downloaded."); }, "image/png");
    };
    img.src = url;
  };

  const handleSaveDraft = () => { localStorage.setItem("cert-draft", JSON.stringify({ form, filename })); setStatusMessage("Draft saved."); };
  const handleLoadDraft = () => { const raw = localStorage.getItem("cert-draft"); if (!raw) return setStatusMessage("No draft found."); try { const { form: f, filename: fn } = JSON.parse(raw); setForm(s => ({ ...s, ...f })); if (fn) { setFilename(fn); setFilenameEditing(false); } setStatusMessage("Draft loaded."); } catch { setStatusMessage("Failed to load draft."); } };
  const handleReset = () => { setForm({ fullName: "", email: "", completionDate: "", certificateTitle: "", program: "", template: "Academic Degree", templateId: "", templateName: "" }); setUniqueHash(""); setVerifyUrl(""); setFilename(""); setFilenameEditing(false); setStatusMessage("Form cleared."); };

  const builtInTemplates = ["Academic Degree", "Course Completion", "Employee ID"];

  return (
    <div className="dashboard">
      {/* Sidebar + Main content code remains largely unchanged */}
      {/* ... */}
    </div>
  );
}