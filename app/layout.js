import "./globals.css";
import "./fanta.css";
import AuthProvider from "@/context/AuthContext";
import ThemeProvider from "@/context/ThemeContext";

export const metadata = {
  title: "TrustiQR",
  description: "Secure QR Certificate Verification",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <div id="app">{children}</div>
            <div id="portal"></div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}