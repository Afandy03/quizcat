'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function NavigationProgress() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      // Simulate progress
      setProgress(10)
      const timer1 = setTimeout(() => setProgress(30), 100)
      const timer2 = setTimeout(() => setProgress(60), 300)
      const timer3 = setTimeout(() => setProgress(80), 600)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    } else {
      setProgress(100)
      const timer = setTimeout(() => setProgress(0), 200)
      return () => clearTimeout(timer)
    }
  }, [loading])

  useEffect(() => {
    // When pathname changes, complete loading
    setLoading(false)
  }, [pathname])

  useEffect(() => {
    // Override router methods
    const originalPush = router.push
    const originalReplace = router.replace

    router.push = (href, options) => {
      setLoading(true)
      return originalPush(href, options)
    }

    router.replace = (href, options) => {
      setLoading(true)
      return originalReplace(href, options)
    }

    // Handle back/forward buttons
    const handlePopState = () => setLoading(true)
    window.addEventListener('popstate', handlePopState)

    return () => {
      router.push = originalPush
      router.replace = originalReplace
      window.removeEventListener('popstate', handlePopState)
    }
  }, [router])

  if (progress === 0) return null

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-gray-200">
      <div 
        className="h-full bg-blue-600 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)'
        }}
      />
    </div>
  )
}
