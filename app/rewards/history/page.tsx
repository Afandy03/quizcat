"use client"

import ThemedLayout from "@/components/ThemedLayout"
import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

export default function RewardHistoryPage() {
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
                : null,
          }
        })

        setClaims(data)
      } catch (err) {
        console.error("โหลดพัง:", err)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <ThemedLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">🧾 ประวัติการแลกของ</h1>

        {loading && <p className="text-center text-gray-500">⏳ กำลังโหลด...</p>}

        {!loading && !userExists && (
          <p className="text-center text-red-500">⚠ กรุณาเข้าสู่ระบบก่อนดูประวัติ</p>
        )}

        {!loading && userExists && claims.length === 0 && (
          <p className="text-center text-gray-500">ยังไม่มีประวัติการแลกของ</p>
        )}

        {!loading && userExists && claims.length > 0 && (
          <div className="space-y-3">
            {claims.map((c) => (
              <div key={c.id} className="border p-4 rounded-md bg-white shadow-sm">
                <p className="font-semibold text-lg">🎁 {c.rewardName}</p>
                <p className="text-sm text-gray-700">🪙 ใช้แต้ม: {c.cost}</p>
                <p className="text-sm text-gray-600">
                  📅 วันที่แลก:{" "}
                  {c.claimedAt
                    ? c.claimedAt.toLocaleString("th-TH")
                    : "ไม่ระบุ"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ThemedLayout>
  )
}
