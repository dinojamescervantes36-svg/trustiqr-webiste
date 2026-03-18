"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // On mount, read persisted preference
  useEffect(() => {
    const saved = localStorage.getItem("trustiqr-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setIsDark(dark);
    applyTheme(dark);
    setMounted(true);
  }, []);

  const applyTheme = (dark) => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("trustiqr-theme", next ? "dark" : "light");
  };

  const setTheme = (dark) => {
    setIsDark(dark);
    applyTheme(dark);
    localStorage.setItem("trustiqr-theme", dark ? "dark" : "light");
  };

  // Prevent flash — render nothing until mounted
  if (!mounted) return <div style={{ visibility: "hidden" }}>{children}</div>;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
