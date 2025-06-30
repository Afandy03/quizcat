'use client'

import { useUserTheme } from '@/lib/useTheme'

export default function QuizLoading() {
  const { theme } = useUserTheme()
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: theme.bgColor }}
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full animate-bounce"
            style={{ backgroundColor: '#3b82f6' }}
          />
          <div 
            className="w-3 h-3 rounded-full animate-bounce delay-75"
            style={{ backgroundColor: '#10b981' }}
          />
          <div 
            className="w-3 h-3 rounded-full animate-bounce delay-150"
            style={{ backgroundColor: '#f59e0b' }}
          />
        </div>
        <p style={{ color: theme.textColor }} className="text-lg">
          🚀 กำลังเตรียมข้อสอบ...
        </p>
        <p style={{ color: theme.textColor + '80' }} className="text-sm">
          โปรดรอสักครู่
        </p>
      </div>
    </div>
  )
}
