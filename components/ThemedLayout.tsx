"use client"
import { ReactNode } from "react"
import { useUserTheme } from "@/lib/useTheme"
import { usePathname, useRouter } from "next/navigation"
import MainMenu from "@/components/MainMenu"

interface ThemedLayoutProps {
  children: ReactNode
}

export default function ThemedLayout({ children }: ThemedLayoutProps) {
  const theme = useUserTheme()
  const router = useRouter()
  const path = usePathname()

  // ✅ path ที่ไม่ต้องโชว์ปุ่มกลับหน้า
  const hideBackButton = ["/", "/login", "/dashboard", "/quiz/select"]
  const showBack = !hideBackButton.some(prefix => path?.startsWith(prefix))

  return (
    <div
      style={{
        backgroundColor: theme.bgColor,
        color: theme.textColor,
        minHeight: "100vh",
        transition: "all .2s ease",
      }}
    >
      {/* ✅ เมนูด้านซ้าย */}
      <MainMenu />

      {/* ✅ ปุ่มกลับหน้า dashboard */}
      {showBack && (
        <button
          onClick={() => router.push("/dashboard")}
          className="absolute top-4 right-4 px-4 py-2 rounded shadow hover:opacity-80 transition"
          style={{
            backgroundColor: theme.textColor,
            color: theme.bgColor,
          }}
        >
          🏠 กลับหน้าหลัก
        </button>
      )}

      {/* ✅ เว้นซ้ายไม่ให้ชนเมนู */}
      <main className="p-4 ml-52">{children}</main>
    </div>
  )
}
