// app/layout.tsx
'use client'

import './globals.css'
import { useUserTheme } from '@/lib/useTheme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useUserTheme()

  return (
    <html lang="th">
      <body
        style={{
          backgroundColor: theme.bgColor,
          color: theme.textColor,
          minHeight: '100vh',
          margin: 0,
          transition: 'all 0.2s ease',
        }}
      >
        {children}
      </body>
    </html>
  )
}
