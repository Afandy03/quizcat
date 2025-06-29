'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore"
import ThemedLayout from "@/components/ThemedLayout"
import UserPoints from "@/components/UserPoints"
import { useUserTheme } from "@/lib/useTheme"

export default function DashboardPage() {
  const [userData, setUserData] = useState<{ 
    points: number; 
    name?: string; 
    avatarUrl?: string;
    gradeLevel?: number;
  }>({
    points: 0,
    name: '',
    avatarUrl: '',
    gradeLevel: 4,
  })
  const [isGuest, setIsGuest] = useState(false)
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    correctAnswers: 0,
    averageScore: 0,
    m1ChancePercentage: 0,
    recentQuizzes: 0,
    todayPoints: 0
  })
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const theme = useUserTheme()

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
            gradeLevel: 4,
          })
          setLoading(false)
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
          gradeLevel: data.gradeLevel || 4,
        })
        
        // โหลดสถิติ
        await loadUserStats(user.uid, data.gradeLevel || 4)
      } else {
        await setDoc(ref, { points: 0, status: 'online', gradeLevel: 4 })
        setUserData({ points: 0, name: '', gradeLevel: 4 })
      }
      
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  // ✅ ฟังก์ชันโหลดสถิติผู้ใช้
  const loadUserStats = async (userId: string, gradeLevel: number) => {
    try {
      // โหลดจาก V2 answers
      const v2Query = query(
        collection(db, 'quiz_v2_answers'),
        where('userId', '==', userId)
      )
      const v2Snap = await getDocs(v2Query)
      
      let totalQuestions = 0
      let correctCount = 0
      let quizSessions = new Set()
      let todayPoints = 0
      const today = new Date().toDateString()

      v2Snap.docs.forEach(doc => {
        const data = doc.data()
        totalQuestions++
        if (data.isCorrect) correctCount++
        
        // นับ quiz sessions
        if (data.quizSession) {
          quizSessions.add(data.quizSession)
        }
        
        // คำนวณแต้มวันนี้
        const answerDate = data.timestamp?.toDate?.()?.toDateString()
        if (answerDate === today && data.pointsEarned) {
          todayPoints += data.pointsEarned
        }
      })

      const avgScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
      const m1Chance = calculateM1Chance(avgScore, totalQuestions, gradeLevel)
      
      setStats({
        totalQuizzes: quizSessions.size,
        correctAnswers: correctCount,
        averageScore: Math.round(avgScore),
        m1ChancePercentage: m1Chance,
        recentQuizzes: Math.min(quizSessions.size, 7), // ช่วง 7 วันล่าสุด (สามารถปรับได้)
        todayPoints
      })
      
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  // ✅ ฟังก์ชันคำนวณโอกาสสอบผ่าน ม.1
  const calculateM1Chance = (avgScore: number, totalQuestions: number, currentGrade: number) => {
    let baseChance = 0
    
    // คำนวณจากคะแนนเฉลี่ย
    if (avgScore >= 90) baseChance = 95
    else if (avgScore >= 80) baseChance = 85
    else if (avgScore >= 70) baseChance = 70
    else if (avgScore >= 60) baseChance = 55
    else if (avgScore >= 50) baseChance = 40
    else if (avgScore >= 40) baseChance = 25
    else baseChance = 10
    
    // ปรับตามจำนวนข้อสอบที่ทำ
    if (totalQuestions >= 100) baseChance += 5
    else if (totalQuestions >= 50) baseChance += 3
    else if (totalQuestions >= 20) baseChance += 1
    else if (totalQuestions < 10) baseChance -= 10
    
    // ปรับตามระดับชั้น
    if (currentGrade === 4) baseChance += 10
    else if (currentGrade === 5) baseChance += 5
    else if (currentGrade === 6) baseChance -= 0
    
    return Math.max(0, Math.min(100, baseChance))
  }

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

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center" style={{ color: theme.textColor }}>
          ⏳ กำลังโหลดข้อมูล...
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex flex-col items-center mb-6">
            {userData.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt="avatar"
                className="w-24 h-24 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div 
                className="w-24 h-24 rounded-full text-4xl flex items-center justify-center text-white shadow-lg"
                style={{ background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)' }}
              >
                {userData.name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <h1 className="text-4xl font-bold mt-4" style={{ color: theme.textColor }}>
              👋 สวัสดี, {userData.name || 'ผู้ใช้'}!
            </h1>
            {isGuest ? (
              <div 
                className="px-4 py-2 rounded-lg text-center mt-2"
                style={{ backgroundColor: '#f59e0b20', border: '1px solid #f59e0b', color: '#f59e0b' }}
              >
                🎭 โหมดผู้เยี่ยมชม - คะแนนจะไม่ถูกบันทึก
              </div>
            ) : (
              <div className="flex gap-4 mt-4">
                <div 
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                >
                  📚 ป.{userData.gradeLevel}
                </div>
                <div 
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
                >
                  ⭐ {userData.points} แต้ม
                </div>
              </div>
            )}
          </div>
        </div>

        {/* M.1 Chance Card - สำหรับผู้ใช้ที่ล็อกอิน */}
        {!isGuest && (
          <div 
            className="rounded-xl p-8 text-center shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${stats.m1ChancePercentage >= 70 ? '#10b981' : stats.m1ChancePercentage >= 50 ? '#f59e0b' : '#ef4444'}20, ${stats.m1ChancePercentage >= 70 ? '#059669' : stats.m1ChancePercentage >= 50 ? '#d97706' : '#dc2626'}20)`,
              border: `2px solid ${stats.m1ChancePercentage >= 70 ? '#10b981' : stats.m1ChancePercentage >= 50 ? '#f59e0b' : '#ef4444'}`
            }}
          >
            <div className="text-6xl mb-4">
              {stats.m1ChancePercentage >= 70 ? '🎯' : stats.m1ChancePercentage >= 50 ? '💪' : '📚'}
            </div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
              โอกาสสอบเข้า ม.1 ได้
            </h2>
            <div 
              className="text-7xl font-bold mb-4"
              style={{ 
                color: stats.m1ChancePercentage >= 70 ? '#10b981' : 
                       stats.m1ChancePercentage >= 50 ? '#f59e0b' : '#ef4444'
              }}
            >
              {stats.m1ChancePercentage}%
            </div>
            <p className="text-lg mb-4" style={{ color: theme.textColor + '80' }}>
              {stats.m1ChancePercentage >= 80 ? '🏆 ยอดเยี่ยม! พร้อมสอบเข้า ม.1 แล้ว!' :
               stats.m1ChancePercentage >= 70 ? '👍 ดีมาก! อีกนิดเดียวก็พร้อมแล้ว' :
               stats.m1ChancePercentage >= 50 ? '💪 กำลังดี! ลองทำข้อสอบเพิ่มเติมนะ' :
               '📚 ยังต้องฝึกฝนอีกหน่อย แต่อย่าท้อ!'}
            </p>
            {userData.gradeLevel === 4 && (
              <p className="text-sm" style={{ color: theme.textColor + '60' }}>
                � เหลือเวลาอีก 2 ปีในการเตรียมตัว ยังทันเป็นเด็กเก่งได้!
              </p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        {!isGuest && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              className="p-6 rounded-lg text-center"
              style={{ backgroundColor: theme.bgColor, border: `1px solid #3b82f620` }}
            >
              <div className="text-3xl mb-2">⭐</div>
              <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
                {stats.todayPoints}
              </div>
              <div style={{ color: theme.textColor + '70' }}>แต้มวันนี้</div>
            </div>

            <div 
              className="p-6 rounded-lg text-center"
              style={{ backgroundColor: theme.bgColor, border: `1px solid #10b98120` }}
            >
              <div className="text-3xl mb-2">📝</div>
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>
                {stats.totalQuizzes}
              </div>
              <div style={{ color: theme.textColor + '70' }}>ชุดข้อสอบทั้งหมด</div>
            </div>

            <div 
              className="p-6 rounded-lg text-center"
              style={{ backgroundColor: theme.bgColor, border: `1px solid #f59e0b20` }}
            >
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                {stats.correctAnswers}
              </div>
              <div style={{ color: theme.textColor + '70' }}>ข้อที่ตอบถูก</div>
            </div>

            <div 
              className="p-6 rounded-lg text-center"
              style={{ backgroundColor: theme.bgColor, border: `1px solid #8b5cf620` }}
            >
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
                {stats.averageScore}%
              </div>
              <div style={{ color: theme.textColor + '70' }}>คะแนนเฉลี่ย</div>
            </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/quiz/v2/select"
            className="p-6 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all text-center"
            style={{ backgroundColor: '#10b981', color: '#ffffff' }}
          >
            <div className="text-4xl mb-2">�</div>
            <div className="text-lg font-bold">ทำข้อสอบ V2</div>
            <div className="text-sm opacity-80">เอาแต้มมาแลกของรางวัล!</div>
          </Link>

          <Link
            href="/rewards"
            className="p-6 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all text-center"
            style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
          >
            <div className="text-4xl mb-2">🎁</div>
            <div className="text-lg font-bold">แลกของรางวัล</div>
            <div className="text-sm opacity-80">ใช้แต้มแลกของดีๆ</div>
          </Link>

          <Link
            href="/analysis"
            className="p-6 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all text-center"
            style={{ backgroundColor: '#8b5cf6', color: '#ffffff' }}
          >
            <div className="text-4xl mb-2">📈</div>
            <div className="text-lg font-bold">ดูสถิติ</div>
            <div className="text-sm opacity-80">วิเคราะห์การเรียน</div>
          </Link>

          <Link
            href="/profile"
            className="p-6 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all text-center"
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
          >
            <div className="text-4xl mb-2">👤</div>
            <div className="text-lg font-bold">โปรไฟล์</div>
            <div className="text-sm opacity-80">ข้อมูลส่วนตัว</div>
          </Link>

          <Link
            href="/add-question"
            className="p-6 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all text-center"
            style={{ backgroundColor: '#059669', color: '#ffffff' }}
          >
            <div className="text-4xl mb-2">➕</div>
            <div className="text-lg font-bold">เพิ่มข้อสอบ</div>
            <div className="text-sm opacity-80">สร้างข้อสอบเอง</div>
          </Link>

          <Link
            href="/settings"
            className="p-6 rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all text-center"
            style={{ backgroundColor: '#6b7280', color: '#ffffff' }}
          >
            <div className="text-4xl mb-2">⚙️</div>
            <div className="text-lg font-bold">ตั้งค่า</div>
            <div className="text-sm opacity-80">ปรับแต่งระบบ</div>
          </Link>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full p-4 rounded-lg font-bold transition-all hover:opacity-80"
          style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
        >
          🚪 ออกจากระบบ
        </button>
      </div>
    </ThemedLayout>
  )
}
