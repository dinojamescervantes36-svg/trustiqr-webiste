"use client";

import { useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

export default function CreateClient() {
  const params = useSearchParams();
  const theme = useTheme();

  const isDark = theme?.isDark ?? false;

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Certificate</h1>
      <p>Theme: {isDark ? "Dark" : "Light"}</p>
      <p>Template ID: {params.get("templateId")}</p>
    </div>
  );
}