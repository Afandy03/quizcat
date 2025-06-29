// app/analysis/page.tsx
'use client'

import ThemedLayout from "@/components/ThemedLayout"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { useUserTheme } from "@/lib/useTheme"

interface AnswerV2 {
  id: string
  questionId: string
  question: string
  selectedIndex: number
  correctIndex: number
  isCorrect: boolean
  confidenceLevel: 'guess' | 'uncertain' | 'confident'
  timeSpent: number
  subject: string
  topic: string
  difficulty: string
  pointsEarned?: number
  timestamp: any
  quizSession: number
}

interface SubjectStats {
  subject: string
  total: number
  correct: number
  percentage: number
  avgTime: number
  totalPoints: number
}

interface ConfidenceStats {
  level: 'guess' | 'uncertain' | 'confident'
  total: number
  correct: number
  percentage: number
  icon: string
  label: string
  color: string
}

export default function AnalysisPage() {
  const [user, setUser] = useState<any>(null)
  const [answers, setAnswers] = useState<AnswerV2[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    totalPoints: 0,
    averageScore: 0,
    averageTime: 0,
    totalQuizSessions: 0,
    recentDays: 7
  })
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([])
  const [confidenceStats, setConfidenceStats] = useState<ConfidenceStats[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const theme = useUserTheme()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
        if (!isGuestMode) {
          router.push('/login')
        } else {
          setLoading(false)
        }
        return
      }
      
      setUser(u)
      await loadAnalysisData(u.uid)
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [router])

  const loadAnalysisData = async (userId: string) => {
    try {
      // โหลดข้อมูลจาก quiz_v2_answers
      const q = query(
        collection(db, 'quiz_v2_answers'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const answersData: AnswerV2[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AnswerV2))
      
      setAnswers(answersData)
      calculateStats(answersData)
      
    } catch (error) {
      console.error('Error loading analysis data:', error)
    }
  }

  const calculateStats = (answersData: AnswerV2[]) => {
    if (answersData.length === 0) return

    const totalQuestions = answersData.length
    const correctAnswers = answersData.filter(a => a.isCorrect).length
    const totalPoints = answersData.reduce((sum, a) => sum + (a.pointsEarned || 0), 0)
    const averageScore = (correctAnswers / totalQuestions) * 100
    const averageTime = answersData.reduce((sum, a) => sum + a.timeSpent, 0) / totalQuestions
    const quizSessions = new Set(answersData.map(a => a.quizSession)).size

    setStats({
      totalQuestions,
      correctAnswers,
      totalPoints,
      averageScore,
      averageTime,
      totalQuizSessions: quizSessions,
      recentDays: 7
    })

    // คำนวณสถิติตามวิชา
    const subjectMap = new Map<string, { total: number; correct: number; totalTime: number; totalPoints: number }>()
    
    answersData.forEach(answer => {
      const subject = answer.subject || 'ไม่ระบุ'
      const current = subjectMap.get(subject) || { total: 0, correct: 0, totalTime: 0, totalPoints: 0 }
      
      current.total++
      if (answer.isCorrect) current.correct++
      current.totalTime += answer.timeSpent
      current.totalPoints += answer.pointsEarned || 0
      
      subjectMap.set(subject, current)
    })

    const subjectStatsData: SubjectStats[] = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      total: data.total,
      correct: data.correct,
      percentage: (data.correct / data.total) * 100,
      avgTime: data.totalTime / data.total,
      totalPoints: data.totalPoints
    })).sort((a, b) => b.percentage - a.percentage)

    setSubjectStats(subjectStatsData)

    // คำนวณสถิติตามความมั่นใจ
    const confidenceMap = new Map<string, { total: number; correct: number }>()
    
    answersData.forEach(answer => {
      const level = answer.confidenceLevel
      const current = confidenceMap.get(level) || { total: 0, correct: 0 }
      
      current.total++
      if (answer.isCorrect) current.correct++
      
      confidenceMap.set(level, current)
    })

    const confidenceData: ConfidenceStats[] = [
      { level: 'confident' as const, icon: '💪', label: 'มั่นใจ', color: '#10b981' },
      { level: 'uncertain' as const, icon: '🤔', label: 'ไม่แน่ใจ', color: '#f59e0b' },
      { level: 'guess' as const, icon: '🎲', label: 'เดา', color: '#ef4444' }
    ].map(item => {
      const data = confidenceMap.get(item.level) || { total: 0, correct: 0 }
      return {
        ...item,
        total: data.total,
        correct: data.correct,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0
      }
    })

    setConfidenceStats(confidenceData)
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)} วินาที`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} นาที`
  }

  const toggleExpand = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center" style={{ color: theme.textColor }}>
          ⏳ กำลังโหลดข้อมูลวิเคราะห์...
        </div>
      </ThemedLayout>
    )
  }

  if (!user) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center" style={{ color: theme.textColor }}>
          🎭 โหมดผู้เยี่ยมชม - ไม่สามารถดูสถิติได้
          <br />
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ backgroundColor: theme.textColor, color: theme.bgColor }}
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 
          className="text-4xl font-bold text-center mb-8"
          style={{ color: theme.textColor }}
        >
          📊 วิเคราะห์ผลการเรียน V2
        </h1>

        {answers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: theme.textColor }}>
              ยังไม่มีข้อมูลให้วิเคราะห์
            </h2>
            <p className="mb-6" style={{ color: theme.textColor + '80' }}>
              เริ่มทำข้อสอบ V2 เพื่อดูสถิติการเรียนของคุณ
            </p>
            <button
              onClick={() => router.push('/quiz/v2/select')}
              className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
              style={{ backgroundColor: '#10b981', color: '#ffffff' }}
            >
              🚀 เริ่มทำข้อสอบ V2
            </button>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div 
                className="p-6 rounded-xl text-center"
                style={{ backgroundColor: theme.bgColor, border: `1px solid #10b98120` }}
              >
                <div className="text-4xl mb-2">📝</div>
                <div className="text-3xl font-bold" style={{ color: '#10b981' }}>
                  {stats.totalQuestions}
                </div>
                <div style={{ color: theme.textColor + '70' }}>ข้อที่ทำทั้งหมด</div>
              </div>

              <div 
                className="p-6 rounded-xl text-center"
                style={{ backgroundColor: theme.bgColor, border: `1px solid #3b82f620` }}
              >
                <div className="text-4xl mb-2">🎯</div>
                <div className="text-3xl font-bold" style={{ color: '#3b82f6' }}>
                  {Math.round(stats.averageScore)}%
                </div>
                <div style={{ color: theme.textColor + '70' }}>คะแนนเฉลี่ย</div>
              </div>

              <div 
                className="p-6 rounded-xl text-center"
                style={{ backgroundColor: theme.bgColor, border: `1px solid #f59e0b20` }}
              >
                <div className="text-4xl mb-2">⭐</div>
                <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
                  {stats.totalPoints}
                </div>
                <div style={{ color: theme.textColor + '70' }}>แต้มรวม</div>
              </div>

              <div 
                className="p-6 rounded-xl text-center"
                style={{ backgroundColor: theme.bgColor, border: `1px solid #8b5cf620` }}
              >
                <div className="text-4xl mb-2">⏱️</div>
                <div className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>
                  {Math.round(stats.averageTime)}s
                </div>
                <div style={{ color: theme.textColor + '70' }}>เวลาเฉลี่ยต่อข้อ</div>
              </div>
            </div>

            {/* Summary Card */}
            <div 
              className="rounded-xl p-6"
              style={{ 
                background: `linear-gradient(135deg, ${stats.averageScore >= 80 ? '#10b981' : stats.averageScore >= 60 ? '#f59e0b' : '#ef4444'}20, ${stats.averageScore >= 80 ? '#059669' : stats.averageScore >= 60 ? '#d97706' : '#dc2626'}20)`,
                border: `1px solid ${stats.averageScore >= 80 ? '#10b981' : stats.averageScore >= 60 ? '#f59e0b' : '#ef4444'}40`
              }}
            >
              <h2 className="text-2xl font-bold mb-4" style={{ color: theme.textColor }}>
                📈 สรุปผลการเรียน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-2" style={{ color: theme.textColor }}>
                    ✅ ตอบถูก <strong>{stats.correctAnswers}</strong> จาก <strong>{stats.totalQuestions}</strong> ข้อ
                  </p>
                  <p className="mb-2" style={{ color: theme.textColor }}>
                    📊 ทำข้อสอบไปแล้ว <strong>{stats.totalQuizSessions}</strong> ชุด
                  </p>
                </div>
                <div>
                  <p className="mb-2" style={{ color: theme.textColor }}>
                    ⏱️ เวลาเฉลี่ยต่อข้อ: <strong>{formatTime(stats.averageTime)}</strong>
                  </p>
                  <p style={{ color: theme.textColor }}>
                    💰 แต้มรวมที่ได้รับ: <strong>{stats.totalPoints}</strong> แต้ม
                  </p>
                </div>
              </div>
            </div>

            {/* Subject Analysis */}
            <div 
              className="rounded-xl p-6"
              style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
                📚 วิเคราะห์ตามวิชา
              </h2>
              <div className="space-y-4">
                {subjectStats.map((subject, index) => (
                  <div key={subject.subject} className="flex items-center justify-between p-4 rounded-lg"
                       style={{ backgroundColor: theme.textColor + '05' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold" style={{ color: theme.textColor }}>
                          {index + 1}. {subject.subject}
                        </span>
                        <span className="text-sm" style={{ color: theme.textColor + '60' }}>
                          ({subject.total} ข้อ)
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span style={{ color: theme.textColor + '80' }}>
                          ⏱️ {formatTime(subject.avgTime)}
                        </span>
                        <span style={{ color: theme.textColor + '80' }}>
                          ⭐ {subject.totalPoints} แต้ม
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-1" 
                           style={{ 
                             color: subject.percentage >= 80 ? '#10b981' : 
                                    subject.percentage >= 60 ? '#f59e0b' : '#ef4444'
                           }}>
                        {Math.round(subject.percentage)}%
                      </div>
                      <div className="text-xs" style={{ color: theme.textColor + '60' }}>
                        {subject.correct}/{subject.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Analysis */}
            <div 
              className="rounded-xl p-6"
              style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
                🧠 วิเคราะห์ความมั่นใจ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {confidenceStats.map((conf) => (
                  <div key={conf.level} 
                       className="p-6 rounded-lg text-center"
                       style={{ backgroundColor: theme.textColor + '05', border: `2px solid ${conf.color}40` }}>
                    <div className="text-4xl mb-3">{conf.icon}</div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: theme.textColor }}>
                      {conf.label}
                    </h3>
                    <div className="text-3xl font-bold mb-2" style={{ color: conf.color }}>
                      {Math.round(conf.percentage)}%
                    </div>
                    <div className="text-sm" style={{ color: theme.textColor + '70' }}>
                      ถูก {conf.correct} จาก {conf.total} ข้อ
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/quiz/v2/select')}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
                style={{ backgroundColor: '#10b981', color: '#ffffff' }}
              >
                🚀 ทำข้อสอบเพิ่ม
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
              >
                👤 ดูโปรไฟล์
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
                style={{ backgroundColor: theme.textColor + '20', color: theme.textColor }}
              >
                🏠 กลับหน้าหลัก
              </button>
            </div>
          </>
        )}
      </div>
    </ThemedLayout>
  )
}
