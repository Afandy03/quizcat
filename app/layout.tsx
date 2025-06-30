// app/layout.tsx
import './globals.css'
import ThemeWrapper from '../components/ThemeWrapper'
import NavigationProgress from '../components/NavigationProgress'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Theme preloader เพื่อป้องกันการกระพริบ
              (function() {
                try {
                  const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true';
                  let theme = { bgColor: '#ffffff', textColor: '#000000' };
                  
                  if (isGuestMode) {
                    const savedTheme = localStorage.getItem('quizcat-guest-theme');
                    if (savedTheme) {
                      theme = JSON.parse(savedTheme);
                    }
                  } else {
                    const cachedTheme = localStorage.getItem('quizcat-user-theme-cache');
                    if (cachedTheme) {
                      theme = JSON.parse(cachedTheme);
                    }
                  }
                  
                  document.documentElement.style.setProperty('--background', theme.bgColor);
                  document.documentElement.style.setProperty('--foreground', theme.textColor);
                  
                  if (theme.bgColor.includes('gradient')) {
                    document.body.style.background = theme.bgColor;
                  } else {
                    document.body.style.backgroundColor = theme.bgColor;
                  }
                  document.body.style.color = theme.textColor;
                  
                  // เพิ่ม transition
                  document.body.style.transition = 'all 0.2s ease';
                  document.body.style.minHeight = '100vh';
                  document.body.style.margin = '0';
                  
                } catch (e) {
                  document.documentElement.style.setProperty('--background', '#ffffff');
                  document.documentElement.style.setProperty('--foreground', '#000000');
                  document.body.style.backgroundColor = '#ffffff';
                  document.body.style.color = '#000000';
                }
              })();
            `
          }}
        />
      </head>
      <body>
        <NavigationProgress />
        <ThemeWrapper>
          {children}
        </ThemeWrapper>
      </body>
    </html>
  )
}
