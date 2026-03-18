import "./globals.css";
import AuthProvider from "@/context/AuthContext";
import ThemeProvider from "@/context/ThemeContext";

export const metadata = {
  title: "TrustiQR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}