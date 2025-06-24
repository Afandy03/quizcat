'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useUserTheme } from '../lib/useTheme'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useUserTheme()

  const hiddenPaths = ['/', '/home', '/login', '/dashboard']
  const showBackButton = !hiddenPaths.includes(pathname)

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
        <div className="relative min-h-screen">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="absolute top-4 right-4 px-4 py-2 rounded transition-opacity hover:opacity-80"
              style={{
                backgroundColor: theme.textColor,
                color: theme.bgColor,
              }}
            >
              ⬅️ ย้อนกลับ
            </button>
          )}

          <div className="p-4">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
