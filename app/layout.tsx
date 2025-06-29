// app/layout.tsx
'use client'

import './globals.css'
import { useUserTheme } from '@/lib/useTheme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useUserTheme()

  return (
    <html lang="th">
      <head>
        {/* ✅ Preload theme เพื่อป้องกัน flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // โหลด theme จาก localStorage ก่อน render
                const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true';
                let theme = { bgColor: '#ffffff', textColor: '#000000' };
                
                if (isGuestMode) {
                  const savedTheme = localStorage.getItem('quizcat-guest-theme');
                  if (savedTheme) {
                    try {
                      theme = JSON.parse(savedTheme);
                    } catch (e) {}
                  }
                } else {
                  const cachedTheme = localStorage.getItem('quizcat-user-theme-cache');
                  if (cachedTheme) {
                    try {
                      theme = JSON.parse(cachedTheme);
                    } catch (e) {}
                  }
                }
                
                // ตั้งค่า CSS variables ทันที
                document.documentElement.style.setProperty('--background', theme.bgColor);
                document.documentElement.style.setProperty('--foreground', theme.textColor);
                document.body.style.backgroundColor = theme.bgColor;
                document.body.style.color = theme.textColor;
              })();
            `
          }}
        />
      </head>
      <body
        style={{
          backgroundColor: theme.bgColor,
          color: theme.textColor,
          minHeight: '100vh',
          margin: 0,
          // ✅ ปรับปรุง transition ให้นุ่มนวลขึ้น
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
      >
        {children}
      </body>
    </html>
  )
}
