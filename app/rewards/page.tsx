"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore"
import Image from "next/image"
import ThemedLayout from "@/components/ThemedLayout"



export default function RewardsPage() {
  const [user, setUser] = useState<any>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [userRole, setUserRole] = useState("user")
  const [rewards, setRewards] = useState<any[]>([])
  

  useEffect(() => {
    const fetchData = async () => {
      const u = auth.currentUser
      if (!u) return

      setUser(u)

      const userSnap = await getDoc(doc(db, "users", u.uid))
      const userData = userSnap.data()
      setUserPoints(userData?.points || 0)
      setUserRole(userData?.role || "user")

      const snap = await getDocs(collection(db, "rewards"))
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRewards(items)
    }

    fetchData()
  }, [])

  const handleClaim = async (reward: any) => {
    if (!user || userPoints < reward.cost) return alert("แต้มไม่พอ!")

    const confirmClaim = window.confirm(`แลก "${reward.name}" ใช่ไหม?`)
    if (!confirmClaim) return

    await updateDoc(doc(db, "users", user.uid), {
      points: userPoints - reward.cost,
    })

    alert(`แลก "${reward.name}" เรียบร้อย!`)
    setUserPoints(userPoints - reward.cost)
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("แน่ใจว่าจะลบของรางวัลนี้?")
    if (!confirmDelete) return

    await deleteDoc(doc(db, "rewards", id))
    setRewards((prev) => prev.filter((r) => r.id !== id))
  }

  const isExpired = (reward: any) => {
    if (!reward.expiresAt) return false
    const now = new Date()
    const expiredAt = reward.expiresAt.toDate?.() || new Date(reward.expiresAt)
    return expiredAt < now
  }

  return (
    <ThemedLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">🎁 แลกของรางวัล</h1>
        <p className="bg-yellow-100 text-center font-semibold p-2 rounded-lg">
          แต้มของคุณ: <span className="text-red-600">{userPoints}</span>
        </p>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {rewards.map((r) => {
            const expired = isExpired(r)
            const canClaim = userPoints >= r.cost && !expired

            return (
              <div key={r.id} className="border rounded-md p-4 shadow bg-white space-y-2 relative">
                <p className="font-bold text-lg text-red-600">{r.name}</p>

                {r.imageUrl && (
                  <Image
                    src={
                      r.imageUrl && r.imageUrl.startsWith("http")
                      ? r.imageUrl.trim()
                      : "https://i.pinimg.com/564x/bd/ce/45/bdce4587851a6ebe571e71f00de7743f.jpg"
                    }
                    alt={r.name}
                    width={300}
                    height={300}
                    className="w-full aspect-square object-cover rounded-md bg-gray-100"
                  />
                )}

                {r.description && (
                  <p className="text-sm text-gray-700 italic">{r.description}</p>
                )}
                {r.createdBy && (
                  <p className="text-sm text-gray-500">👤 ผู้อัปโหลด: {r.createdBy}</p>
                )}

                <p className="text-sm text-gray-800">
                  🪙 <span className={r.cost > 999 ? "text-red-500 font-bold" : ""}>
                    {r.cost} แต้มที่ต้องใช้แลก
                  </span>
                </p>

                <p className="text-sm text-gray-600">
                  ⏳ หมดอายุ:{" "}
                  {r.expiresAt
                    ? new Date(r.expiresAt.toDate?.() || r.expiresAt).toLocaleDateString("th-TH")
                    : "ไม่มี"}
                </p>

                {expired ? (
                  <p className="text-red-500 text-sm font-semibold">⛔ หมดเวลาแลกแล้ว</p>
                ) : (
                  <button
                    disabled={!canClaim}
                    onClick={() => handleClaim(r)}
                    className={`w-full py-2 rounded text-white font-semibold ${
                      canClaim ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {canClaim ? "แลกเลย" : "แต้มไม่พอ"}
                  </button>
                )}

                {(userRole === "admin" || r.createdBy === user?.email || r.createdBy === user?.displayName) && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="absolute top-2 right-2 text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    🗑️ ลบ
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </ThemedLayout>
  )
}
