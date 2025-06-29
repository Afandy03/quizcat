'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import ThemedLayout from "@/components/ThemedLayout"
import UserPoints from "@/components/UserPoints"

export default function DashboardPage() {
  const [userData, setUserData] = useState<{ points: number; name?: string; avatarUrl?: string }>({
    points: 0,
    name: '',
    avatarUrl: '',
  })
  const [isGuest, setIsGuest] = useState(false)

  const router = useRouter()

  useEffect(() => {
    // สำหรับ authenticated users
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // ตรวจสอบ guest mode เฉพาะเมื่อไม่มี authenticated user
        const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
        if (isGuestMode) {
          setIsGuest(true)
          setUserData({
            points: 0,
            name: 'ผู้เยี่ยมชม',
            avatarUrl: '',
          })
          return
        }
        router.push('/login')
        return
      }
      
      // ถ้ามี authenticated user แล้ว ลบ guest session ออก
      localStorage.removeItem('quizcat-guest-id')
      localStorage.removeItem('quizcat-guest-mode')
      setIsGuest(false)
      
      const ref = doc(db, 'users', user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setUserData({
          points: data.points || 0,
          name: data.name || '',
          avatarUrl: data.avatarUrl || '',
        })
      } else {
        await setDoc(ref, { points: 0, status: 'online' })
        setUserData({ points: 0, name: '' })
      }
    })
    return () => unsub()
  }, [router])

  const handleSignOut = async () => {
    if (isGuest) {
      // ลบ guest session
      localStorage.removeItem('quizcat-guest-id')
      localStorage.removeItem('quizcat-guest-mode')
      router.push('/login')
    } else if (auth.currentUser) {
      await signOut(auth)
      router.push('/login')
    }
  }

  return (
    <ThemedLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* รูปโปรไฟล์ */}
        <div className="flex flex-col items-center">
          {userData.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-300 text-3xl flex items-center justify-center text-white">
              {userData.name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <h1 className="text-3xl font-bold mt-2 text-center">
            👋 ยินดีต้อนรับ, {userData.name || 'ผู้ใช้'}!
          </h1>
          {isGuest && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-center mt-2">
              🎭 คุณอยู่ในโหมดผู้เยี่ยมชม - คะแนนจะไม่ถูกบันทึก
            </div>
          )}
        </div>

        {!isGuest && <UserPoints points={userData.points} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/quiz/select"
            className="bg-orange-500 text-white p-4 rounded-lg flex items-center justify-center hover:opacity-90"
          >
            🚀 เริ่มทำข้อสอบ
          </Link>
          <Link
            href="/add-question"
            className="bg-purple-500 text-white p-4 rounded-lg flex items-center justify-center hover:opacity-90"
          >
            ➕ เพิ่มข้อสอบใหม่
          </Link>
          <Link
            href="/dashboard/questions"
            className="bg-blue-500 text-white p-4 rounded-lg flex items-center justify-center hover:opacity-90"
          >
            📋 ข้อสอบของฉัน
          </Link>

          <Link href="/rewards" className="bg-yellow-500 text-white p-4 rounded-lg flex items-center justify-center hover:opacity-90">
            🎁 แลกของรางวัล
          </Link>
          <Link
            href="/settings"
            className="bg-gray-600 text-white p-4 rounded-lg flex items-center justify-center hover:opacity-90"
          >
            ⚙️ ตั้งค่า
          </Link>
          <Link
            href="/profile"
            className="bg-green-600 text-white p-4 rounded-lg flex items-center justify-center hover:opacity-90 col-span-full"
          >
            🙋 โปรไฟล์ของฉัน
          </Link>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-red-500 text-white p-3 rounded-lg hover:opacity-90"
        >
          🚪 ออกจากระบบ
        </button>
      </div>
    </ThemedLayout>
  )
}
