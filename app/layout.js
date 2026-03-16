import "./globals.css"
import "./fanta.css"
import AuthProvider from "@/context/AuthContext"

export const metadata = {
  title: "TrustiQR",
  description: "Secure QR Certificate Verification",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div id="app">{children}</div>
          <div id="portal"></div>
        </AuthProvider>
      </body>
    </html>
  )
}
