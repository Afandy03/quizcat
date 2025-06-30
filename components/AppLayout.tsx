"use client"

import { ReactNode, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import MainMenu from "@/components/MainMenu"

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // หน้าที่ไม่ต้องแสดง MainMenu
  const hideMenuPages = ['/login', '/']
  const shouldShowMenu = mounted && !hideMenuPages.includes(pathname)

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* MainMenu แสดงเฉพาะหน้าที่ต้องการและหลังจาก mounted แล้ว */}
      {shouldShowMenu && <MainMenu />}
      
      {/* เนื้อหาหลักที่จะมี transition */}
      {children}
    </div>
  )
}
