'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { useUserTheme, saveGuestTheme } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'

export default function SettingsPage() {
  const currentTheme = useUserTheme()
  const [isGuest, setIsGuest] = useState(false)

  const [bgColor, setBgColor] = useState<string>(currentTheme.bgColor)
  const [textColor, setTextColor] = useState<string>('#000000') // เริ่มต้นเป็นสีดำเสมอ

  // Preset themes
  const presetThemes = [
    { name: "เริ่มต้น", bg: "#ffffff", text: "#000000" },
    { name: "โหมดมืด", bg: "#1f2937", text: "#f9fafb" },
    { name: "น้ำเงิน", bg: "#3b82f6", text: "#ffffff" },
    { name: "เขียว", bg: "#10b981", text: "#ffffff" },
    { name: "ม่วง", bg: "#8b5cf6", text: "#ffffff" },
    { name: "ชมพู", bg: "#ec4899", text: "#ffffff" },
    { name: "ส้ม", bg: "#f97316", text: "#ffffff" },
    { name: "แดง", bg: "#ef4444", text: "#ffffff" },
  ]

  useEffect(() => {
    // ตรวจสอบ guest mode
    const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
    setIsGuest(isGuestMode)
    
    setBgColor(currentTheme.bgColor)
    setTextColor(currentTheme.textColor)
  }, [currentTheme])

  // อัปเดต CSS variables เมื่อมีการเปลี่ยนสีในหน้า settings (เพื่อให้เห็นตัวอย่าง)
  useEffect(() => {
    document.documentElement.style.setProperty('--preview-bg', bgColor)
    document.documentElement.style.setProperty('--preview-text', textColor)
  }, [bgColor, textColor])

  const handleSave = async () => {
    // อัปเดต CSS variables ทันทีก่อนบันทึก
    document.documentElement.style.setProperty('--background', bgColor)
    document.documentElement.style.setProperty('--foreground', textColor)

    if (isGuest) {
      // สำหรับ guest mode บันทึกใน localStorage
      saveGuestTheme({ bgColor, textColor })

      alert('🎭 บันทึกธีมสำหรับผู้เยี่ยมชมเรียบร้อย! รีโหลดเพื่ออัปเดตธีม')
      location.reload()
      return
    }

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

  // --- ส่วนที่แก้ไข ---
  const handleReset = async () => {
    const defaultBg = '#ffffff' // ค่าเริ่มต้นสำหรับ guest
    const defaultText = '#000000' // ค่าเริ่มต้นสำหรับ guest

    if (isGuest) {
      // สำหรับ guest mode
      setBgColor(defaultBg)
      setTextColor(defaultText)
      saveGuestTheme({ bgColor: defaultBg, textColor: defaultText })
      
      document.documentElement.style.setProperty('--background', defaultBg)
      document.documentElement.style.setProperty('--foreground', defaultText)

      alert('🎭 รีเซ็ตธีมผู้เยี่ยมชมเป็นค่าเริ่มต้นเรียบร้อย!')
      location.reload()
      return
    }

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
        <h2 
          className="text-3xl font-bold text-center mb-4"
          style={{ color: currentTheme.textColor }}
        >
          🎨 ตั้งค่าธีม
        </h2>

        {isGuest && (
          <div 
            className="border px-4 py-3 rounded-lg text-center"
            style={{
              backgroundColor: currentTheme.textColor + '10', // ใช้สีจาก theme
              borderColor: currentTheme.textColor + '40',
              color: currentTheme.textColor
            }}
          >
            🎭 โหมดผู้เยี่ยมชม - ธีมจะบันทึกในเครื่องของคุณเท่านั้น
          </div>
        )}

        <div 
          className="rounded-xl shadow p-6 space-y-6"
          style={{
            backgroundColor: currentTheme.bgColor,
            color: currentTheme.textColor
          }}
        >
          {/* Preset Themes */}
          <div>
            <h3 className="font-medium mb-3">🎨 ธีมสำเร็จรูป</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {presetThemes.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setBgColor(preset.bg)
                    setTextColor(preset.text)
                  }}
                  className="flex flex-col items-center p-3 rounded-lg border-2 hover:border-blue-400 transition-colors"
                  style={{
                    borderColor: bgColor === preset.bg && textColor === preset.text ? '#3b82f6' : currentTheme.textColor + '40',
                    backgroundColor: currentTheme.bgColor === preset.bg && currentTheme.textColor === preset.text ? currentTheme.textColor + '10' : 'transparent'
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full mb-2"
                    style={{ 
                      backgroundColor: preset.bg, 
                      border: `2px solid ${currentTheme.textColor}40`
                    }}
                  />
                  <span 
                    className="text-xs font-medium"
                    style={{ color: currentTheme.textColor }}
                  >
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div 
            className="border-t pt-4"
            style={{ borderColor: currentTheme.textColor + '30' }}
          >
            <h3 
              className="font-medium mb-3"
              style={{ color: currentTheme.textColor }}
            >
              🎯 ปรับแต่งเอง
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="bgColor" 
                  className="font-medium"
                  style={{ color: currentTheme.textColor }}
                >
                  สีพื้นหลัง
                </label>
                <input
                  id="bgColor"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-16 rounded"
                  style={{ 
                    border: `1px solid ${currentTheme.textColor}40`,
                    backgroundColor: currentTheme.bgColor
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <label 
                  htmlFor="textColor" 
                  className="font-medium"
                  style={{ color: currentTheme.textColor }}
                >
                  สีตัวหนังสือ
                </label>
                <input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-16 rounded"
                  style={{ 
                    border: `1px solid ${currentTheme.textColor}40`,
                    backgroundColor: currentTheme.bgColor
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span 
              className="font-medium"
              style={{ color: currentTheme.textColor }}
            >
              ตัวอย่างธีม
            </span>
            <div
              className="rounded px-4 py-2 shadow"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${currentTheme.textColor}30`
              }}
            >
              ตัวอย่างข้อความ
            </div>
          </div>

          {/* ตัวอย่าง MainMenu */}
          <div 
            className="rounded-lg p-4"
            style={{
              border: `1px solid ${currentTheme.textColor}30`,
              backgroundColor: currentTheme.textColor + '05'
            }}
          >
            <p 
              className="text-sm font-medium mb-3"
              style={{ color: currentTheme.textColor }}
            >
              ตัวอย่าง MainMenu:
            </p>
            <div 
              className="rounded-lg shadow-md p-3 w-48 space-y-2"
              style={{ 
                backgroundColor: bgColor,
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: textColor + "40"
              }}
            >
              <div 
                className="px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: textColor,
                  color: bgColor
                }}
              >
                🏠 แดชบอร์ด (เลือก)
              </div>
              <div 
                className="px-3 py-2 rounded text-sm"
                style={{
                  color: textColor
                }}
              >
                📝 ทำข้อสอบ
              </div>
              <div 
                className="px-3 py-2 rounded text-sm"
                style={{
                  color: textColor
                }}
              >
                🚪 ออกจากระบบ
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="mt-4 text-lg px-6 py-3 rounded w-full transition hover:opacity-80"
            style={{
              backgroundColor: currentTheme.bgColor === '#ffffff' ? '#10b981' : '#065f46', // เขียวเข้มในธีมมืด
              color: '#ffffff'
            }}
          >
            ✅ บันทึกธีม
          </button>

          <button
            onClick={handleReset}
            className="text-sm px-4 py-2 rounded w-full transition hover:opacity-80"
            style={{
              backgroundColor: currentTheme.textColor + '20',
              color: currentTheme.textColor,
              border: `1px solid ${currentTheme.textColor}40`
            }}
          >
            ♻️ รีเซ็ตกลับค่าเริ่มต้น
          </button>
        </div>
      </main>
    </ThemedLayout>
  )
}