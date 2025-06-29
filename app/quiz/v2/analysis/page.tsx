'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useUserTheme } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'

interface QuizV2Answer {
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
  userId: string
  timestamp: any
  quizSession: number
}

export default function QuizV2AnalysisPage() {
  const [answers, setAnswers] = useState<QuizV2Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const theme = useUserTheme()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        loadAnswers(u.uid)
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const loadAnswers = async (userId: string) => {
    try {
      // แยก query เพื่อหลีกเลี่ยงปัญหา composite index
      const q = query(
        collection(db, 'quiz_v2_answers'),
        where('userId', '==', userId)
      )
      const snapshot = await getDocs(q)
      let answerData = snapshot.docs.map(doc => doc.data() as QuizV2Answer)
      
      // เรียงข้อมูลใน client side แทน
      answerData = answerData.sort((a, b) => {
        // ตรวจสอบและจัดการ timestamp
        const timeA = a.timestamp?.toDate?.() || new Date(0)
        const timeB = b.timestamp?.toDate?.() || new Date(0)
        return timeB.getTime() - timeA.getTime()
      })
      
      setAnswers(answerData)
    } catch (error) {
      console.error('Error loading answers:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateOverallStats = () => {
    if (answers.length === 0) return null

    const totalQuestions = answers.length
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const overallPercentage = Math.round((correctAnswers / totalQuestions) * 100)

    // Group by quiz sessions
    const sessions = answers.reduce((acc, answer) => {
      if (!acc[answer.quizSession]) {
        acc[answer.quizSession] = []
      }
      acc[answer.quizSession].push(answer)
      return acc
    }, {} as Record<number, QuizV2Answer[]>)

    const sessionStats = Object.values(sessions).map(sessionAnswers => {
      const correct = sessionAnswers.filter(a => a.isCorrect).length
      const total = sessionAnswers.length
      const percentage = Math.round((correct / total) * 100)
      const avgTime = Math.round(sessionAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / total)
      
      return {
        correct,
        total,
        percentage,
        avgTime,
        timestamp: sessionAnswers[0].timestamp
      }
    })

    // Pass rate calculation
    const passingSessions = sessionStats.filter(s => s.percentage >= 60).length
    const passRate = Math.round((passingSessions / sessionStats.length) * 100)

    return {
      totalQuestions,
      correctAnswers,
      overallPercentage,
      totalSessions: sessionStats.length,
      passRate,
      avgTimePerQuestion: Math.round(answers.reduce((sum, a) => sum + a.timeSpent, 0) / totalQuestions),
      sessionStats: sessionStats.slice(0, 10) // Show last 10 sessions
    }
  }

  const calculateSubjectAnalysis = () => {
    const bySubject = answers.reduce((acc, answer) => {
      if (!acc[answer.subject]) {
        acc[answer.subject] = { correct: 0, total: 0, weakTopics: {} }
      }
      acc[answer.subject].total++
      if (answer.isCorrect) {
        acc[answer.subject].correct++
      } else {
        // Track weak topics
        if (!acc[answer.subject].weakTopics[answer.topic]) {
          acc[answer.subject].weakTopics[answer.topic] = { wrong: 0, total: 0 }
        }
        acc[answer.subject].weakTopics[answer.topic].wrong++
      }
      
      // Count total for topic
      if (!acc[answer.subject].weakTopics[answer.topic]) {
        acc[answer.subject].weakTopics[answer.topic] = { wrong: 0, total: 0 }
      }
      acc[answer.subject].weakTopics[answer.topic].total++
      
      return acc
    }, {} as Record<string, { correct: number; total: number; weakTopics: Record<string, { wrong: number; total: number }> }>)

    // Convert to array and calculate percentages
    return Object.entries(bySubject).map(([subject, data]) => {
      const percentage = Math.round((data.correct / data.total) * 100)
      
      // Find most problematic topics (highest error rate)
      const topicStats = Object.entries(data.weakTopics)
        .map(([topic, stats]) => ({
          topic,
          errorRate: Math.round((stats.wrong / stats.total) * 100),
          wrong: stats.wrong,
          total: stats.total
        }))
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 3)

      return {
        subject,
        percentage,
        correct: data.correct,
        total: data.total,
        weakestTopics: topicStats.filter(t => t.errorRate > 0)
      }
    }).sort((a, b) => a.percentage - b.percentage) // Sort by weakest first
  }

  const calculateConfidenceAnalysis = () => {
    const byConfidence = answers.reduce((acc, answer) => {
      if (!acc[answer.confidenceLevel]) {
        acc[answer.confidenceLevel] = { correct: 0, total: 0 }
      }
      acc[answer.confidenceLevel].total++
      if (answer.isCorrect) acc[answer.confidenceLevel].correct++
      return acc
    }, {} as Record<string, { correct: number; total: number }>)

    return Object.entries(byConfidence).map(([confidence, data]) => ({
      confidence,
      percentage: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total
    }))
  }

  if (loading) {
    return (
      <ThemedLayout>
        <p className="p-6 text-center" style={{ color: theme.textColor }}>
          ⏳ กำลังโหลดข้อมูล...
        </p>
      </ThemedLayout>
    )
  }

  if (!user) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">
          <p style={{ color: theme.textColor }} className="mb-4">
            🔐 กรุณาเข้าสู่ระบบเพื่อดูสถิติ
          </p>
        </div>
      </ThemedLayout>
    )
  }

  const overallStats = calculateOverallStats()
  const subjectAnalysis = calculateSubjectAnalysis()
  const confidenceAnalysis = calculateConfidenceAnalysis()

  if (!overallStats) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">
          <p style={{ color: theme.textColor }} className="mb-4">
            📊 ยังไม่มีข้อมูลการทำข้อสอบ V2
          </p>
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <main className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            📈 สถิติข้อสอบ V2
          </h1>
          <p style={{ color: theme.textColor + '80' }}>
            วิเคราะห์ผลการเรียนรู้และจุดที่ต้องพัฒนา
          </p>
        </div>

        {/* Overall Performance */}
        <div 
          className="rounded-lg p-6"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
            🎯 ผลงานโดยรวม
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ 
                  color: overallStats.overallPercentage >= 80 ? '#10b981' : 
                         overallStats.overallPercentage >= 60 ? '#f59e0b' : '#ef4444'
                }}
              >
                {overallStats.overallPercentage}%
              </div>
              <div style={{ color: theme.textColor + '80' }}>คะแนนเฉลี่ย</div>
              <div style={{ color: theme.textColor + '70' }} className="text-sm">
                {overallStats.correctAnswers}/{overallStats.totalQuestions} ข้อ
              </div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ 
                  color: overallStats.passRate >= 80 ? '#10b981' : 
                         overallStats.passRate >= 60 ? '#f59e0b' : '#ef4444'
                }}
              >
                {overallStats.passRate}%
              </div>
              <div style={{ color: theme.textColor + '80' }}>อัตราผ่าน</div>
              <div style={{ color: theme.textColor + '70' }} className="text-sm">
                (≥60% ถือว่าผ่าน)
              </div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: '#3b82f6' }}
              >
                {overallStats.totalSessions}
              </div>
              <div style={{ color: theme.textColor + '80' }}>ครั้งที่ทำ</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: '#8b5cf6' }}
              >
                {overallStats.avgTimePerQuestion}s
              </div>
              <div style={{ color: theme.textColor + '80' }}>เวลาเฉลี่ย/ข้อ</div>
            </div>
          </div>
        </div>

        {/* Subject Weakness Analysis */}
        <div 
          className="rounded-lg p-6"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
            📉 จุดอ่อนแต่ละวิชา
          </h2>
          <div className="space-y-4">
            {subjectAnalysis.map((subject, index) => (
              <div 
                key={subject.subject}
                className="border rounded-lg p-4"
                style={{ borderColor: theme.textColor + '20' }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-lg" style={{ color: theme.textColor }}>
                    {subject.subject}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div 
                      className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{ 
                        backgroundColor: subject.percentage >= 80 ? '#10b981' : 
                                        subject.percentage >= 60 ? '#f59e0b' : '#ef4444',
                        color: '#ffffff'
                      }}
                    >
                      {subject.percentage}%
                    </div>
                    <span style={{ color: theme.textColor + '70' }}>
                      ({subject.correct}/{subject.total})
                    </span>
                  </div>
                </div>
                
                {subject.weakestTopics.length > 0 && (
                  <div>
                    <h4 
                      className="font-medium mb-2 text-sm"
                      style={{ color: theme.textColor + '80' }}
                    >
                      🎯 หัวข้อที่ต้องปรับปรุง:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {subject.weakestTopics.map((topic, idx) => (
                        <div 
                          key={topic.topic}
                          className="px-3 py-2 rounded text-sm text-center"
                          style={{ 
                            backgroundColor: '#ef444410',
                            border: `1px solid #ef4444`,
                            color: '#ef4444'
                          }}
                        >
                          <div className="font-medium">{topic.topic}</div>
                          <div className="text-xs">ผิด {topic.errorRate}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Confidence vs Accuracy */}
        <div 
          className="rounded-lg p-6"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
            🧠 ความมั่นใจ vs ความถูกต้อง
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {confidenceAnalysis.map((conf) => {
              const labels = {
                confident: { icon: '💪', label: 'มั่นใจ', color: '#10b981' },
                uncertain: { icon: '🤔', label: 'ไม่แน่ใจ', color: '#f59e0b' },
                guess: { icon: '🎲', label: 'เดา', color: '#ef4444' }
              }
              const label = labels[conf.confidence as keyof typeof labels]
              
              return (
                <div 
                  key={conf.confidence}
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    backgroundColor: theme.textColor + '05',
                    border: `2px solid ${label.color}40`
                  }}
                >
                  <div className="text-4xl mb-3">{label.icon}</div>
                  <h3 className="font-bold mb-2" style={{ color: theme.textColor }}>
                    {label.label}
                  </h3>
                  <div 
                    className="text-3xl font-bold mb-2"
                    style={{ color: label.color }}
                  >
                    {conf.percentage}%
                  </div>
                  <div style={{ color: theme.textColor + '70' }}>
                    ถูก {conf.correct}/{conf.total} ข้อ
                  </div>
                  
                  {/* Analysis */}
                  <div 
                    className="mt-3 p-2 rounded text-xs"
                    style={{ backgroundColor: theme.textColor + '10' }}
                  >
                    {conf.confidence === 'confident' && conf.percentage < 80 && (
                      <span style={{ color: '#ef4444' }}>
                        ⚠️ มั่นใจเกินไป ควรระวัง
                      </span>
                    )}
                    {conf.confidence === 'guess' && conf.percentage > 60 && (
                      <span style={{ color: '#10b981' }}>
                        🍀 เดาเก่ง! ลองเชื่อใจตัวเองมากขึ้น
                      </span>
                    )}
                    {conf.confidence === 'uncertain' && conf.percentage > 70 && (
                      <span style={{ color: '#10b981' }}>
                        💡 ความรู้ดีแล้ว เพิ่มความมั่นใจ
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Sessions */}
        <div 
          className="rounded-lg p-6"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
            📊 ประวัติการทำข้อสอบล่าสุด
          </h2>
          <div className="space-y-3">
            {overallStats.sessionStats.map((session, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: theme.textColor + '05' }}
              >
                <div>
                  <span style={{ color: theme.textColor }}>
                    ครั้งที่ {overallStats.sessionStats.length - index}
                  </span>
                  <span 
                    className="ml-3 text-sm"
                    style={{ color: theme.textColor + '70' }}
                  >
                    {session.timestamp?.toDate?.()?.toLocaleDateString('th-TH') || 'ไม่ทราบวันที่'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span 
                    className="font-bold"
                    style={{ 
                      color: session.percentage >= 80 ? '#10b981' : 
                             session.percentage >= 60 ? '#f59e0b' : '#ef4444'
                    }}
                  >
                    {session.percentage}%
                  </span>
                  <span style={{ color: theme.textColor + '70' }}>
                    ({session.correct}/{session.total})
                  </span>
                  <span style={{ color: theme.textColor + '70' }}>
                    ⏱️ {session.avgTime}s/ข้อ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/quiz/v2/select'}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#10b981', color: '#ffffff' }}
          >
            🚀 ทำข้อสอบ V2 อีกครั้ง
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: theme.textColor + '20', color: theme.textColor }}
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>
      </main>
    </ThemedLayout>
  )
}
