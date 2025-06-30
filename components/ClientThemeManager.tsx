"use client"

import { useEffect, useState } from 'react'

interface Theme {
  bgColor: string
  textColor: string
}

interface ClientThemeManagerProps {
  children: React.ReactNode
}

export default function ClientThemeManager({ children }: ClientThemeManagerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ป้องกัน hydration mismatch โดยไม่ render อะไรจนกว่าจะ mount
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>
  }

  return <>{children}</>
}
