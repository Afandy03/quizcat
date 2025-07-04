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

// Child-friendly Bar Chart Component with emojis for subjects
const BarChart = ({ data, maxValue, theme }: { 
  data: { name: string; value: number; color: string }[], 
  maxValue: number, 
  theme: any 
}) => {
  // Function to get emoji for subject
  const getSubjectEmoji = (subjectName: string) => {
    const subject = subjectName.toLowerCase()
    if (subject.includes('คณิต')) return '🔢'
    if (subject.includes('วิทย')) return '🔬'
    if (subject.includes('ไทย')) return '📚'
    if (subject.includes('อังกฤษ') || subject.includes('english')) return '🌍'
    if (subject.includes('สังคม')) return '🏛️'
    if (subject.includes('ประวัติ')) return '📜'
    if (subject.includes('ภูมิ')) return '🗺️'
    if (subject.includes('ศิลป')) return '🎨'
    if (subject.includes('ดนตรี')) return '🎵'
    if (subject.includes('พละ')) return '⚽'
    return '📖'
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-102">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl">
              {getSubjectEmoji(item.name)}
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold" style={{ color: theme.textColor }}>
                {item.name}
              </div>
              <div className="text-sm text-gray-500">
                {item.value >= 80 ? '🌟 เยี่ยมมาก!' : 
                 item.value >= 70 ? '👍 ดีมาก!' : 
                 item.value >= 60 ? '😊 ดี!' : 
                 item.value >= 50 ? '💪 พอใช้!' : '📚 ต้องตั้งใจ!'}
              </div>
            </div>
            <div 
              className="text-2xl font-bold px-4 py-2 rounded-xl shadow-lg text-white"
              style={{ 
                backgroundColor: item.color
              }}
            >
              {item.value}%
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-100 rounded-full h-6 relative overflow-hidden shadow-inner">
            <div 
              className="h-full rounded-full transition-all duration-1000 flex items-center justify-center text-white font-bold text-sm shadow-lg"
              style={{ 
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color,
                background: `linear-gradient(45deg, ${item.color}, ${item.color}dd)`
              }}
            >
              {item.value >= 20 && (
                <span className="drop-shadow-md">
                  🎯 {item.value}%
                </span>
              )}
            </div>
          </div>
          
          {/* Fun rating stars */}
          <div className="flex justify-center mt-3 space-x-1">
            {[...Array(5)].map((_, starIndex) => (
              <span key={starIndex} className="text-lg">
                {starIndex < Math.floor(item.value / 20) ? '🌟' : '⭐'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Child-friendly Pie Chart Component with fun emojis
const PieChart = ({ data, theme }: { 
  data: { name: string; value: number; color: string }[], 
  theme: any 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0
  
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold" style={{ color: theme.textColor }}>
          🎯 ระดับความยาก
        </h3>
      </div>
      <div className="flex items-center justify-center gap-8">
        <div className="relative">
          <svg width="150" height="150" className="transform -rotate-90 drop-shadow-lg">
            <circle
              cx="75"
              cy="75"
              r="60"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="25"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const circumference = 2 * Math.PI * 60
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
              const strokeDashoffset = -(currentAngle / 100) * circumference
              currentAngle += percentage
              
              return (
                <circle
                  key={index}
                  cx="75"
                  cy="75"
                  r="60"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="25"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 hover:stroke-width-30"
                  style={{
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                  }}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-lg">
              <div className="text-2xl font-bold" style={{ color: theme.textColor }}>
                {total}
              </div>
              <div className="text-xs text-gray-500">
                ข้อ
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:shadow-md transition-all duration-300" style={{ backgroundColor: item.color + '10' }}>
              <div 
                className="w-6 h-6 rounded-full shadow-lg flex items-center justify-center"
                style={{ backgroundColor: item.color }}
              >
                <span className="text-white text-sm font-bold">
                  {item.name === 'ง่าย' ? '😊' : item.name === 'ปานกลาง' ? '🤔' : '😤'}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg" style={{ color: theme.textColor }}>
                  {item.name === 'ง่าย' ? '😊 ง่าย' : 
                   item.name === 'ปานกลาง' ? '🤔 ปานกลาง' : '😤 ยาก'}
                </div>
                <div className="text-sm text-gray-600">
                  {item.value} ข้อ ({Math.round((item.value / total) * 100)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Topic Performance Chart Component - แสดงผลงานแต่ละหัวข้อ
const TopicChart = ({ data, theme }: { 
  data: { name: string; value: number; total: number; color: string }[], 
  theme: any 
}) => {
  if (data.length === 0) return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg text-center">
      <div className="text-6xl mb-4">�</div>
      <div className="text-xl font-bold text-gray-600">ยังไม่มีข้อมูลหัวข้อพอสำหรับแสดงผล</div>
      <div className="text-gray-500 mt-2">ลองทำควิซอีกสักหน่อยนะ!</div>
    </div>
  )
  
  // ฟังก์ชันหา emoji สำหรับหัวข้อ
  const getTopicEmoji = (topicName: string) => {
    const topic = topicName.toLowerCase()
    if (topic.includes('คำศัพท์') || topic.includes('vocabulary')) return '📝'
    if (topic.includes('ไวยากรณ์') || topic.includes('grammar')) return '📖'
    if (topic.includes('การอ่าน') || topic.includes('reading')) return '👀'
    if (topic.includes('การฟัง') || topic.includes('listening')) return '👂'
    if (topic.includes('เลข') || topic.includes('number')) return '🔢'
    if (topic.includes('เศษส่วน') || topic.includes('fraction')) return '🍰'
    if (topic.includes('เรขาคณิต') || topic.includes('geometry')) return '📐'
    if (topic.includes('พีชคณิต') || topic.includes('algebra')) return '✖️'
    if (topic.includes('วิทยาศาสตร์') || topic.includes('science')) return '🔬'
    if (topic.includes('ประวัติศาสตร์') || topic.includes('history')) return '📜'
    if (topic.includes('ภูมิศาสตร์') || topic.includes('geography')) return '🗺️'
    if (topic.includes('ศิลปะ') || topic.includes('art')) return '🎨'
    return '📚'
  }
  
  // แปลงคะแนนเป็นระดับ
  const getGradeLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'A+', label: 'ยอดเยี่ยม', color: '#10b981', emoji: '🏆' }
    if (percentage >= 80) return { level: 'A', label: 'ดีเยี่ยม', color: '#059669', emoji: '🌟' }
    if (percentage >= 70) return { level: 'B+', label: 'ดีมาก', color: '#3b82f6', emoji: '👍' }
    if (percentage >= 60) return { level: 'B', label: 'ดี', color: '#f59e0b', emoji: '�' }
    if (percentage >= 50) return { level: 'C', label: 'พอใช้', color: '#f97316', emoji: '💪' }
    return { level: 'D', label: 'ต้องพัฒนา', color: '#ef4444', emoji: '📚' }
  }
  
  return (
    <div className="bg-gradient-to-br from-white to-indigo-50 p-8 rounded-2xl shadow-xl border-2 border-indigo-200">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📊</div>
        <h3 className="text-2xl font-bold" style={{ color: theme.textColor }}>
          🎯 ผลงานแต่ละหัวข้อ
        </h3>
        <p className="text-gray-600 mt-2">ดูว่าหัวข้อไหนที่คุณเก่งที่สุด!</p>
      </div>
      
      {/* Topic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {data.map((topic, index) => {
          const grade = getGradeLevel(topic.value)
          
          return (
            <div 
              key={index}
              className="bg-white p-6 rounded-xl shadow-lg border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              style={{ borderColor: grade.color + '40' }}
            >
              <div className="text-center">
                {/* Topic Icon & Emoji */}
                <div className="flex justify-center items-center gap-2 mb-3">
                  <div className="text-3xl">{getTopicEmoji(topic.name)}</div>
                  <div className="text-2xl">{grade.emoji}</div>
                </div>
                
                {/* Topic Name */}
                <div className="text-sm font-bold text-gray-700 mb-2 h-10 flex items-center justify-center">
                  {topic.name}
                </div>
                
                {/* Score Percentage */}
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{ color: grade.color }}
                >
                  {topic.value}%
                </div>
                
                {/* Grade Level */}
                <div 
                  className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-3"
                  style={{ backgroundColor: grade.color }}
                >
                  เกรด {grade.level}
                </div>
                
                {/* Progress Bar */}
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${topic.value}%`,
                      backgroundColor: grade.color
                    }}
                  />
                </div>
                
                {/* Question Count */}
                <div className="text-xs text-gray-500">
                  ทำไปแล้ว {topic.total} ข้อ
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Summary Statistics */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h4 className="text-xl font-bold mb-4 text-center" style={{ color: theme.textColor }}>
          📊 สรุปผลงานทุกหัวข้อ
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* หัวข้อที่เก่งที่สุด */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-sm text-gray-600">หัวข้อที่เก่งที่สุด</div>
            <div className="text-lg font-bold text-green-600">
              {data[0]?.name || '-'}
            </div>
            <div className="text-sm text-green-500">
              {data[0]?.value || 0}%
            </div>
          </div>
          
          {/* คะแนนเฉลี่ยทุกหัวข้อ */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-sm text-gray-600">คะแนนเฉลี่ย</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length) || 0}%
            </div>
          </div>
          
          {/* จำนวนหัวข้อที่ทำ */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-sm text-gray-600">จำนวนหัวข้อ</div>
            <div className="text-2xl font-bold text-purple-600">
              {data.length}
            </div>
          </div>
          
          {/* หัวข้อที่ต้องปรับปรุง */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl mb-1">💪</div>
            <div className="text-sm text-gray-600">ต้องปรับปรุง</div>
            <div className="text-lg font-bold text-orange-600">
              {data.filter(d => d.value < 70).length}
            </div>
            <div className="text-xs text-orange-500">หัวข้อ</div>
          </div>
        </div>
        
        {/* Top 3 และ Bottom 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Top 3 หัวข้อที่เก่งที่สุด */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h5 className="font-bold text-green-800 mb-3 text-center">🏆 หัวข้อที่เก่งที่สุด</h5>
            {data.slice(0, 3).map((topic, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getTopicEmoji(topic.name)}</span>
                  <span className="text-sm font-medium">{topic.name}</span>
                </div>
                <span className="font-bold text-green-600">{topic.value}%</span>
              </div>
            ))}
          </div>
          
          {/* หัวข้อที่ต้องฝึกฝน */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h5 className="font-bold text-orange-800 mb-3 text-center">💪 หัวข้อที่ต้องฝึกฝน</h5>
            {data.slice(-3).reverse().map((topic, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getTopicEmoji(topic.name)}</span>
                  <span className="text-sm font-medium">{topic.name}</span>
                </div>
                <span className="font-bold text-orange-600">{topic.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* คำแนะนำ */}
      <div className="mt-6 bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-xl">
        <div className="text-center">
          <div className="text-2xl mb-2">💡</div>
          <div className="font-bold text-gray-800 mb-2">คำแนะนำสำหรับคุณ</div>
          <div className="text-gray-700">
            {(() => {
              const avgScore = Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)
              const weakTopics = data.filter(d => d.value < 60).length
              
              if (avgScore >= 80) return '🏆 เก่งมากทุกหัวข้อ! ลองเพิ่มความยากของข้อสอบดู'
              if (weakTopics > 3) return '📚 มีหลายหัวข้อที่ต้องฝึกฝน ค่อยๆ ทำทีละหัวข้อนะ'
              if (weakTopics > 0) return `� มี ${weakTopics} หัวข้อที่ต้องปรับปรุง โฟกัสที่หัวข้อเหล่านี้ก่อน`
              return '🌟 ทำได้ดีทุกหัวข้อ! พยายามรักษาความสม่ำเสมอต่อไป'
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QuizV2AnalysisPage() {
  const [answers, setAnswers] = useState<QuizV2Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [timeToReset, setTimeToReset] = useState<string>('')
  const [currentCycle, setCCurrentCycle] = useState<number>(1)
  const { theme } = useUserTheme()

  // คำนวณวันรีเซ็ตถัดไป
  const getNextResetDate = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextReset = new Date(startOfMonth.getTime() + (30 * 24 * 60 * 60 * 1000))
    return nextReset
  }

  // คำนวณจำนวนวันและเวลาที่เหลือ
  const calculateTimeToReset = () => {
    const now = new Date()
    const nextReset = getNextResetDate()
    const timeDiff = nextReset.getTime() - now.getTime()
    
    if (timeDiff <= 0) return 'รีเซ็ตแล้ว'
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${days} วัน ${hours} ชั่วโมง ${minutes} นาที`
  }

  // อัปเดตเวลานับถอยหลังทุกนาที
  useEffect(() => {
    const updateTimer = () => {
      setTimeToReset(calculateTimeToReset())
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 60000) // อัปเดตทุกนาที
    
    return () => clearInterval(interval)
  }, [])

  // กรองข้อมูลเฉพาะ 30 วันล่าสุด
  const filterRecentAnswers = (answers: QuizV2Answer[]) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return answers.filter(answer => {
      const answerDate = answer.timestamp?.toDate?.() || new Date(0)
      return answerDate >= thirtyDaysAgo
    })
  }

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
      
      // คำนวณรอบปัจจุบัน (จำนวนรอบ 30 วันที่ผ่านมา)
      const oldestAnswer = answerData[answerData.length - 1]
      if (oldestAnswer?.timestamp) {
        const firstDate = oldestAnswer.timestamp.toDate()
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
        setCCurrentCycle(Math.floor(daysDiff / 30) + 1)
      }
    } catch (error) {
      console.error('Error loading answers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate real statistics from actual data
  const getStatistics = () => {
    if (answers.length === 0) return null

    // กรองเฉพาะข้อมูล 30 วันล่าสุด
    const recentAnswers = filterRecentAnswers(answers)
    
    if (recentAnswers.length === 0) return null

    const totalQuestions = recentAnswers.length
    const correctAnswers = recentAnswers.filter(a => a.isCorrect).length
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100)

    // Group by quiz sessions
    const sessionMap = new Map<number, QuizV2Answer[]>()
    recentAnswers.forEach(answer => {
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
    recentAnswers.forEach(answer => {
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
    recentAnswers.forEach(answer => {
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
    recentAnswers.forEach(answer => {
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

    // Topic analysis (แทนการแสดงตาม session)
    const topicStats = new Map<string, { correct: number; total: number }>()
    recentAnswers.forEach(answer => {
      const topic = answer.topic || 'ไม่ระบุหัวข้อ'
      if (!topicStats.has(topic)) {
        topicStats.set(topic, { correct: 0, total: 0 })
      }
      const stats = topicStats.get(topic)!
      stats.total++
      if (answer.isCorrect) stats.correct++
    })

    // สร้างข้อมูลหัวข้อเรียงตามคะแนน และเอาเฉพาะ 8 หัวข้อแรก
    const progressData = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        name: topic,
        value: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total,
        color: stats.correct / stats.total >= 0.8 ? '#10b981' : 
               stats.correct / stats.total >= 0.6 ? '#3b82f6' : 
               stats.correct / stats.total >= 0.4 ? '#f59e0b' : '#ef4444'
      }))
      .sort((a, b) => b.value - a.value) // เรียงจากคะแนนสูงสุด
      .slice(0, 8) // เอาเฉพาะ 8 หัวข้อแรก

    return {
      totalQuestions,
      correctAnswers, 
      accuracy,
      totalSessions: sessions.length,
      avgTimePerQuestion: Math.round(recentAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / totalQuestions),
      subjectData,
      difficultyData,
      confidenceData,
      topicData: progressData, // เปลี่ยนชื่อจาก progressData เป็น topicData
      recentSessions: sessions.slice(-5).reverse() // Last 5 sessions, newest first
    }
  }

  if (loading) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-6xl mb-4">⏳</div>
            <div 
              className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" 
              style={{ borderColor: theme.textColor }}
            />
            <p style={{ color: theme.textColor }} className="text-xl font-bold">กำลังโหลดข้อมูลสถิติ...</p>
            <p className="text-gray-500 mt-2">รอสักครู่นะ! 🌟</p>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  if (!user) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-8xl mb-6">🔐</div>
            <p style={{ color: theme.textColor }} className="text-2xl mb-6 font-bold">
              กรุณาเข้าสู่ระบบเพื่อดูสถิติ
            </p>
            <p className="text-gray-600 mb-8">เข้าสู่ระบบเพื่อดูผลการเรียนรู้ของคุณ!</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg"
              style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
            >
              🚀 เข้าสู่ระบบ
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
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-8xl mb-6">📊</div>
            <p style={{ color: theme.textColor }} className="text-2xl mb-6 font-bold">
              ยังไม่มีข้อมูลการทำข้อสอบ
            </p>
            <p className="text-gray-600 mb-8">ในรอบ 30 วันล่าสุด - มาเริ่มทำข้อสอบกัน!</p>
            <button
              onClick={() => window.location.href = '/quiz/v2/select'}
              className="px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg"
              style={{ backgroundColor: '#10b981', color: '#ffffff' }}
            >
              🚀 เริ่มทำข้อสอบ
            </button>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <main className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen" style={getBackgroundStyle(theme.bgColor)}>
        {/* Header with fun countdown */}
        <div className="text-center mb-8 p-8 rounded-2xl shadow-lg" style={{
          background: `linear-gradient(135deg, ${theme.textColor}10, ${theme.textColor}05)`,
          borderColor: theme.textColor + '20'
        }}>
          <div className="text-6xl mb-4">📊✨</div>
          <h1 
            className="text-4xl font-bold mb-4"
            style={{ color: theme.textColor }}
          >
            🌟 สถิติข้อสอบของฉัน 🌟
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            ข้อมูลสำหรับรอบ 30 วันล่าสุด (รอบที่ {currentCycle})
          </p>
          
          {/* Fun countdown timer */}
          <div className="p-4 rounded-xl shadow-md inline-block" style={{
            backgroundColor: theme.bgColor || '#ffffff',
            borderColor: theme.textColor + '20',
            border: '1px solid'
          }}>
            <div className="text-sm mb-2" style={{ color: theme.textColor + '80' }}>⏰ เวลาที่เหลือจนรีเซ็ตข้อมูล</div>
            <div 
              className="text-2xl font-bold"
              style={{ color: '#ff6b6b' }}
            >
              🚀 {timeToReset}
            </div>
          </div>
        </div>

        {/* Main Stats Cards - Super fun design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* Total Questions */}
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-6 rounded-2xl shadow-xl text-white text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-3xl font-bold mb-2">{stats.totalQuestions}</div>
            <div className="text-blue-100 font-medium">ข้อทั้งหมด</div>
            <div className="mt-2 text-xs rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#2563eb', fontWeight: 600 }}>
              ทำไปแล้ว! 🎯
            </div>
          </div>

          {/* Correct Answers */}
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-6 rounded-2xl shadow-xl text-white text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-3xl font-bold mb-2">{stats.correctAnswers}</div>
            <div className="text-green-100 font-medium">ตอบถูก</div>
            <div className="mt-2 text-xs rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#059669', fontWeight: 600 }}>
              เก่งมาก! 🌟
            </div>
          </div>

          {/* Total Sessions */}
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-6 rounded-2xl shadow-xl text-white text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-4xl mb-3">🎮</div>
            <div className="text-3xl font-bold mb-2">{stats.totalSessions}</div>
            <div className="text-purple-100 font-medium">จำนวนครั้ง</div>
            <div className="mt-2 text-xs rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#7c3aed', fontWeight: 600 }}>
              ขยันจัง! 💪
            </div>
          </div>

          {/* Average Time */}
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-6 rounded-2xl shadow-xl text-white text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-4xl mb-3">⏱️</div>
            <div className="text-3xl font-bold mb-2">{stats.avgTimePerQuestion}s</div>
            <div className="text-orange-100 font-medium">เวลาเฉลี่ย/ข้อ</div>
            <div className="mt-2 text-xs rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.7)', color: stats.avgTimePerQuestion <= 30 ? '#ea580c' : '#6366f1', fontWeight: 600 }}>
              {stats.avgTimePerQuestion <= 30 ? 'เร็วมาก! ⚡' : 'ใจเย็น 🧘'}
            </div>
          </div>
        </div>

        {/* Overall Accuracy - Big fun display */}
        <div className="p-8 rounded-2xl shadow-xl text-center mb-8" style={{
          background: `linear-gradient(135deg, ${theme.textColor}15, ${theme.textColor}08)`,
          borderColor: theme.textColor + '20',
          border: '2px solid'
        }}>
          <div className="text-6xl mb-4">
            {stats.accuracy >= 90 ? '🏆' : 
             stats.accuracy >= 80 ? '🌟' : 
             stats.accuracy >= 70 ? '👍' : 
             stats.accuracy >= 60 ? '💪' : '📚'}
          </div>
          <div className="text-5xl font-bold mb-2" style={{ color: theme.textColor }}>
            {stats.accuracy}%
          </div>
          <div className="text-xl font-medium mb-4" style={{ color: theme.textColor + 'CC' }}>
            คะแนนเฉลี่ยโดยรวม
          </div>
          <div className="text-lg" style={{ color: theme.textColor + 'AA' }}>
            {stats.accuracy >= 90 ? '🏆 ยอดเยี่ยมมาก! คุณเก่งสุดๆ!' : 
             stats.accuracy >= 80 ? '🌟 เก่งมาก! ทำได้ดีเยี่ยม!' : 
             stats.accuracy >= 70 ? '👍 ดีมาก! อีกนิดก็เก่งแล้ว!' : 
             stats.accuracy >= 60 ? '💪 ดีใจ! ค่อยๆ ฝึกฝนต่อไป!' : '📚 ไม่เป็นไร! ลองอ่านหนังสือเพิ่มนะ!'}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subject Performance */}
          {stats.subjectData.length > 0 && (
            <div className="rounded-2xl p-6 shadow-xl border-2" style={{
              ...getBackgroundStyle(theme.bgColor),
              borderColor: theme.textColor + '20'
            }}>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📚</div>
                <h3 className="text-2xl font-bold" style={{ color: theme.textColor }}>
                  🎯 ผลงานแต่ละวิชา
                </h3>
                <p className="mt-2" style={{ color: theme.textColor + '80' }}>ดูว่าวิชาไหนที่คุณเก่งที่สุด!</p>
              </div>
              <BarChart 
                data={stats.subjectData} 
                maxValue={100} 
                theme={theme} 
              />
            </div>
          )}

          {/* Question Difficulty Distribution */}
          {stats.difficultyData.length > 0 && (
            <div className="rounded-2xl p-6 shadow-xl border-2" style={{
              ...getBackgroundStyle(theme.bgColor),
              borderColor: theme.textColor + '20'
            }}>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">⭐</div>
                <h3 className="text-2xl font-bold" style={{ color: theme.textColor }}>
                  🌟 ระดับความยาก
                </h3>
                <p className="mt-2" style={{ color: theme.textColor + '80' }}>ดูว่าคุณชอบข้อสอบแบบไหน!</p>
              </div>
              <div className="flex justify-center">
                <PieChart data={stats.difficultyData} theme={theme} />
              </div>
            </div>
          )}
        </div>

        {/* Topic Performance Chart */}
        {stats.topicData.length > 1 && (
          <div className="rounded-2xl p-6 shadow-xl border-2" style={{
            ...getBackgroundStyle(theme.bgColor),
            borderColor: theme.textColor + '20'
          }}>
            <TopicChart data={stats.topicData} theme={theme} />
          </div>
        )}

        {/* Confidence Analysis - Fun Style */}
        {stats.confidenceData.length > 0 && (
          <div className="rounded-2xl p-6 shadow-xl border-2" style={{
            ...getBackgroundStyle(theme.bgColor),
            borderColor: theme.textColor + '20'
          }}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🧠</div>
              <h3 className="text-2xl font-bold" style={{ color: theme.textColor }}>
                💭 วิเคราะห์ความมั่นใจ
              </h3>
              <p className="mt-2" style={{ color: theme.textColor + '80' }}>ดูว่าคุณมั่นใจในคำตอบแค่ไหน!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.confidenceData.map((conf) => (
                <div 
                  key={conf.confidence}
                  className="bg-white text-center p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  style={{ 
                    border: `3px solid ${conf.color}40`
                  }}
                >
                  <div className="text-5xl mb-4">
                    {conf.confidence === 'confident' ? '😊' : 
                     conf.confidence === 'uncertain' ? '🤔' : '🎲'}
                  </div>
                  <h4 className="text-xl font-bold mb-3" style={{ color: theme.textColor }}>
                    {conf.confidence === 'confident' ? '🎯 มั่นใจ' : 
                     conf.confidence === 'uncertain' ? '🤔 ไม่แน่ใจ' : '🎲 เดา'}
                  </h4>
                  
                  {/* คะแนนความแม่นยำ */}
                  <div 
                    className="text-4xl font-bold mb-3"
                    style={{ color: conf.color }}
                  >
                    {conf.accuracy}%
                  </div>
                  
                  {/* จำนวนข้อ */}
                  <div className="p-3 rounded-lg mb-3" style={{ 
                    backgroundColor: theme.textColor + '10'
                  }}>
                    <div className="text-sm" style={{ color: theme.textColor + '80' }}>จำนวนข้อ</div>
                    <div className="text-lg font-bold" style={{ color: theme.textColor }}>
                      {conf.correct}/{conf.total} ข้อ
                    </div>
                  </div>
                  
                  {/* แถบแสดงผล */}
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${conf.accuracy}%`,
                        backgroundColor: conf.color
                      }}
                    />
                  </div>
                  
                  {/* ข้อความกำลังใจ */}
                  <div className="mt-3 text-sm" style={{ color: theme.textColor + '80' }}>
                    {conf.accuracy >= 80 ? '🌟 เก่งมาก!' : 
                     conf.accuracy >= 60 ? '👍 ดีแล้ว!' : '💪 ฝึกฝนต่อ!'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions - Fun Timeline Style */}
        {stats.recentSessions.length > 0 && (
          <div className="rounded-2xl p-6 shadow-xl border-2" style={{
            ...getBackgroundStyle(theme.bgColor),
            borderColor: theme.textColor + '20'
          }}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">📅</div>
              <h3 className="text-2xl font-bold" style={{ color: theme.textColor }}>
                🏆 ประวัติการทำข้อสอบ
              </h3>
              <p className="mt-2" style={{ color: theme.textColor + '80' }}>ดูผลการทำข้อสอบครั้งล่าสุดของคุณ!</p>
            </div>
            <div className="space-y-4">
              {stats.recentSessions.map((session, index) => (
                <div 
                  key={index}
                  className="bg-white flex items-center justify-between p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-102"
                  style={{ 
                    border: `2px solid ${
                      session.percentage >= 80 ? '#10b981' : 
                      session.percentage >= 60 ? '#f59e0b' : '#ef4444'
                    }40`
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Icon */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ 
                        backgroundColor: session.percentage >= 80 ? '#10b981' : 
                                        session.percentage >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    >
                      #{stats.recentSessions.length - index}
                    </div>
                    
                    {/* Session Info */}
                    <div>
                      <div className="font-bold text-lg" style={{ color: theme.textColor }}>
                        ครั้งที่ {stats.recentSessions.length - index}
                      </div>
                      <div className="text-sm" style={{ color: theme.textColor + '80' }}>
                        📅 {session.timestamp?.toDate?.()?.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric'
                        }) || 'ไม่ทราบวันที่'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Score and Stats */}
                  <div className="flex items-center gap-6">
                    {/* Score Badge */}
                    <div 
                      className="text-center p-3 rounded-xl text-white font-bold shadow-lg"
                      style={{ 
                        backgroundColor: session.percentage >= 80 ? '#10b981' : 
                                        session.percentage >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    >
                      <div className="text-2xl">{session.percentage}%</div>
                      <div className="text-xs">
                        {session.percentage >= 80 ? '🌟 เยี่ยม!' : 
                         session.percentage >= 60 ? '👍 ดี!' : '💪 ฝึกฝน!'}
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">✅</span>
                        <span className="font-bold" style={{ color: theme.textColor }}>
                          {session.correct}/{session.total} ข้อ
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⏱️</span>
                        <span className="text-sm" style={{ color: theme.textColor + '80' }}>
                          {session.avgTime}s/ข้อ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Fun Statistics */}
            <div className="mt-6 p-4 rounded-xl" style={{
              background: `linear-gradient(135deg, ${theme.textColor}15, ${theme.textColor}08)`
            }}>
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-bold mb-2" style={{ color: theme.textColor }}>สถิติสำหรับคุณ</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span style={{ color: theme.textColor + 'CC' }}>เฉลี่ยล่าสุด: </span>
                    <span className="font-bold text-blue-600">
                      {Math.round(stats.recentSessions.reduce((sum, s) => sum + s.percentage, 0) / stats.recentSessions.length)}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: theme.textColor + 'CC' }}>แนวโน้ม: </span>
                    <span className="font-bold text-green-600">
                      {stats.recentSessions[0]?.percentage >= stats.recentSessions[stats.recentSessions.length - 1]?.percentage ? '📈 ขาขึ้น!' : '📊 มั่นคง!'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fun Action Buttons */}
        <div className="p-8 rounded-2xl shadow-xl text-center" style={{
          background: `linear-gradient(135deg, ${theme.textColor}20, ${theme.textColor}10)`,
          borderColor: theme.textColor + '30',
          border: '2px solid'
        }}>
          <div className="text-5xl mb-4">🎮</div>
          <h3 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>พร้อมท้าทายตัวเองอีกไหม?</h3>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/quiz/v2/select'}
              className="bg-white text-gray-800 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              🚀 ทำข้อสอบ อีกครั้ง
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              🏠 กลับหน้าหลัก
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              🔄 รีเฟรชข้อมูล
            </button>
          </div>
          
          {/* Fun motivational text */}
          <div className="mt-6 text-lg" style={{ color: theme.textColor }}>
            ✨ ทุกครั้งที่ทำข้อสอบ คุณจะเก่งขึ้นเรื่อยๆ! ✨
          </div>
        </div>
      </main>
    </ThemedLayout>
  )
}
