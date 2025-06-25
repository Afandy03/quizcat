'use client'

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import ThemedLayout from "@/components/ThemedLayout" // ✅ import layout เข้ามา

export default function AddRewardPage() {
  const [name, setName] = useState("")
  const [cost, setCost] = useState<number>(0)
  const [imageUrl, setImageUrl] = useState("")
  const [description, setDescription] = useState("")
  const [creatorName, setCreatorName] = useState("")
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [customCostMode, setCustomCostMode] = useState(false)
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const fetchCreatorName = async () => {
      const user = auth.currentUser
      if (!user) return

      const userRef = doc(db, "users", user.uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const data = snap.data()
        setCreatorName(data.name || user.email || "ไม่ระบุชื่อ")
      }
    }
    fetchCreatorName()
  }, [])

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
      await addDoc(collection(db, "rewards"), {
        name,
        cost,
        imageUrl,
        description,
        expiresAt,
        createdBy: creatorName,
        createdAt: serverTimestamp(),
      })

      alert("เพิ่มของรางวัลเรียบร้อย!")
      router.push("/dashboard")
    } catch (err) {
      console.error("Error adding reward:", err)
      alert("เพิ่มไม่สำเร็จ ลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemedLayout> {/* ✅ ครอบทุกอย่างด้วย Layout */}
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">เพิ่มของรางวัลใหม่ 🎁</h1>

        <div>
          <label className="font-medium block mb-1">ชื่อของรางวัล</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="font-medium block mb-1">แต้มที่ต้องใช้แลก</label>
          <div className="flex gap-2 flex-wrap">
            {[10, 20, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setCost(val)
                  setCustomCostMode(false)
                }}
                className={`px-4 py-2 rounded ${
                  cost === val && !customCostMode
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
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
              className={`px-4 py-2 rounded ${
                customCostMode ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
              }`}
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
              className="w-full mt-2 p-2 border rounded-md"
            />
          )}
        </div>

        <div>
          <label className="font-medium block mb-1">URL รูปภาพ (ถ้ามี)</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="font-medium block mb-1">คำอธิบาย (ไม่บังคับ)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="font-medium block mb-1">ระยะเวลาที่สามารถแลกได้</label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setExpiryDaysFromNow(7)}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              7 วัน
            </button>
            <button
              type="button"
              onClick={() => setExpiryDaysFromNow(15)}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              15 วัน
            </button>
            <button
              type="button"
              onClick={() => setExpiryDaysFromNow(30)}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              30 วัน
            </button>
            <button
              type="button"
              onClick={() => setExpiresAt(null)}
              className="bg-red-200 hover:bg-red-300 px-4 py-2 rounded"
            >
              ❌ ไม่มีวันหมดอายุ
            </button>
          </div>
          {expiresAt && (
            <p className="text-sm text-gray-600 mt-1">
              📅 หมดเขต: {expiresAt.toLocaleDateString("th-TH")}
            </p>
          )}
        </div>

        <button
          disabled={loading}
          onClick={handleSubmit}
          className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
        >
          {loading ? "กำลังเพิ่ม..." : "เพิ่มของรางวัล"}
        </button>
      </div>
    </ThemedLayout>
  )
}
