'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useUserTheme, getBackgroundStyle } from '@/lib/useTheme'
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

// Simple Bar Chart Component
const BarChart = ({ data, maxValue, theme }: { 
  data: { name: string; value: number; color: string }[], 
  maxValue: number, 
  theme: any 
}) => (
  <div className="space-y-3">
    {data.map((item, index) => (
      <div key={index} className="flex items-center gap-3">
        <div className="w-20 text-sm" style={{ color: theme.textColor }}>
          {item.name}
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ 
              width: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color
            }}
          >
            <span className="text-white text-xs font-bold">
              {item.value}%
            </span>
          </div>
        </div>
      </div>
    ))}
  </div>
)

// Simple Pie Chart Component
const PieChart = ({ data, theme }: { 
  data: { name: string; value: number; color: string }[], 
  theme: any 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0
  
  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="120" height="120" className="transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={theme.textColor + '20'}
            strokeWidth="20"
          />
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100
            const strokeDasharray = `${percentage * 3.14} 314`
            const strokeDashoffset = -(currentAngle * 3.14)
            currentAngle += percentage
            
            return (
              <circle
                key={index}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: theme.textColor }}>
              {total}
            </div>
            <div className="text-xs" style={{ color: theme.textColor + '80' }}>
              ทั้งหมด
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm" style={{ color: theme.textColor }}>
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Line Chart Component for Progress Over Time
const LineChart = ({ data, theme }: { 
  data: { name: string; value: number }[], 
  theme: any 
}) => {
  if (data.length === 0) return null
  
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))  
  const range = maxValue - minValue || 1
  
  return (
    <div className="relative h-32 w-full">
      <svg width="100%" height="100%" className="absolute inset-0">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={`${100 - y}%`}
            x2="100%"
            y2={`${100 - y}%`}
            stroke={theme.textColor + '20'}
            strokeWidth="1"
          />
        ))}
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          points={data.map((point, index) => 
            `${(index / (data.length - 1)) * 100},${100 - ((point.value - minValue) / range) * 100}`
          ).join(' ')}
        />
        
        {/* Points */}
        {data.map((point, index) => (
          <circle
            key={index}
            cx={`${(index / (data.length - 1)) * 100}%`}
            cy={`${100 - ((point.value - minValue) / range) * 100}%`}
            r="4"
            fill="#10b981"
          />
        ))}
      </svg>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs" style={{ color: theme.textColor + '80' }}>
        <span>{maxValue}%</span>
        <span>{Math.round((maxValue + minValue) / 2)}%</span>
        <span>{minValue}%</span>
      </div>
    </div>
  )
}

