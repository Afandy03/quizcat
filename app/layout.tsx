"use client"
import "./globals.css"
import { useUserTheme } from "../lib/useTheme"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useUserTheme()

  return (
    <html lang="th">
      <body
        style={{
          backgroundColor: theme.bgColor || "#000000",
          color: theme.textColor || "#ffffff",
          minHeight: "100vh",
          margin: 0,
          transition: "all 0.2s ease"
        }}
      >
        {children}
      </body>
    </html>
  )
}
