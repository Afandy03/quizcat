// lib/ThemeContext.tsx
"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useUserTheme } from './useTheme'

interface Theme {
  bgColor: string
  textColor: string
}

interface ThemeContextType {
  theme: Theme
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeData = useUserTheme()
  
  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

// Hook เพื่อใช้แทน useUserTheme ใน components ที่ไม่ต้องการ re-render
export function useTheme() {
  return useThemeContext()
}
