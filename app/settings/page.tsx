'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { useUserTheme, saveGuestTheme, getBackgroundStyle } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const { theme: currentTheme, isLoading } = useUserTheme()
  const [isGuest, setIsGuest] = useState(false)

  const [bgColor, setBgColor] = useState<string>(currentTheme.bgColor)
  const [textColor, setTextColor] = useState<string>('#000000') // เริ่มต้นเป็นสีดำเสมอ

  // Preset themes
  const presetThemes = [
    { name: "เริ่มต้น", bg: "#ffffff", text: "#000000", emoji: "⚪" },
    { name: "โหมดมืด", bg: "#1f2937", text: "#f9fafb", emoji: "🌙" },
    { name: "น้ำเงิน", bg: "#3b82f6", text: "#ffffff", emoji: "💙" },
    { name: "เขียว", bg: "#10b981", text: "#ffffff", emoji: "💚" },
    { name: "ม่วง", bg: "#8b5cf6", text: "#ffffff", emoji: "💜" },
    { name: "ชมพู", bg: "#ec4899", text: "#ffffff", emoji: "💗" },
    { name: "ส้ม", bg: "#f97316", text: "#ffffff", emoji: "🧡" },
    { name: "แดง", bg: "#ef4444", text: "#ffffff", emoji: "❤️" },
    { name: "🌸 ซากุระ", bg: "radial-gradient(circle at 20% 80%, #fce7f3 0%, #fef7f0 50%, transparent 70%), radial-gradient(circle at 80% 20%, #fef3c7 0%, #fef7f0 50%, transparent 70%)", text: "#8b4513", emoji: "🌸" },
    { name: "🍃 วินเทจ", bg: "linear-gradient(135deg, #f9f7ff 0%, #f0f4f8 30%, #fff8e1 70%, #f5f1e8 100%)", text: "#5d4e37", emoji: "📜" },
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
    if (bgColor.includes('gradient')) {
      document.documentElement.style.setProperty('--background', 'transparent')
      document.body.style.background = bgColor
    } else {
      document.documentElement.style.setProperty('--background', bgColor)
      document.body.style.background = ''
    }
    document.documentElement.style.setProperty('--foreground', textColor)

    if (isGuest) {
      // สำหรับ guest mode บันทึกใน localStorage
      saveGuestTheme({ bgColor, textColor })

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
      document.body.style.background = ''

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
      document.body.style.background = ''

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
      <div className="min-h-screen p-6">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h2 
            className="text-3xl font-bold text-center mb-8"
            style={{ color: currentTheme.textColor }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            🎨 ตั้งค่าธีม
          </motion.h2>

          <AnimatePresence>
            {isGuest && (
              <motion.div 
                className="border px-4 py-3 rounded-lg text-center mb-6"
                style={{
                  backgroundColor: currentTheme.textColor + '10',
                  borderColor: currentTheme.textColor + '40',
                  color: currentTheme.textColor
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                🎭 โหมดผู้เยี่ยมชม - ธีมจะบันทึกในเครื่องของคุณเท่านั้น
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {/* Preset Themes Section */}
              <div 
                className="rounded-xl shadow-lg p-6"
                style={{
                  ...getBackgroundStyle(currentTheme.bgColor),
                  color: currentTheme.textColor,
                  border: `1px solid ${currentTheme.textColor}20`
                }}
              >
                <motion.h3 
                  className="text-xl font-semibold mb-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  🎨 ธีมสำเร็จรูป
                </motion.h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {presetThemes.map((preset, index) => (
                    <motion.button
                      key={preset.name}
                      onClick={() => {
                        setBgColor(preset.bg)
                        setTextColor(preset.text)
                      }}
                      className="flex flex-col items-center p-3 rounded-lg border-2 hover:border-blue-400 transition-all duration-200 relative overflow-hidden"
                      style={{
                        borderColor: bgColor === preset.bg && textColor === preset.text ? '#3b82f6' : currentTheme.textColor + '40',
                        backgroundColor: bgColor === preset.bg && textColor === preset.text ? currentTheme.textColor + '10' : 'transparent'
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* พื้นหลังพิเศษสำหรับธีมซากุระ */}
                      {preset.name.includes('ซากุระ') && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle at 20% 80%, #fce7f3 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fef3c7 0%, transparent 50%)',
                            opacity: 0.3
                          }}
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      )}
                      
                      {/* พื้นหลังพิเศษสำหรับธีมวินเทจ */}
                      {preset.name.includes('วินเทจ') && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(45deg, #f9f7ff 0%, #f0f4f8 50%, #fff8e1 100%)',
                            opacity: 0.2
                          }}
                          animate={{
                            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                      )}

                      <motion.div 
                        className="w-8 h-8 rounded-full mb-2 flex items-center justify-center relative"
                        style={{ 
                          ...getBackgroundStyle(preset.bg),
                          border: `2px solid ${currentTheme.textColor}40`
                        }}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <span className="text-sm">{preset.emoji}</span>
                        
                        {/* ใส่เอฟเฟกต์พิเศษ */}
                        {preset.name.includes('ซากุระ') && (
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: 'conic-gradient(from 0deg, #fce7f3, #fdf2f8, #fce7f3)',
                              opacity: 0.4
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </motion.div>
                      
                      <span 
                        className="text-xs font-medium relative z-10 text-center"
                        style={{ color: currentTheme.textColor }}
                      >
                        {preset.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom Colors Section */}
              <div 
                className="rounded-xl shadow-lg p-6"
                style={{
                  ...getBackgroundStyle(currentTheme.bgColor),
                  color: currentTheme.textColor,
                  border: `1px solid ${currentTheme.textColor}20`
                }}
              >
                <h3 
                  className="text-xl font-semibold mb-4"
                  style={{ color: currentTheme.textColor }}
                >
                  🎯 ปรับแต่งเอง
                </h3>
                
                <div className="space-y-4">
                  <motion.div 
                    className="flex items-center justify-between"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <label 
                      htmlFor="bgColor" 
                      className="font-medium text-lg"
                      style={{ color: currentTheme.textColor }}
                    >
                      สีพื้นหลัง
                    </label>
                    <motion.input
                      id="bgColor"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-12 w-20 rounded-lg cursor-pointer"
                      style={{ 
                        border: `2px solid ${currentTheme.textColor}40`
                      }}
                      whileFocus={{ scale: 1.1 }}
                    />
                  </motion.div>

                  <motion.div 
                    className="flex items-center justify-between"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <label 
                      htmlFor="textColor" 
                      className="font-medium text-lg"
                      style={{ color: currentTheme.textColor }}
                    >
                      สีตัวหนังสือ
                    </label>
                    <motion.input
                      id="textColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-12 w-20 rounded-lg cursor-pointer"
                      style={{ 
                        border: `2px solid ${currentTheme.textColor}40`
                      }}
                      whileFocus={{ scale: 1.1 }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  onClick={handleSave}
                  className="w-full text-lg px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-lg"
                  style={{
                    backgroundColor: '#10b981'
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  ✅ บันทึกธีม
                </motion.button>

                <motion.button
                  onClick={handleReset}
                  className="w-full px-6 py-3 rounded-xl font-medium transition-all duration-200"
                  style={{
                    backgroundColor: currentTheme.textColor + '20',
                    color: currentTheme.textColor,
                    border: `1px solid ${currentTheme.textColor}40`
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  ♻️ รีเซ็ตกลับค่าเริ่มต้น
                </motion.button>
              </div>
            </motion.div>

            {/* Right Column */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              {/* Theme Preview */}
              <div 
                className="rounded-xl shadow-lg p-6"
                style={{
                  ...getBackgroundStyle(currentTheme.bgColor),
                  color: currentTheme.textColor,
                  border: `1px solid ${currentTheme.textColor}20`
                }}
              >
                <h3 
                  className="text-xl font-semibold mb-4"
                  style={{ color: currentTheme.textColor }}
                >
                  🔍 ตัวอย่างธีม
                </h3>
                
                <motion.div
                  className="p-6 rounded-lg text-center font-medium shadow-inner mb-4"
                  style={{
                    ...getBackgroundStyle(bgColor),
                    color: textColor,
                    border: `1px solid ${textColor}30`
                  }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  ตัวอย่างข้อความในธีมใหม่
                </motion.div>

                <div className="text-sm space-y-2">
                  <div className="flex justify-between p-2 rounded" style={{ backgroundColor: currentTheme.textColor + '10' }}>
                    <span style={{ color: currentTheme.textColor }}>พื้นหลัง:</span>
                    <span className="font-mono font-semibold" style={{ color: currentTheme.textColor }}>{bgColor}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded" style={{ backgroundColor: currentTheme.textColor + '10' }}>
                    <span style={{ color: currentTheme.textColor }}>ตัวหนังสือ:</span>
                    <span className="font-mono font-semibold" style={{ color: currentTheme.textColor }}>{textColor}</span>
                  </div>
                </div>
              </div>

              {/* MainMenu Preview */}
              <div 
                className="rounded-xl shadow-lg p-6"
                style={{
                  ...getBackgroundStyle(currentTheme.bgColor),
                  color: currentTheme.textColor,
                  border: `1px solid ${currentTheme.textColor}20`
                }}
              >
                <h3 
                  className="text-xl font-semibold mb-4"
                  style={{ color: currentTheme.textColor }}
                >
                  📱 ตัวอย่าง MainMenu
                </h3>
                
                <motion.div 
                  className="rounded-lg p-4 space-y-3 shadow-md max-w-sm"
                  style={{ 
                    ...getBackgroundStyle(bgColor),
                    border: `1px solid ${textColor}40`
                  }}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div 
                    className="px-4 py-3 rounded-lg font-medium"
                    style={{
                      backgroundColor: textColor,
                      color: bgColor.includes('gradient') ? '#ffffff' : bgColor
                    }}
                    whileHover={{ scale: 1.01 }}
                  >
                    🏠 แดชบอร์ด (เลือก)
                  </motion.div>
                  
                  <motion.div 
                    className="px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{ color: textColor }}
                    whileHover={{ 
                      backgroundColor: textColor + '15',
                      x: 4 
                    }}
                  >
                    📝 ทำข้อสอบ
                  </motion.div>
                  
                  <motion.div 
                    className="px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{ color: textColor }}
                    whileHover={{ 
                      backgroundColor: textColor + '15',
                      x: 4 
                    }}
                  >
                    🚪 ออกจากระบบ
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </ThemedLayout>
  )
}