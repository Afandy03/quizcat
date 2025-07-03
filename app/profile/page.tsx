'use client'

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import ThemedLayout from "@/components/ThemedLayout"
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme"
import { motion, AnimatePresence } from "framer-motion"

export default function ProfilePage() {
  const router = useRouter()
  const { theme } = useUserTheme()
  const [userUid, setUserUid] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [editingAvatarUrl, setEditingAvatarUrl] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [userStatus, setUserStatus] = useState("offline")
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }
      setUserUid(user.uid)

      const userRef = doc(db, "users", user.uid)
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        const data = snap.data()
        setName(data.name || "ไม่ระบุชื่อ")
        setAvatarUrl(data.avatarUrl || "")
        setUserStatus("online") // Always set to online when user is logged in
        setPoints(data.points || 0)
        
        // Update user status to online in Firebase
        await setDoc(userRef, { status: "online" }, { merge: true })
      } else {
        await setDoc(userRef, {
          name: user.email ?? "ไม่ระบุชื่อ",
          avatarUrl: "",
          status: "online",
          points: 0,
        })
        setName(user.email ?? "ไม่ระบุชื่อ")
        setUserStatus("online")
        setPoints(0)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleSave = async () => {
    if (!userUid) return
    
    try {
      const userRef = doc(db, "users", userUid)
      await setDoc(userRef, {
        name: editingName,
        avatarUrl: editingAvatarUrl,
      }, { merge: true })
      
      setName(editingName)
      setAvatarUrl(editingAvatarUrl)
      setIsEditing(false)
      
      // Show success message
      alert("บันทึกโปรไฟล์เรียบร้อย!")
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่")
    }
  }

  const handleCancel = () => {
    setEditingName(name)
    setEditingAvatarUrl(avatarUrl)
    setIsEditing(false)
  }

  const handleEditClick = () => {
    setEditingName(name)
    setEditingAvatarUrl(avatarUrl)
    setIsEditing(true)
  }

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
                   style={{ borderColor: theme.textColor }}></div>
              <p className="text-lg" style={{ color: theme.textColor }}>กำลังโหลดโปรไฟล์...</p>
            </div>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: theme.textColor + '10' }}
              title="กลับหน้าหลัก"
            >
              <svg className="w-6 h-6" style={{ color: theme.textColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: theme.textColor }}>👤 โปรไฟล์ของฉัน</h1>
              <p style={{ color: theme.textColor + '80' }}>จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-xl p-6 shadow-lg border"
            style={{ 
              ...getBackgroundStyle(theme.bgColor),
              borderColor: theme.textColor + '20',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <div className="relative">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="avatar" 
                    className="w-24 h-24 rounded-full object-cover border-4 shadow-lg"
                    style={{ borderColor: theme.textColor + '30' }}
                  />
                ) : (
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-lg border-4"
                    style={{ 
                      backgroundColor: theme.textColor + '20',
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div 
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{ 
                    backgroundColor: userStatus === 'online' ? '#10b981' : '#6b7280',
                    borderColor: theme.bgColor,
                    color: 'white'
                  }}
                >
                  {userStatus === 'online' ? '🟢' : '🔴'}
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>
                  {name}
                </h2>
                <div className="flex items-center gap-2 text-sm" style={{ color: theme.textColor + '70' }}>
                  <span>สถานะ:</span>
                  <span className="font-medium">
                    {userStatus === 'online' ? '🟢 ออนไลน์' : '🔴 ออฟไลน์'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: theme.textColor }}>
                  <span>🏆</span>
                  <span>{points} แต้ม</span>
                </div>
              </div>

              {/* Edit Button */}
              {!isEditing && (
                <button
                  onClick={handleEditClick}
                  className="px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-md"
                  style={{
                    background: "linear-gradient(90deg, #ffb6ec 0%, #ff6fd8 50%, #fcb1fc 100%)",
                    color: '#e6007a', // vivid pink text
                    textShadow: '0 1px 8px #fff, 0 0px 2px #ffb6ec',
                    boxShadow: '0 2px 12px 0 #ffb6ec80, 0 1.5px 8px 0 #ff6fd880',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    letterSpacing: '0.5px',
                  }}
                >
                  ✏️ แก้ไขโปรไฟล์
                  <span className="absolute inset-0 pointer-events-none" style={{
                    background: 'repeating-linear-gradient(135deg, #fff6 0 2px, #fff0 2px 6px)',
                    opacity: 0.18,
                    mixBlendMode: 'screen',
                  }}></span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Edit Form / Stats */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl p-6 shadow-lg border"
                style={{ 
                  ...getBackgroundStyle(theme.bgColor),
                  borderColor: theme.textColor + '20',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
                  ✏️ แก้ไขข้อมูล
                </h3>
                
                <div className="space-y-6">
                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>
                      👤 ชื่อใหม่
                    </label>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      placeholder="กรอกชื่อของคุณ"
                    />
                  </div>

                  {/* Avatar URL Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>
                      🖼️ ลิงก์รูปโปรไฟล์ (URL)
                    </label>
                    <input
                      type="url"
                      value={editingAvatarUrl}
                      onChange={(e) => setEditingAvatarUrl(e.target.value)}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <div className="mt-2 text-xs" style={{ color: theme.textColor + '60' }}>
                      <p>💡 ทิป: ใช้ลิงก์รูปจากเว็บไซต์ที่เชื่อถือได้</p>
                      <p>• ขนาดที่แนะนำ: 200x200 พิกเซล</p>
                      <p>• รูปแบบ: JPG, PNG, GIF</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 shadow-md"
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                      }}
                    >
                      ✅ บันทึกข้อมูล
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 shadow-md"
                      style={{
                        backgroundColor: theme.textColor + '20',
                        color: theme.textColor,
                      }}
                    >
                      ❌ ยกเลิก
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stats-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl p-6 shadow-lg border"
                style={{ 
                  ...getBackgroundStyle(theme.bgColor),
                  borderColor: theme.textColor + '20',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
                  📊 สถิติและข้อมูล
                </h3>
                
                <div className="space-y-4">
                  {/* Points Card */}
                  <div 
                    className="rounded-lg p-4 border"
                    style={{ 
                      backgroundColor: theme.textColor + '10',
                      borderColor: theme.textColor + '20'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <div className="text-2xl font-bold" style={{ color: theme.textColor }}>
                          {points}
                        </div>
                        <div className="text-sm" style={{ color: theme.textColor + '70' }}>
                          แต้มสะสม
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Card */}
                  <div 
                    className="rounded-lg p-4 border"
                    style={{ 
                      backgroundColor: theme.textColor + '10',
                      borderColor: theme.textColor + '20'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {userStatus === 'online' ? '🟢' : '🔴'}
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: theme.textColor }}>
                          {userStatus === 'online' ? 'ออนไลน์' : 'ออฟไลน์'}
                        </div>
                        <div className="text-sm" style={{ color: theme.textColor + '70' }}>
                          สถานะปัจจุบัน
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3 pt-4">
                    <button
                      onClick={() => router.push("/rewards")}
                      className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 shadow-sm border text-left"
                      style={{
                        backgroundColor: theme.textColor + '10',
                        color: theme.textColor,
                        borderColor: theme.textColor + '20'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎁</span>
                        <div>
                          <div className="font-bold">แลกของรางวัล</div>
                          <div className="text-sm opacity-70">ใช้แต้มแลกของรางวัล</div>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => router.push("/quiz/v2/select")}
                      className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 shadow-sm border text-left"
                      style={{
                        backgroundColor: theme.textColor + '10',
                        color: theme.textColor,
                        borderColor: theme.textColor + '20'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🧠</span>
                        <div>
                          <div className="font-bold">เริ่มทำควิซ</div>
                          <div className="text-sm opacity-70">ทำควิซเพื่อเก็บแต้ม</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ThemedLayout>
  )
}
