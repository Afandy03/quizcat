"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import MainMenu from "@/components/MainMenu"

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  
  // หน้าที่ไม่ต้องแสดง MainMenu
  const hideMenuPages = ['/login', '/']
  const shouldShowMenu = !hideMenuPages.includes(pathname)

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* MainMenu แสดงเฉพาะหน้าที่ต้องการ */}
      {shouldShowMenu && <MainMenu />}
      
      {/* เนื้อหาหลักที่จะมี transition */}
      {children}
    </div>
  )
}
