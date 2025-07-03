'use client'

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import ThemedLayout from "@/components/ThemedLayout"
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme"
import { AnimatePresence, motion } from "framer-motion"

export default function AddRewardPage() {
  const { theme } = useUserTheme()
  const router = useRouter()
  
  const [name, setName] = useState("")
  const [cost, setCost] = useState<number>(0)
  const [imageUrl, setImageUrl] = useState("")
  const [description, setDescription] = useState("")
  const [creatorName, setCreatorName] = useState("")
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [customCostMode, setCustomCostMode] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCreatorName = async () => {
      const user = auth.currentUser
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, "users", user.uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const data = snap.data()
        setCreatorName(data.name || user.email || "ไม่ระบุชื่อ")
      }
    }
    fetchCreatorName()
  }, [router])

  const setExpiryDaysFromNow = (days: number) => {
    const now = new Date()
    now.setDate(now.getDate() + days)
    setExpiresAt(now)
  }

  const handleSubmit = async () => {
    if (!name || cost <= 0) {
      alert("กรอกชื่อของรางวัล และจำนวนแต้มให้ครบ")
      return
    }

    setLoading(true)

    try {
      // ตรวจสอบว่ามีการล็อกอินหรือไม่
      const user = auth.currentUser
      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนเพิ่มของรางวัล")
        router.push("/login")
        return
      }

      await addDoc(collection(db, "rewards"), {
        name,
        cost,
        imageUrl,
        description,
        expiresAt,
        createdBy: creatorName,
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByEmail: user.email
      })

      alert("เพิ่มของรางวัลเรียบร้อย!")
      router.push("/rewards")
    } catch (err) {
      console.error("Error adding reward:", err)
      alert("เพิ่มไม่สำเร็จ ลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/rewards")}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: theme.textColor + '10' }}
              title="กลับ"
            >
              <svg className="w-6 h-6" style={{ color: theme.textColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: theme.textColor }}>➕ เพิ่มของรางวัลใหม่</h1>
              <p style={{ color: theme.textColor + '80' }}>ทุกคนสามารถเพิ่มของรางวัลให้ผู้ใช้แลกด้วยแต้มสะสมได้</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 shadow-lg border space-y-6"
          style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
        >
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📦 ชื่อของรางวัล</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              style={{ 
                ...getBackgroundStyle(theme.bgColor),
                color: theme.textColor,
                borderColor: theme.textColor + '30'
              }}
              placeholder="เช่น บัตรส่วนลด Starbucks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>🪙 แต้มที่ต้องใช้แลก</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {[100, 200, 500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setCost(val)
                    setCustomCostMode(false)
                  }}
                  className="px-5 py-2 rounded-xl transition-all"
                  style={{ 
                    backgroundColor: cost === val && !customCostMode ? 'rgb(59, 130, 246)' : theme.textColor + '15',
                    color: cost === val && !customCostMode ? 'white' : theme.textColor
                  }}
                >
                  {val} แต้ม
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setCustomCostMode(true)
                  setCost(0)
                }}
                className="px-5 py-2 rounded-xl transition-all"
                style={{ 
                  backgroundColor: customCostMode ? 'rgb(59, 130, 246)' : theme.textColor + '15',
                  color: customCostMode ? 'white' : theme.textColor
                }}
              >
                กำหนดเอง
              </button>
            </div>

            {customCostMode && (
              <input
                type="number"
                min="1"
                placeholder="ใส่จำนวนแต้มเอง"
                value={cost === 0 ? "" : cost}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setCost(isNaN(val) ? 0 : val)
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                style={{ 
                  ...getBackgroundStyle(theme.bgColor),
                  color: theme.textColor,
                  borderColor: theme.textColor + '30'
                }}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>🖼️ URL รูปภาพ (ถ้ามี)</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              style={{ 
                ...getBackgroundStyle(theme.bgColor),
                color: theme.textColor,
                borderColor: theme.textColor + '30'
              }}
              placeholder="https://example.com/image.jpg"
            />
            <div className="mt-2 text-xs" style={{ color: theme.textColor + '70' }}>
              <p>รองรับโดเมน: i.pinimg.com, i0.wp.com, *.wp.com, spgeng.rosselcdn.net, xinhuathai.com</p>
              <p>หากใส่ URL ที่ไม่ได้อนุญาต ระบบจะใช้รูปภาพสำรองแทน</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📝 คำอธิบาย (ไม่บังคับ)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              style={{ 
                ...getBackgroundStyle(theme.bgColor),
                color: theme.textColor,
                borderColor: theme.textColor + '30'
              }}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติมของรางวัล"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>⏳ ระยะเวลาที่สามารถแลกได้</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { days: 7, label: "7 วัน" },
                { days: 15, label: "15 วัน" },
                { days: 30, label: "30 วัน" },
                { days: 60, label: "60 วัน" }
              ].map((option) => (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => setExpiryDaysFromNow(option.days)}
                  className="px-4 py-2 rounded-xl transition-all"
                  style={{ 
                    backgroundColor: theme.textColor + '15',
                    color: theme.textColor
                  }}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setExpiresAt(null)}
                className="px-4 py-2 rounded-xl transition-all"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: theme.textColor
                }}
              >
                ♾️ ไม่มีวันหมดอายุ
              </button>
            </div>
            {expiresAt && (
              <p className="text-sm mt-2" style={{ color: theme.textColor + '70' }}>
                📅 หมดเขต: {expiresAt.toLocaleDateString("th-TH")}
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="w-full py-4 px-6 rounded-xl text-white font-medium text-lg shadow-lg transition-all disabled:opacity-50"
              style={{ 
                background: loading ? 'gray' : 'linear-gradient(to right, rgb(34, 197, 94), rgb(22, 163, 74))'
              }}
            >
              {loading ? "⏳ กำลังเพิ่ม..." : "💾 บันทึกของรางวัล"}
            </button>
          </div>
        </motion.div>
        
        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/rewards")}
            className="hover:underline transition-colors"
            style={{ color: theme.textColor + '70' }}
          >
            ← กลับไปหน้ารางวัล
          </button>
        </div>
      </div>
    </ThemedLayout>
  )
}
