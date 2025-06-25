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
      alert('เปลี่ยนธีมเรียบร้อย! รีโหลดเพื่ออัปเดตธีม')
      location.reload()
    } catch (error: any) {
      console.error('Error updating theme:', error)
      alert('บันทึกธีมไม่สำเร็จ: ' + error.message)
    }
  }

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
        </div>
      </main>
    </ThemedLayout>
  )
}
