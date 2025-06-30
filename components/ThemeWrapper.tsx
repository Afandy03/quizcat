"use client"

import { ThemeProvider } from '@/lib/ThemeContext'
import ClientThemeManager from '@/components/ClientThemeManager'

interface ThemeWrapperProps {
  children: React.ReactNode
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  return (
    <ThemeProvider>
      <ClientThemeManager>
        {children}
      </ClientThemeManager>
    </ThemeProvider>
  )
}
