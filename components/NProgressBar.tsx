'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.1,
  easing: 'ease',
  speed: 200,
  trickleSpeed: 200
})

export default function NProgressBar() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Custom CSS for better styling
    const style = document.createElement('style')
    style.innerHTML = `
      #nprogress .bar {
        background: linear-gradient(90deg, #3b82f6, #10b981, #f59e0b) !important;
        height: 3px !important;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5) !important;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.8), 0 0 5px rgba(59, 130, 246, 0.8) !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    // Override router methods
    const originalPush = router.push
    const originalReplace = router.replace

    router.push = async (href, options) => {
      handleStart()
      try {
        await originalPush(href, options)
      } finally {
        handleComplete()
      }
    }

    router.replace = async (href, options) => {
      handleStart()
      try {
        await originalReplace(href, options)
      } finally {
        handleComplete()
      }
    }

    return () => {
      router.push = originalPush
      router.replace = originalReplace
    }
  }, [router])

  return null
}
