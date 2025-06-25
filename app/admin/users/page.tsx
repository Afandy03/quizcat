"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import ThemedLayout from "@/components/ThemedLayout"

export default function AdminUsersPage() {
  const router = useRouter()
  const [currentUserRole, setCurrentUserRole] = useState("") // ✅ state นี้จะเริ่มจากค่าว่าง
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login")
        return
      }

      const snap = await getDoc(doc(db, "users", user.uid))
      const role = snap.data()?.role || "user"
      setCurrentUserRole(role) // ✅ กำหนด role ที่โหลดมาแล้ว

      if (role === "admin") {
        const allUsersSnap = await getDocs(collection(db, "users"))
        const allUsers = allUsersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(allUsers)
      }
    })

    return () => unsub()
  }, [])

  // ✅ loading state: ยังไม่รู้ว่า role เป็นอะไร
  if (!currentUserRole) {
    return (
      <ThemedLayout>
        <p className="text-center text-gray-500 mt-10">⏳ กำลังโหลดข้อมูล...</p>
      </ThemedLayout>
    )
  }

  // ✅ ไม่ใช่แอดมิน = ปิดทางเข้า
  if (currentUserRole !== "admin") {
    return (
      <ThemedLayout>
        <p className="text-center text-red-600 mt-10">⛔ คุณไม่มีสิทธิ์เข้าหน้านี้</p>
      </ThemedLayout>
    )
  }

  // ✅ แอดมินเห็นข้อมูล user
  return (
    <ThemedLayout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">👥 รายชื่อผู้ใช้ทั้งหมด</h1>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="p-3 border rounded-md bg-white shadow-sm">
              <p><strong>ชื่อ:</strong> {u.name || "ไม่ระบุ"}</p>
              <p><strong>Email:</strong> {u.email || "ไม่มี"}</p>
              <p><strong>แต้ม:</strong> {u.points ?? 0}</p>
              <p><strong>สิทธิ์:</strong> {u.role || "user"}</p>
            </div>
          ))}
        </div>
      </div>
    </ThemedLayout>
  )
}
