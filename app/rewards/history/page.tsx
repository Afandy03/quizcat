"use client"

import ThemedLayout from "@/components/ThemedLayout"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme"
import { AnimatePresence, motion } from "framer-motion"
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

export default function RewardHistoryPage() {
  const router = useRouter()
  const { theme } = useUserTheme()
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userExists, setUserExists] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserExists(false)
        setLoading(false)
        return
      }

      try {
        // ปรับ query ให้ใช้เฉพาะ where โดยไม่ใช้ orderBy เพื่อหลีกเลี่ยงปัญหา composite index
        const q = query(
          collection(db, "reward_claims"),
          where("userId", "==", user.uid)
        )

        const snap = await getDocs(q)
        const data = snap.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            rewardName: d.rewardName || "ไม่มีชื่อ",
            cost: d.cost || 0,
            claimedAt:
              d.claimedAt instanceof Timestamp
                ? d.claimedAt.toDate()
                : new Date(),
          }
        })
        
        // เรียงลำดับข้อมูลในฝั่ง client แทน
        const sortedData = [...data].sort((a, b) => 
          b.claimedAt.getTime() - a.claimedAt.getTime()
        );

        setClaims(sortedData)
      } catch (err) {
        console.error("Error loading reward claims:", err)
        
        // แสดงคำอธิบายในกรณีเกิด Firebase Index Error ในคอนโซล (สำหรับนักพัฒนา)
        if (err instanceof Error && err.toString().includes("requires an index")) {
          console.info("Firebase index error: Data is being sorted client-side instead");
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto">
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
              <h1 className="text-3xl font-bold" style={{ color: theme.textColor }}>📋 ประวัติการแลกของรางวัล</h1>
              <p style={{ color: theme.textColor + '80' }}>รายการของรางวัลที่คุณเคยแลกไป</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.textColor }}></div>
            <p className="ml-3" style={{ color: theme.textColor + '80' }}>กำลังโหลดประวัติ...</p>
          </div>
        )}

        {/* User Not Logged In */}
        {!loading && !userExists && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-8 text-center border shadow-md"
            style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
          >
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.textColor }}>
              กรุณาเข้าสู่ระบบ
            </h2>
            <p style={{ color: theme.textColor + '80' }} className="mb-6">
              คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถดูประวัติการแลกของรางวัลได้
            </p>
            <button 
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              ไปหน้าเข้าสู่ระบบ
            </button>
          </motion.div>
        )}

        {/* No History */}
        {!loading && userExists && claims.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-8 text-center border shadow-md"
            style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
          >
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.textColor + '15' }}
            >
              <span className="text-2xl">🔍</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.textColor }}>
              ยังไม่มีประวัติการแลก
            </h2>
            <p style={{ color: theme.textColor + '80' }} className="mb-6">
              คุณยังไม่เคยแลกของรางวัลใดๆ เลย
            </p>
            <button 
              onClick={() => router.push("/rewards")}
              className="px-6 py-3 rounded-xl text-white transition-colors"
              style={{ background: 'linear-gradient(to right, rgb(34, 197, 94), rgb(22, 163, 74))' }}
            >
              ไปแลกของรางวัล
            </button>
          </motion.div>
        )}

        {/* Claims History */}
        {!loading && userExists && claims.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div 
              className="rounded-2xl p-6 border mb-6"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium" style={{ color: theme.textColor }}>ประวัติทั้งหมด</h3>
                  <p style={{ color: theme.textColor + '60' }} className="text-sm">
                    จำนวน {claims.length} รายการ
                  </p>
                </div>
                <div
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ backgroundColor: theme.textColor + '10', color: theme.textColor }}
                >
                  เรียงตามล่าสุด ({claims.length} รายการ)
                </div>
              </div>
            </div>
            
            <AnimatePresence>
              {claims.map((claim, index) => (
                <motion.div
                  key={claim.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-xl border overflow-hidden shadow-sm"
                  style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg" style={{ color: theme.textColor }}>
                        🎁 {claim.rewardName}
                      </h3>
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: theme.textColor + '15', color: theme.textColor }}
                      >
                        🪙 {claim.cost} แต้ม
                      </span>
                    </div>
                    
                    <div className="flex items-center" style={{ color: theme.textColor + '70' }}>
                      <span className="text-sm">
                        📅 แลกเมื่อ: {claim.claimedAt.toLocaleString("th-TH")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/rewards")}
                className="hover:underline transition-colors"
                style={{ color: theme.textColor + '70' }}
              >
                ← กลับไปหน้ารางวัล
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </ThemedLayout>
  )
}