export default function QuizV2AnalysisPage() {
  const [answers, setAnswers] = useState<QuizV2Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const { theme } = useUserTheme()

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
      setLoading(true)
      const q = query(
        collection(db, 'quiz_v2_answers'),
        where('userId', '==', userId)
      )
      const snapshot = await getDocs(q)
      let answerData = snapshot.docs.map(doc => doc.data() as QuizV2Answer)
      
      // Sort by timestamp (newest first)
      answerData = answerData.sort((a, b) => {
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

  // Calculate real statistics from actual data
  const getStatistics = () => {
    if (answers.length === 0) return null

    const totalQuestions = answers.length
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100)

    // Group by quiz sessions
    const sessionMap = new Map<number, QuizV2Answer[]>()
    answers.forEach(answer => {
      if (!sessionMap.has(answer.quizSession)) {
        sessionMap.set(answer.quizSession, [])
      }
      sessionMap.get(answer.quizSession)!.push(answer)
    })

    const sessions = Array.from(sessionMap.values()).map(sessionAnswers => {
      const correct = sessionAnswers.filter(a => a.isCorrect).length
      const total = sessionAnswers.length
      const percentage = Math.round((correct / total) * 100)
      const avgTime = Math.round(sessionAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / total)
      
      return {
        correct,
        total,
        percentage,
        avgTime,
        timestamp: sessionAnswers[0]?.timestamp
      }
    }).sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(0)
      const timeB = b.timestamp?.toDate?.() || new Date(0)
      return timeA.getTime() - timeB.getTime()
    })

    // Subject analysis
    const subjectStats = new Map<string, { correct: number; total: number }>()
    answers.forEach(answer => {
      const subject = answer.subject || 'ไม่ระบุ'
      if (!subjectStats.has(subject)) {
        subjectStats.set(subject, { correct: 0, total: 0 })
      }
      const stats = subjectStats.get(subject)!
      stats.total++
      if (answer.isCorrect) stats.correct++
    })

    const subjectData = Array.from(subjectStats.entries()).map(([subject, stats]) => ({
      name: subject,
      value: Math.round((stats.correct / stats.total) * 100),
      color: stats.correct / stats.total >= 0.8 ? '#10b981' : 
             stats.correct / stats.total >= 0.6 ? '#f59e0b' : '#ef4444'
    })).sort((a, b) => b.value - a.value)

    // Difficulty analysis
    const difficultyStats = new Map<string, { correct: number; total: number }>()
    answers.forEach(answer => {
      const difficulty = answer.difficulty || 'medium'
      if (!difficultyStats.has(difficulty)) {
        difficultyStats.set(difficulty, { correct: 0, total: 0 })
      }
      const stats = difficultyStats.get(difficulty)!
      stats.total++
      if (answer.isCorrect) stats.correct++
    })

    const difficultyLabels: Record<string, string> = {
      easy: 'ง่าย',
      medium: 'ปานกลาง', 
      hard: 'ยาก'
    }

    const difficultyData = Array.from(difficultyStats.entries()).map(([difficulty, stats]) => ({
      name: difficultyLabels[difficulty] || difficulty,
      value: stats.total,
      color: difficulty === 'easy' ? '#10b981' : 
             difficulty === 'medium' ? '#f59e0b' : '#ef4444'
    }))

    // Confidence analysis
    const confidenceStats = new Map<string, { correct: number; total: number }>()
    answers.forEach(answer => {
      const confidence = answer.confidenceLevel || 'uncertain'
      if (!confidenceStats.has(confidence)) {
        confidenceStats.set(confidence, { correct: 0, total: 0 })
      }
      const stats = confidenceStats.get(confidence)!
      stats.total++
      if (answer.isCorrect) stats.correct++
    })

    const confidenceLabels: Record<string, string> = {
      confident: 'มั่นใจ',
      uncertain: 'ไม่แน่ใจ',
      guess: 'เดา'
    }

    const confidenceData = Array.from(confidenceStats.entries()).map(([confidence, stats]) => ({
      confidence,
      label: confidenceLabels[confidence] || confidence,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total,
      color: confidence === 'confident' ? '#10b981' : 
             confidence === 'uncertain' ? '#f59e0b' : '#ef4444'
    }))

    // Progress over time (last 10 sessions)
    const progressData = sessions.slice(-10).map((session, index) => ({
      name: `ครั้งที่ ${index + 1}`,
      value: session.percentage
    }))

    return {
      totalQuestions,
      correctAnswers, 
      accuracy,
      totalSessions: sessions.length,
      avgTimePerQuestion: Math.round(answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / totalQuestions),
      subjectData,
      difficultyData,
      confidenceData,
      progressData,
      recentSessions: sessions.slice(-5).reverse() // Last 5 sessions, newest first
    }
  }

  if (loading) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
              style={{ borderColor: theme.textColor }}
            />
            <p style={{ color: theme.textColor }}>⏳ กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  if (!user) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <p style={{ color: theme.textColor }} className="text-xl mb-6">
              กรุณาเข้าสู่ระบบเพื่อดูสถิติ
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  const stats = getStatistics()

  if (!stats) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <p style={{ color: theme.textColor }} className="text-xl mb-6">
              ยังไม่มีข้อมูลการทำข้อสอบ V2
            </p>
            <button
              onClick={() => window.location.href = '/quiz/v2/select'}
              className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#10b981', color: '#ffffff' }}
            >
              🚀 เริ่มทำข้อสอบ V2
            </button>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            📈 สถิติข้อสอบ V2
          </h1>
          <p style={{ color: theme.textColor + '80' }}>
            วิเคราะห์ผลการเรียนรู้จากข้อมูลจริง
          </p>
        </div>

        {/* Overall Stats */}
        <div 
          className="rounded-xl p-6 shadow-lg"
          style={{ 
            ...getBackgroundStyle(theme.bgColor), 
            border: `1px solid ${theme.textColor}20` 
          }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
            🎯 สถิติโดยรวม
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ 
                  color: stats.accuracy >= 80 ? '#10b981' : 
                         stats.accuracy >= 60 ? '#f59e0b' : '#ef4444'
                }}
              >
                {stats.accuracy}%
              </div>
              <div style={{ color: theme.textColor + '80' }}>ความแม่นยำ</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: '#3b82f6' }}
              >
                {stats.totalQuestions}
              </div>
              <div style={{ color: theme.textColor + '80' }}>ข้อทั้งหมด</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: '#10b981' }}
              >
                {stats.correctAnswers}
              </div>
              <div style={{ color: theme.textColor + '80' }}>ตอบถูก</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: '#8b5cf6' }}
              >
                {stats.totalSessions}
              </div>
              <div style={{ color: theme.textColor + '80' }}>จำนวนครั้ง</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: '#f59e0b' }}
              >
                {stats.avgTimePerQuestion}s
              </div>
              <div style={{ color: theme.textColor + '80' }}>เวลาเฉลี่ย/ข้อ</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subject Performance */}
          {stats.subjectData.length > 0 && (
            <div 
              className="rounded-xl p-6 shadow-lg"
              style={{ 
                ...getBackgroundStyle(theme.bgColor), 
                border: `1px solid ${theme.textColor}20` 
              }}
            >
              <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
                � ผลงานแต่ละวิชา
              </h3>
              <BarChart 
                data={stats.subjectData} 
                maxValue={100} 
                theme={theme} 
              />
            </div>
          )}

          {/* Question Difficulty Distribution */}
          {stats.difficultyData.length > 0 && (
            <div 
              className="rounded-xl p-6 shadow-lg"
              style={{ 
                ...getBackgroundStyle(theme.bgColor), 
                border: `1px solid ${theme.textColor}20` 
              }}
            >
              <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
                ⭐ การกระจายระดับความยาก
              </h3>
              <div className="flex justify-center">
                <PieChart data={stats.difficultyData} theme={theme} />
              </div>
            </div>
          )}
        </div>

        {/* Progress Chart */}
        {stats.progressData.length > 1 && (
          <div 
            className="rounded-xl p-6 shadow-lg"
            style={{ 
              ...getBackgroundStyle(theme.bgColor), 
              border: `1px solid ${theme.textColor}20` 
            }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
              📈 ความก้าวหน้าตามเวลา
            </h3>
            <LineChart data={stats.progressData} theme={theme} />
          </div>
        )}

        {/* Confidence Analysis */}
        {stats.confidenceData.length > 0 && (
          <div 
            className="rounded-xl p-6 shadow-lg"
            style={{ 
              ...getBackgroundStyle(theme.bgColor), 
              border: `1px solid ${theme.textColor}20` 
            }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
              🧠 การวิเคราะห์ความมั่นใจ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.confidenceData.map((conf) => (
                <div 
                  key={conf.confidence}
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    backgroundColor: theme.textColor + '05',
                    border: `2px solid ${conf.color}40`
                  }}
                >
                  <div className="text-4xl mb-3">
                    {conf.confidence === 'confident' ? '💪' : 
                     conf.confidence === 'uncertain' ? '🤔' : '🎲'}
                  </div>
                  <h4 className="font-bold mb-2" style={{ color: theme.textColor }}>
                    {conf.label}
                  </h4>
                  <div 
                    className="text-3xl font-bold mb-2"
                    style={{ color: conf.color }}
                  >
                    {conf.accuracy}%
                  </div>
                  <div style={{ color: theme.textColor + '70' }}>
                    {conf.correct}/{conf.total} ข้อ
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {stats.recentSessions.length > 0 && (
          <div 
            className="rounded-xl p-6 shadow-lg"
            style={{ 
              ...getBackgroundStyle(theme.bgColor), 
              border: `1px solid ${theme.textColor}20` 
            }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: theme.textColor }}>
              📊 ประวัติการทำข้อสอบล่าสุด
            </h3>
            <div className="space-y-3">
              {stats.recentSessions.map((session, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: theme.textColor + '05' }}
                >
                  <div>
                    <span style={{ color: theme.textColor }}>
                      ครั้งที่ {stats.recentSessions.length - index}
                    </span>
                    <span 
                      className="ml-3 text-sm"
                      style={{ color: theme.textColor + '70' }}
                    >
                      {session.timestamp?.toDate?.()?.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short', 
                        day: 'numeric'
                      }) || 'ไม่ทราบวันที่'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span 
                      className="font-bold text-lg px-3 py-1 rounded-full"
                      style={{ 
                        backgroundColor: session.percentage >= 80 ? '#10b981' : 
                                        session.percentage >= 60 ? '#f59e0b' : '#ef4444',
                        color: '#ffffff'
                      }}
                    >
                      {session.percentage}%
                    </span>
                    <span style={{ color: theme.textColor + '70' }}>
                      {session.correct}/{session.total} ข้อ
                    </span>
                    <span style={{ color: theme.textColor + '70' }}>
                      ⏱️ {session.avgTime}s/ข้อ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/quiz/v2/select'}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity shadow-lg"
            style={{ backgroundColor: '#10b981', color: '#ffffff' }}
          >
            🚀 ทำข้อสอบ V2 อีกครั้ง
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity shadow-lg"
            style={{ backgroundColor: theme.textColor + '20', color: theme.textColor }}
          >
            🏠 กลับหน้าหลัก
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity shadow-lg"
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
          >
            🔄 รีเฟรชข้อมูล
          </button>
        </div>
      </main>
    </ThemedLayout>
  )
}
