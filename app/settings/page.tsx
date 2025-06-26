'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { useUserTheme } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'

export default function SettingsPage() {
  const currentTheme = useUserTheme()

  const [bgColor, setBgColor] = useState<string>(currentTheme.bgColor)
  const [textColor, setTextColor] = useState<string>(currentTheme.textColor)

  useEffect(() => {
    setBgColor(currentTheme.bgColor)
    setTextColor(currentTheme.textColor)
  }, [currentTheme])

  const handleSave = async () => {
    const user = auth.currentUser
    if (!user) {
      alert('ยังไม่ได้ login')
      return
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        theme: { bgColor, textColor }
      })

      // อัปเดตค่า CSS variables ด้วย
      document.documentElement.style.setProperty('--background', bgColor)
      document.documentElement.style.setProperty('--foreground', textColor)

      alert('เปลี่ยนธีมเรียบร้อย! รีโหลดเพื่ออัปเดตธีม')
      location.reload()
    } catch (error: any) {
      console.error('Error updating theme:', error)
      alert('บันทึกธีมไม่สำเร็จ: ' + error.message)
    }
  }

  // --- ส่วนที่แก้ไข ---
  const handleReset = async () => {
    const defaultBg = '#67e049' // ค่าเริ่มต้นจาก globals.css
    const defaultText = '#171717' // ค่าเริ่มต้นจาก globals.css

    const user = auth.currentUser
    if (!user) {
      alert('ยังไม่ได้ login')
      return
    }

    try {
      // 1. อัปเดตค่าใน Firestore ให้เป็นค่าเริ่มต้น
      await updateDoc(doc(db, 'users', user.uid), {
        theme: { bgColor: defaultBg, textColor: defaultText }
      })

      // 2. อัปเดต CSS variables ทันทีเพื่อให้เห็นผลก่อน reload
      document.documentElement.style.setProperty('--background', defaultBg)
      document.documentElement.style.setProperty('--foreground', defaultText)

      alert('รีเซ็ตธีมกลับเป็นค่าเริ่มต้นเรียบร้อย!')
      
      // 3. Reload หน้าเว็บเพื่อดึงค่าใหม่จาก Firestore มาใช้ทั้งหมด
      location.reload()

    } catch (error: any) {
      console.error('Error resetting theme:', error)
      alert('รีเซ็ตธีมไม่สำเร็จ: ' + error.message)
    }
  }
  // --- จบส่วนที่แก้ไข ---

  return (
    <ThemedLayout>
      <main className="p-6 max-w-lg mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-center mb-4">🎨 ตั้งค่าธีม</h2>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="bgColor" className="font-medium">สีพื้นหลัง</label>
            <input
              id="bgColor"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-10 w-16 border rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="textColor" className="font-medium">สีตัวหนังสือ</label>
            <input
              id="textColor"
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-10 w-16 border rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">ตัวอย่างธีม</span>
            <div
              className="rounded px-4 py-2 shadow"
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              ตัวอย่างข้อความ
            </div>
          </div>

          <button
            onClick={handleSave}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white text-lg px-6 py-3 rounded w-full transition"
          >
            ✅ บันทึกธีม
          </button>

          <button
            onClick={handleReset}
            className="bg-gray-300 hover:bg-gray-400 text-black text-sm px-4 py-2 rounded w-full transition"
          >
            ♻️ รีเซ็ตกลับค่าเริ่มต้น
          </button>
        </div>
      </main>
    </ThemedLayout>
  )
}