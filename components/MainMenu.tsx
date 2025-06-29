// components/MainMenu.tsx
'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { useUserTheme } from "@/lib/useTheme"

const menuItems = [
  // 🔹 พื้นฐาน
  { label: "แดชบอร์ด", path: "/dashboard", icon: "🏠", guestAllowed: true },
  { label: "ทำข้อสอบ", path: "/quiz/select", icon: "📝", guestAllowed: true },
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
  { label: "วิเคราะห์ความเข้าใจ", path: "/analysis", icon: "📊", guestAllowed: false },
  { label: "สถิติข้อสอบ V2", path: "/quiz/v2/analysis", icon: "📈", guestAllowed: true },
  
  // 🔹 ออกจากระบบ
  { label: "ออกจากระบบ", path: "/login", icon: "🚪", guestAllowed: true },
]

export default function MainMenu() {
  const currentPath = usePathname()
  const [isGuest, setIsGuest] = useState(false)
  const theme = useUserTheme()

  useEffect(() => {
    // ตรวจสอบ guest mode และ authentication status
    const checkGuestStatus = () => {
      // ถ้ามี authenticated user ลบ guest session
      if (auth.currentUser) {
        localStorage.removeItem('quizcat-guest-id')
        localStorage.removeItem('quizcat-guest-mode')
        setIsGuest(false)
      } else {
        const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
        setIsGuest(isGuestMode)
      }
    }

    checkGuestStatus()
    
    // ฟัง auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkGuestStatus()
    })

    return () => unsubscribe()
  }, [])

  const visibleMenuItems = menuItems.filter(item => 
    isGuest ? item.guestAllowed : true
  )

  // ใช้ theme สำหรับสี - ปรับปรุงให้มีคอนทราสต์ดี
  const getContrastColor = (hexColor: string) => {
    // แปลงสี hex เป็น RGB
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    
    // คำนวณความสว่าง
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    
    // ถ้าสีเข้ม ใช้ข้อความสีขาว ถ้าสีสว่าง ใช้ข้อความสีดำ
    return brightness < 128 ? '#ffffff' : '#000000'
  }

  const menuBgColor = theme.bgColor
  const menuTextColor = theme.textColor
  const borderColor = theme.textColor + "30"
  const hoverBgColor = theme.textColor + "15" // 15% opacity
  const activeBgColor = theme.textColor
  const activeTextColor = theme.bgColor

  return (
    <nav 
      className="fixed top-4 left-4 rounded-xl shadow-lg border p-4 space-y-1 w-52 z-50"
      style={{ 
        backgroundColor: menuBgColor,
        borderColor: borderColor,
        color: menuTextColor 
      }}
    >
      {isGuest && (
        <div 
          className="border px-3 py-2 rounded-lg text-xs text-center mb-3"
          style={{
            backgroundColor: theme.textColor + '10',
            borderColor: theme.textColor + '40',
            color: theme.textColor
          }}
        >
          🎭 โหมดผู้เยี่ยมชม
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
              ? activeBgColor 
              : 'transparent',
            color: currentPath === item.path 
              ? activeTextColor 
              : menuTextColor,
          }}
          onMouseEnter={(e) => {
            if (currentPath !== item.path) {
              e.currentTarget.style.backgroundColor = hoverBgColor
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
