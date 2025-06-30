// components/MainMenu.tsx
'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useMemo, useCallback } from "react"
import { auth } from "@/lib/firebase"
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme"
import { isCurrentUserTest } from "@/lib/testUser"

const menuItems = [
  // 🔹 พื้นฐาน
  { label: "แดชบอร์ด", path: "/dashboard", icon: "🏠", guestAllowed: true },
  { label: "ทำข้อสอบ V2", path: "/quiz/v2/select", icon: "🚀", guestAllowed: true },

  // 🔹 ของรางวัล
  { label: "แลกของรางวัล", path: "/rewards", icon: "🎁", guestAllowed: false },
  { label: "เพิ่มรางวัล", path: "/rewards/add", icon: "➕", guestAllowed: false },

  // 🔹 ข้อสอบ
  { label: "เพิ่มข้อสอบ", path: "/add-question", icon: "➕", guestAllowed: false },
  { label: "จัดการข้อสอบ", path: "/quiz/manage", icon: "🗂️", guestAllowed: false },

  // 🔹 ผู้ใช้
  { label: "โปรไฟล์", path: "/profile", icon: "🙋", guestAllowed: false },
  { label: "ตั้งค่า", path: "/settings", icon: "⚙️", guestAllowed: true }, // Guest สามารถเปลี่ยนธีมได้

  // 🔹 แอดมิน
  { label: "แอดมิน", path: "/admin/users", icon: "🛠️", guestAllowed: false }, // เปลี่ยนไอคอนให้ดูแยกออก
  { label: "สถิติข้อสอบ V2", path: "/quiz/v2/analysis", icon: "📈", guestAllowed: true },
  
  // 🔹 ออกจากระบบ
  { label: "ออกจากระบบ", path: "/login", icon: "🚪", guestAllowed: true },
]

