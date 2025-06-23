// settings/page.tsx

"use client"

import { useState, useEffect } from "react" // << 1. เพิ่ม useEffect เข้ามา
import { auth, db } from "../../lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useUserTheme } from "../../lib/useTheme" // << 2. import hook ที่เราสร้างไว้

export default function SettingsPage() {
  // 3. เรียกใช้ hook เพื่อดึงค่าธีมปัจจุบันมา
  const currentTheme = useUserTheme()

  // State ของหน้านี้จะยังมีอยู่ แต่เราจะอัปเดตค่ามันทีหลัง
  const [bgColor, setBgColor] = useState(currentTheme.bgColor)
  const [textColor, setTextColor] = useState(currentTheme.textColor)

  // 4. ใช้ useEffect เพื่อ "Sync" ค่าสีเมื่อค่าจาก hook เปลี่ยนไป
  useEffect(() => {
    // เมื่อ useUserTheme โหลดธีมปัจจุบันเสร็จแล้ว (currentTheme เปลี่ยน)
    // ให้เราอัปเดตค่าใน state ของหน้านี้ตามไปด้วย
    setBgColor(currentTheme.bgColor)
    setTextColor(currentTheme.textColor)
  }, [currentTheme]) // ให้ Effect นี้ทำงานทุกครั้งที่ currentTheme เปลี่ยน

  const handleSave = async () => {
    const user = auth.currentUser
    if (!user) return alert("ยังไม่ได้ login")

    const ref = doc(db, "users", user.uid)
    await updateDoc(ref, {
      theme: {
        bgColor,      // ใช้ค่าจาก state ที่อาจจะถูกผู้ใช้เปลี่ยนไปแล้ว
        textColor     // ใช้ค่าจาก state ที่อาจจะถูกผู้ใช้เปลี่ยนไปแล้ว
      }
    })

    alert("เปลี่ยนธีมเรียบร้อย! รีโหลดเพื่ออัปเดตธีมเลย")
    location.reload()
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold">🎨 ตั้งค่าธีมของคุณ</h2>

      <div className="space-y-2 flex items-center gap-4">
        <label>สีพื้นหลัง</label>
        {/* value ยังคงผูกกับ state ของหน้านี้เหมือนเดิม ซึ่งถูกต้องแล้ว */}
        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
      </div>

      <div className="space-y-2 flex items-center gap-4">
        <label>สีตัวหนังสือ</label>
        <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
      </div>

      <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">
        ✅ บันทึกธีม
      </button>
    </main>
  )
}