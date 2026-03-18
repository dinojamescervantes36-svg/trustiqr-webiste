"use client";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ style }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={style}
    >
      {isDark ? "☀️" : "🌙"}
      <span style={{ fontSize: 12 }}>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
