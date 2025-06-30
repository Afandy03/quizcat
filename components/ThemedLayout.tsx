"use client"
import { ReactNode, useEffect, useState } from "react"
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme"
import { usePathname, useRouter } from "next/navigation"
import MainMenu from "@/components/MainMenu"

interface ThemedLayoutProps {
  children: ReactNode
}

export default function ThemedLayout({ children }: ThemedLayoutProps) {
  const { theme, isLoading } = useUserTheme()
  const router = useRouter()
  const path = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ✅ path ที่ไม่ต้องโชว์ปุ่มกลับหน้า
  const hideBackButton = ["/", "/login", "/dashboard", "/quiz/select"]
  const showBack = !hideBackButton.some(prefix => path?.startsWith(prefix))

  // Default styles for server-side rendering and initial client render
  const defaultStyles = {
    backgroundColor: "#ffffff",
    color: "#000000",
    minHeight: "100vh",
    transition: "all .2s ease",
  }

  // Use default styles until component is mounted and theme is loaded
  const containerStyles = mounted && !isLoading 
    ? {
        ...getBackgroundStyle(theme.bgColor),
        color: theme.textColor,
        minHeight: "100vh",
        transition: "all .2s ease",
      }
    : defaultStyles

  // สำหรับปุ่มกลับหน้าหลัก - ปรับสีให้เข้ากับธีม
  const getButtonStyles = () => {
    if (!mounted || isLoading) return { backgroundColor: "#333", color: "#fff" }
    
    const isGradient = theme.bgColor.includes('gradient')
    const isSakura = theme.bgColor.includes('fce7f3') || theme.textColor === '#8b4513'
    const isVintage = theme.bgColor.includes('f9f7ff') || theme.textColor === '#5d4e37'
    
    if (isGradient && isSakura) {
      return {
        backgroundColor: '#8b4513',
        color: '#ffffff',
        border: '2px solid rgba(252, 231, 243, 0.5)'
      }
    } else if (isGradient && isVintage) {
      return {
        backgroundColor: '#5d4e37',
        color: '#ffffff',
        border: '2px solid rgba(249, 247, 255, 0.5)'
      }
    } else {
      return {
        backgroundColor: theme.textColor,
        color: theme.bgColor,
      }
    }
  }

  // แสดง loading หรือ theme พร้อมแล้ว
  if (!mounted || isLoading) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          color: "#000000", 
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        suppressHydrationWarning
      >
        <div style={{ fontSize: '1.2rem' }}>โหลดกะเทย...</div>
      </div>
    )
  }

  return (
    <div
      style={containerStyles}
      suppressHydrationWarning
    >
      {/* ✅ เมนูด้านซ้าย */}
      <MainMenu />

      {/* ✅ ปุ่มกลับหน้า dashboard */}
      {showBack && (
        <button
          onClick={() => router.push("/dashboard")}
          className="absolute top-4 right-4 px-4 py-2 rounded shadow hover:opacity-80 transition"
          style={getButtonStyles()}
          suppressHydrationWarning
        >
          🏠 กลับหน้าหลัก
        </button>
      )}

      {/* ✅ เว้นซ้ายไม่ให้ชนเมนู */}
      <main className="p-4 ml-52">{children}</main>
    </div>
  )
}