export default function MainMenu() {
  const currentPath = usePathname()
  const [isGuest, setIsGuest] = useState(false)
  const [isTestUser, setIsTestUser] = useState(false)
  const [authStateInitialized, setAuthStateInitialized] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, isLoading } = useUserTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Memoize การตรวจสอบ guest status เพื่อลดการ re-render
  const checkGuestStatus = useCallback(() => {
    // ถ้ามี authenticated user ลบ guest session
    if (auth.currentUser) {
      localStorage.removeItem('quizcat-guest-id')
      localStorage.removeItem('quizcat-guest-mode')
      setIsGuest(false)
      setIsTestUser(isCurrentUserTest())
    } else {
      const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
      setIsGuest(isGuestMode)
      setIsTestUser(false)
    }
    setAuthStateInitialized(true)
  }, [])

  useEffect(() => {
    // เรียกแค่ครั้งเดียวเมื่อ component mount
    if (!authStateInitialized) {
      checkGuestStatus()
    }
    
    // ฟัง auth state changes แต่ใช้ debounce เพื่อป้องกันการเรียกบ่อยเกินไป
    let timeoutId: NodeJS.Timeout
    const unsubscribe = auth.onAuthStateChanged(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkGuestStatus, 100) // debounce 100ms
    })

    return () => {
      unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [checkGuestStatus, authStateInitialized])

  // Memoize visible menu items เพื่อป้องกันการคำนวณใหม่ทุกครั้ง
  const visibleMenuItems = useMemo(() => 
    menuItems.filter(item => isGuest ? item.guestAllowed : true),
    [isGuest]
  )

  // Memoize สีต่างๆ เพื่อป้องกันการคำนวณใหม่ทุกครั้ง
  const menuColors = useMemo(() => {
    // ถ้าเป็น gradient ใช้สีขาวโปร่งใสเป็น background
    const isGradient = theme.bgColor.includes('gradient')
    
    // สำหรับธีม gradient ต่างๆ
    if (isGradient) {
      // ธีมซากุระ
      const isSakura = theme.bgColor.includes('fce7f3') || theme.textColor === '#8b4513'
      // ธีมวินเทจ
      const isVintage = theme.bgColor.includes('f9f7ff') || theme.textColor === '#5d4e37'
      
      if (isSakura) {
        return {
          menuBgColor: 'rgba(252, 231, 243, 0.9)', // สีชมพูอ่อนโปร่งใส
          menuTextColor: '#8b4513', // สีน้ำตาลเข้ม
          borderColor: 'rgba(139, 69, 19, 0.3)',
          hoverBgColor: 'rgba(252, 231, 243, 0.7)',
          activeBgColor: 'rgba(139, 69, 19, 0.8)',
          activeTextColor: '#ffffff'
        }
      } else if (isVintage) {
        return {
          menuBgColor: 'rgba(249, 247, 255, 0.9)', // สีม่วงอ่อนโปร่งใส
          menuTextColor: '#5d4e37', // สีน้ำตาลอ่อน
          borderColor: 'rgba(93, 78, 55, 0.3)',
          hoverBgColor: 'rgba(249, 247, 255, 0.7)',
          activeBgColor: 'rgba(93, 78, 55, 0.8)',
          activeTextColor: '#ffffff'
        }
      } else {
        // gradient อื่นๆ
        return {
          menuBgColor: 'rgba(255, 255, 255, 0.9)',
          menuTextColor: '#333333',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          hoverBgColor: 'rgba(255, 255, 255, 0.2)',
          activeBgColor: 'rgba(255, 255, 255, 0.8)',
          activeTextColor: '#333333'
        }
      }
    } else {
      // สีธรรมดา
      return {
        menuBgColor: theme.bgColor,
        menuTextColor: theme.textColor,
        borderColor: theme.textColor + "30",
        hoverBgColor: theme.textColor + "15",
        activeBgColor: theme.textColor,
        activeTextColor: theme.bgColor
      }
    }
  }, [theme.bgColor, theme.textColor])

  // ใช้ theme สำหรับสี - ปรับปรุงให้มีคอนทราสต์ดี
  const getContrastColor = useCallback((hexColor: string) => {
    // แปลงสี hex เป็น RGB
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    
    // คำนวณความสว่าง
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    
    // ถ้าสีเข้ม ใช้ข้อความสีขาว ถ้าสีสว่าง ใช้ข้อความสีดำ
    return brightness < 128 ? '#ffffff' : '#000000'
  }, [])

  // แสดง loading หรือป้องกันการ render ก่อนที่ auth state จะพร้อม
  // Default styles for hydration
  const defaultNavStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#00000030",
    color: "#000000"
  }

  if (!mounted || isLoading || !authStateInitialized) {
    return (
      <nav 
        className="fixed top-4 left-4 rounded-xl shadow-lg border p-4 space-y-1 w-52 z-50"
        style={defaultNavStyle}
        suppressHydrationWarning
      >
        <div className="text-center py-4">
          <div className="animate-pulse">⏳ โหลด...</div>
        </div>
      </nav>
    )
  }

  return (
    <nav 
      className="fixed top-4 left-4 rounded-xl shadow-lg border p-4 space-y-1 w-52 z-50"
      style={{ 
        backgroundColor: menuColors.menuBgColor,
        borderColor: menuColors.borderColor,
        color: menuColors.menuTextColor,
        backdropFilter: theme.bgColor.includes('gradient') ? 'blur(10px)' : 'none'
      }}
      suppressHydrationWarning
    >
      {isGuest && (
        <div 
          className="border px-3 py-2 rounded-lg text-xs text-center mb-3"
          style={{
            backgroundColor: theme.textColor + '10',
            borderColor: theme.textColor + '40',
            color: theme.textColor
          }}
          suppressHydrationWarning
        >
          🎭 โหมดผู้เยี่ยมชม
        </div>
      )}
      {isTestUser && (
        <div 
          className="border px-3 py-2 rounded-lg text-xs text-center mb-3"
          style={{
            backgroundColor: '#8b5cf6' + '20',
            borderColor: '#8b5cf6',
            color: '#6d28d9'
          }}
          suppressHydrationWarning
        >
          🤖 Test User Mode
        </div>
      )}
      {visibleMenuItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`
            block px-4 py-2.5 rounded-lg transition-all duration-200 
            ${currentPath === item.path 
              ? "shadow-md transform scale-105" 
              : "hover:transform hover:scale-102"
            }
          `}
          style={{
            backgroundColor: currentPath === item.path 
              ? menuColors.activeBgColor 
              : 'transparent',
            color: currentPath === item.path 
              ? menuColors.activeTextColor 
              : menuColors.menuTextColor,
          }}
          suppressHydrationWarning
          onMouseEnter={(e) => {
            if (currentPath !== item.path) {
              e.currentTarget.style.backgroundColor = menuColors.hoverBgColor
            }
          }}
          onMouseLeave={(e) => {
            if (currentPath !== item.path) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          <span className="text-lg mr-2">{item.icon}</span>
          <span className="text-sm font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
