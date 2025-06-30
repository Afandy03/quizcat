'use client'

import { useUserTheme } from '@/lib/useTheme'

export default function Loading() {
  const { theme } = useUserTheme()
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: theme.bgColor }}
    >
      <div className="text-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          style={{ borderColor: theme.textColor }}
        />
        <p style={{ color: theme.textColor }}>
          ⏳ กำลังโหลด...
        </p>
      </div>
    </div>
  )
}
