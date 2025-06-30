'use client'

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import ThemedLayout from "@/components/ThemedLayout"

export default function ProfilePage() {
  const router = useRouter()
  const [userUid, setUserUid] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [editingAvatarUrl, setEditingAvatarUrl] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [userStatus, setUserStatus] = useState("offline")
  const [loading, setLoading] = useState(true) // ✅ เพิ่ม loading state

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
        setUserStatus(data.status || "offline")
      } else {
        await setDoc(userRef, {
          name: user.email ?? "ไม่ระบุชื่อ",
          avatarUrl: "",
          status: "online",
          points: 0,
        })
        setName(user.email ?? "ไม่ระบุชื่อ")
        setUserStatus("online")
      }

      setLoading(false) // ✅ โหลดเสร็จแล้ว
    })

    return () => unsubscribe()
  }, [router])

  const handleSave = async () => {
    if (!userUid) return
    const userRef = doc(db, "users", userUid)
    await setDoc(userRef, {
      name: editingName,
      avatarUrl: editingAvatarUrl,
    }, { merge: true })
    setName(editingName)
    setAvatarUrl(editingAvatarUrl)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditingName(name)
    setEditingAvatarUrl(avatarUrl)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">⏳ กำลังโหลดโปรไฟล์...</div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex flex-col items-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-300 text-3xl flex items-center justify-center text-white">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-xl font-bold mt-2">โปรไฟล์ของฉัน</h2>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium">ชื่อใหม่</label>
              <input
                className="w-full border p-2 rounded"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
              <label className="block text-sm font-medium mt-2">ลิงก์รูปโปรไฟล์ (URL)</label>
              <input
                className="w-full border p-2 rounded"
                value={editingAvatarUrl}
                onChange={(e) => setEditingAvatarUrl(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                >
                  ✅ บันทึกข้อมูล
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded"
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-lg">👋 ยินดีต้อนรับ, <b>{name}</b></p>
              <p className="text-sm text-gray-500">สถานะ: {userStatus}</p>
              <button
                onClick={() => {
                  setEditingName(name)
                  setEditingAvatarUrl(avatarUrl)
                  setIsEditing(true)
                }}
                className="text-blue-600 hover:text-blue-800 underline mt-2"
              >
                ✏️ แก้ไขโปรไฟล์
              </button>
            </div>
          )}
        </div>
      </div>
    </ThemedLayout>
  )
}
