"use client"

import { ThemeProvider } from '@/lib/ThemeContext'
import ClientThemeManager from '@/components/ClientThemeManager'
import AppLayout from '@/components/AppLayout'

interface ThemeWrapperProps {
  children: React.ReactNode
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  return (
    <ThemeProvider>
      <ClientThemeManager>
        <AppLayout>
          {children}
        </AppLayout>
      </ClientThemeManager>
    </ThemeProvider>
  )
}
