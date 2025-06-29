'use client'

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore"
import { useRouter } from "next/navigation"
import ThemedLayout from "@/components/ThemedLayout"
import { useUserTheme } from "@/lib/useTheme"

export default function ProfilePage() {
  const router = useRouter()
  const theme = useUserTheme()
  const [userUid, setUserUid] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [editingAvatarUrl, setEditingAvatarUrl] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [userStatus, setUserStatus] = useState("offline")
  const [loading, setLoading] = useState(true)
  
  // ✅ เพิ่ม state สำหรับระบบแต้มและสถิติ
  const [userPoints, setUserPoints] = useState(0)
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [averageScore, setAverageScore] = useState(0)
  const [m1ChancePercentage, setM1ChancePercentage] = useState(0)
  const [gradeLevel, setGradeLevel] = useState(4) // ป.4 เป็นค่าเริ่มต้น
  const [editingGradeLevel, setEditingGradeLevel] = useState(4)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }
      setUserUid(user.uid)

      // โหลดข้อมูลผู้ใช้
      const userRef = doc(db, "users", user.uid)
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        const data = snap.data()
        setName(data.name || "ไม่ระบุชื่อ")
        setAvatarUrl(data.avatarUrl || "")
        setUserStatus(data.status || "offline")
        setUserPoints(data.points || 0)
        setGradeLevel(data.gradeLevel || 4)
      } else {
        await setDoc(userRef, {
          name: user.email ?? "ไม่ระบุชื่อ",
          avatarUrl: "",
          status: "online",
          points: 0,
          gradeLevel: 4,
        })
        setName(user.email ?? "ไม่ระบุชื่อ")
        setUserStatus("online")
        setUserPoints(0)
        setGradeLevel(4)
      }

      // ✅ โหลดสถิติการทำข้อสอบ
      await loadQuizStats(user.uid)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // ✅ ฟังก์ชันโหลดสถิติการทำข้อสอบ
  const loadQuizStats = async (userId: string) => {
    try {
      // โหลดจาก V2 answers
      const v2Query = query(
        collection(db, 'quiz_v2_answers'),
        where('userId', '==', userId)
      )
      const v2Snap = await getDocs(v2Query)
      
      let totalQuestions = 0
      let correctCount = 0
      let scoreSum = 0
      let quizSessions = new Set()

      v2Snap.docs.forEach(doc => {
        const data = doc.data()
        totalQuestions++
        if (data.isCorrect) correctCount++
        
        // นับ quiz sessions
        if (data.quizSession) {
          quizSessions.add(data.quizSession)
        }
      })

      setTotalQuizzes(quizSessions.size)
      setCorrectAnswers(correctCount)
      
      const avgScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
      setAverageScore(Math.round(avgScore))
      
      // ✅ คำนวณโอกาสสอบผ่าน ม.1
      calculateM1Chance(avgScore, totalQuestions, gradeLevel)
      
    } catch (error) {
      console.error('Error loading quiz stats:', error)
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
    
    // ปรับตามจำนวนข้อสอบที่ทำ (ยิ่งทำเยอะยิ่งแม่นยำ)
    if (totalQuestions >= 100) baseChance += 5
    else if (totalQuestions >= 50) baseChance += 3
    else if (totalQuestions >= 20) baseChance += 1
    else if (totalQuestions < 10) baseChance -= 10
    
    // ปรับตามระดับชั้น (ป.4 ยังมีเวลาพัฒนา)
    if (currentGrade === 4) baseChance += 10 // ยังมีเวลาเรียนอีก 2 ปี
    else if (currentGrade === 5) baseChance += 5 // เหลืออีก 1 ปี
    else if (currentGrade === 6) baseChance -= 0 // ต้องสอบเลย
    
    // จำกัดไว้ 0-100%
    const finalChance = Math.max(0, Math.min(100, baseChance))
    setM1ChancePercentage(Math.round(finalChance))
  }

  const handleSave = async () => {
    if (!userUid) return
    const userRef = doc(db, "users", userUid)
    await setDoc(userRef, {
      name: editingName,
      avatarUrl: editingAvatarUrl,
      gradeLevel: editingGradeLevel,
    }, { merge: true })
    setName(editingName)
    setAvatarUrl(editingAvatarUrl)
    setGradeLevel(editingGradeLevel)
    setIsEditing(false)
    
    // ✅ คำนวณโอกาสสอบผ่าน ม.1 ใหม่
    calculateM1Chance(averageScore, correctAnswers + (totalQuizzes * 10 - correctAnswers), editingGradeLevel)
  }

  const handleCancel = () => {
    setEditingName(name)
    setEditingAvatarUrl(avatarUrl)
    setEditingGradeLevel(gradeLevel)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center" style={{ color: theme.textColor }}>
          ⏳ กำลังโหลดโปรไฟล์...
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <div 
          className="rounded-xl shadow-lg p-6"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover shadow-lg" />
              ) : (
                <div 
                  className="w-24 h-24 rounded-full text-4xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
                👋 สวัสดี, {name}
              </h1>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div 
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                >
                  📚 ป.{gradeLevel}
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
                >
                  ⭐ {userPoints} แต้ม
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ 
                    backgroundColor: userStatus === 'online' ? '#10b981' : '#6b7280',
                    color: '#ffffff'
                  }}
                >
                  {userStatus === 'online' ? '🟢 ออนไลน์' : '⚫ ออฟไลน์'}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => {
                setEditingName(name)
                setEditingAvatarUrl(avatarUrl)
                setEditingGradeLevel(gradeLevel)
                setIsEditing(true)
              }}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
              style={{ backgroundColor: theme.textColor + '20', color: theme.textColor }}
            >
              ✏️ แก้ไขโปรไฟล์
            </button>
          </div>
        </div>

        {/* M.1 Chance Card */}
        <div 
          className="rounded-xl shadow-lg p-6 text-center"
          style={{ 
            background: `linear-gradient(135deg, ${m1ChancePercentage >= 70 ? '#10b981' : m1ChancePercentage >= 50 ? '#f59e0b' : '#ef4444'}20, ${m1ChancePercentage >= 70 ? '#059669' : m1ChancePercentage >= 50 ? '#d97706' : '#dc2626'}20)`,
            border: `2px solid ${m1ChancePercentage >= 70 ? '#10b981' : m1ChancePercentage >= 50 ? '#f59e0b' : '#ef4444'}`
          }}
        >
          <div className="text-6xl mb-4">
            {m1ChancePercentage >= 70 ? '🎯' : m1ChancePercentage >= 50 ? '💪' : '📚'}
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
            โอกาสสอบเข้า ม.1 ได้
          </h2>
          <div 
            className="text-7xl font-bold mb-4"
            style={{ 
              color: m1ChancePercentage >= 70 ? '#10b981' : 
                     m1ChancePercentage >= 50 ? '#f59e0b' : '#ef4444'
            }}
          >
            {m1ChancePercentage}%
          </div>
          <p className="text-lg" style={{ color: theme.textColor + '80' }}>
            {m1ChancePercentage >= 80 ? '🏆 ยอดเยี่ยม! พร้อมสอบเข้า ม.1 แล้ว!' :
             m1ChancePercentage >= 70 ? '👍 ดีมาก! อีกนิดเดียวก็พร้อมแล้ว' :
             m1ChancePercentage >= 50 ? '💪 กำลังดี! ลองทำข้อสอบเพิ่มเติมนะ' :
             '📚 ยังต้องฝึกฝนอีกหน่อย แต่อย่าท้อ!'}
          </p>
          {gradeLevel === 4 && (
            <p className="text-sm mt-2" style={{ color: theme.textColor + '60' }}>
              💡 เหลือเวลาอีก 2 ปีในการเตรียมตัว ยังทันเป็นเด็กเก่งได้!
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: theme.bgColor, border: `1px solid #3b82f620` }}
          >
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
              {userPoints}
            </div>
            <div style={{ color: theme.textColor + '70' }}>แต้มสะสม</div>
          </div>

          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: theme.bgColor, border: `1px solid #10b98120` }}
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="text-2xl font-bold" style={{ color: '#10b981' }}>
              {totalQuizzes}
            </div>
            <div style={{ color: theme.textColor + '70' }}>ชุดข้อสอบที่ทำ</div>
          </div>

          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: theme.bgColor, border: `1px solid #f59e0b20` }}
          >
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
              {correctAnswers}
            </div>
            <div style={{ color: theme.textColor + '70' }}>ข้อที่ตอบถูก</div>
          </div>

          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: theme.bgColor, border: `1px solid #8b5cf620` }}
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
              {averageScore}%
            </div>
            <div style={{ color: theme.textColor + '70' }}>คะแนนเฉลี่ย</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/quiz/v2/select')}
            className="p-4 rounded-lg font-medium transition-all hover:scale-105"
            style={{ backgroundColor: '#10b981', color: '#ffffff' }}
          >
            🚀 ทำข้อสอบเพิ่มแต้ม
          </button>
          <button
            onClick={() => router.push('/rewards')}
            className="p-4 rounded-lg font-medium transition-all hover:scale-105"
            style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
          >
            🎁 ดูของรางวัล
          </button>
          <button
            onClick={() => router.push('/analysis')}
            className="p-4 rounded-lg font-medium transition-all hover:scale-105"
            style={{ backgroundColor: '#8b5cf6', color: '#ffffff' }}
          >
            📈 ดูสถิติทั้งหมด
          </button>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div 
              className="rounded-xl p-6 max-w-md w-full"
              style={{ backgroundColor: theme.bgColor }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: theme.textColor }}>
                ✏️ แก้ไขโปรไฟล์
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                    ชื่อ
                  </label>
                  <input
                    className="w-full p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: theme.bgColor,
                      borderColor: theme.textColor + '30',
                      color: theme.textColor
                    }}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                    ชั้นเรียน
                  </label>
                  <select
                    className="w-full p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: theme.bgColor,
                      borderColor: theme.textColor + '30',
                      color: theme.textColor
                    }}
                    value={editingGradeLevel}
                    onChange={(e) => setEditingGradeLevel(parseInt(e.target.value))}
                  >
                    <option value={3}>ป.3</option>
                    <option value={4}>ป.4</option>
                    <option value={5}>ป.5</option>
                    <option value={6}>ป.6</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                    ลิงก์รูปโปรไฟล์ (URL)
                  </label>
                  <input
                    className="w-full p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: theme.bgColor,
                      borderColor: theme.textColor + '30',
                      color: theme.textColor
                    }}
                    value={editingAvatarUrl}
                    onChange={(e) => setEditingAvatarUrl(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                >
                  ✅ บันทึก
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: '#6b7280', color: '#ffffff' }}
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemedLayout>
  )
}
