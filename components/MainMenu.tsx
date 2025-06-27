// components/MainMenu.tsx
'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  // 🔹 พื้นฐาน
  { label: "แดชบอร์ด", path: "/dashboard", icon: "🏠" },
  { label: "ทำข้อสอบ", path: "/quiz/select", icon: "📝" },

  // 🔹 ของรางวัล
  { label: "แลกของรางวัล", path: "/rewards", icon: "🎁" },
  { label: "เพิ่มรางวัล", path: "/rewards/add", icon: "➕" },

  // 🔹 ข้อสอบ
  { label: "เพิ่มข้อสอบ", path: "/add-question", icon: "➕" },

  // 🔹 ผู้ใช้
  { label: "โปรไฟล์", path: "/profile", icon: "🙋" },
  { label: "ตั้งค่า", path: "/settings", icon: "⚙️" },

  // 🔹 แอดมิน
  { label: "แอดมิน", path: "/admin/users", icon: "🛠️" }, // เปลี่ยนไอคอนให้ดูแยกออก
  { label: "วิเคราะห์ความเข้าใจ", path: "/analysis", icon: "📊" },

  { label: "จัดการข้อสอบ", path: "/dashboard/questions", icon: "🗂️" },
  
]

export default function MainMenu() {
  const currentPath = usePathname()

  return (
    <nav className="fixed top-4 left-4 bg-white rounded-xl shadow p-4 space-y-2 w-48">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`block px-3 py-2 rounded hover:bg-gray-100 transition ${
            currentPath === item.path ? "bg-blue-100 font-semibold" : ""
          }`}
        >
          {item.icon} {item.label}
        </Link>
      ))}
    </nav>
  )
}
