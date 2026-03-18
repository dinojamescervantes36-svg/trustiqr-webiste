"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("trustiqr-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;

    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("trustiqr-theme", next ? "dark" : "light");
  };

  const setTheme = (dark) => {
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("trustiqr-theme", dark ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}