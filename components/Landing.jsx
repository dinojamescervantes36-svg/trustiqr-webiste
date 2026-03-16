"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Landing() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <a className="logo">
          <img src="/img/logo.png" alt="TrustiQR Logo" />
          TrustiQR
        </a>
        <div className="nav-right">
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <ul className={`nav-menu ${menuOpen ? "active" : ""}`}>
            <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
            <li><a href="#about" onClick={() => setMenuOpen(false)}>About</a></li>
            <li><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a></li>
            <li><button className="btn" onClick={() => router.push("/login")}>Log in</button></li>
          </ul>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-text">
          <h1>Simple & Secure Certificate Verification with QR Codes</h1>
          <p>Easily verify academic and training certificates by scanning secure QR codes.</p>
          <div className="hero-buttons">
            <a href="#features" className="btn-primary">Get Started</a>
            <a href="#contact" className="btn-secondary">Request a Demo</a>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <h2 className="features-title">Trusted Digital Verification</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <img src="/img/logo.png" alt="Prevent Fraud" />
            <h3>Prevent Certificate Fraud</h3>
            <p>Ensure your certificates are authentic and secure.</p>
          </div>
          <div className="feature-card">
            <img src="/img1/Instantly Verify QR Codes.png" alt="QR Verification" />
            <h3>Instantly Verify QR Codes</h3>
            <p>Scan and verify QR codes instantly.</p>
          </div>
          <div className="feature-card">
            <img src="/img1/Build Trust & Credibility.png" alt="Build Trust" />
            <h3>Build Trust & Credibility</h3>
            <p>Enhance your institution's credibility.</p>
          </div>
        </div>
      </section>

      <section id="about" style={{ padding: "60px 80px", background: "#fff" }}>
        <h2>About TrustiQR</h2>
        <p>TrustiQR provides secure and reliable digital certificate verification using QR code technology.</p>
      </section>

      <section id="contact" style={{ padding: "60px 80px", background: "#f9fafb" }}>
        <h2>Contact Us</h2>
        <p>Email: support@trustiQR.com</p>
      </section>
    </>
  );
}
