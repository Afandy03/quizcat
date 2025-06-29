'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useUserTheme } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'

interface Question {
  id: string
  question: string
  choices: string[]
  correctIndex: number
  subject: string
  topic: string
  grade: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

interface Answer {
  questionId: string
  question: string
  selectedIndex: number
  correctIndex: number
  isCorrect: boolean
  confidenceLevel: 'guess' | 'uncertain' | 'confident' // ✅ ยังคงเป็น non-null ใน Answer
  timeSpent: number
  subject: string
  topic: string
  difficulty: string
}

export default function QuizV2PlayPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [confidenceLevel, setConfidenceLevel] = useState<'guess' | 'uncertain' | 'confident' | null>(null)
  const [timeStart, setTimeStart] = useState<number>(Date.now())
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ เพิ่มระบบแต้ม
  const [userPoints, setUserPoints] = useState(0)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [showPointsAnimation, setShowPointsAnimation] = useState(false)

  const theme = useUserTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      
      if (u) {
        // โหลดแต้มปัจจุบัน
        const userRef = doc(db, 'users', u.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setUserPoints(userSnap.data().points || 0)
        }
        localStorage.removeItem('quizcat-guest-mode')
      } else {
        const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
        if (!isGuestMode) {
          router.push('/login')
        }
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, 'questions'))
        let questionList = qSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Question, 'id'>),
        }))

        // Apply filters from URL params
        const subject = searchParams.get('subject')
        const topic = searchParams.get('topic')
        const grade = searchParams.get('grade')
        const count = parseInt(searchParams.get('count') || '10')

        if (subject) {
          questionList = questionList.filter(q => q.subject === subject)
        }
        if (topic) {
          questionList = questionList.filter(q => q.topic === topic)
        }
        if (grade) {
          questionList = questionList.filter(q => q.grade === parseInt(grade))
        }

        // Shuffle and limit questions
        const shuffled = questionList.sort(() => Math.random() - 0.5)
        const selectedQuestions = shuffled.slice(0, count)

        if (selectedQuestions.length === 0) {
          setError('ไม่พบข้อสอบที่ตรงกับเงื่อนไข')
          return
        }

        setQuestions(selectedQuestions)
        setQuestionStartTime(Date.now())
      } catch (e: any) {
        console.error(e)
        setError('โหลดข้อสอบล้มเหลว')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [searchParams])

  const handleAnswer = async () => {
    // ✅ เพิ่ม guard สำหรับ confidenceLevel
    if (selectedChoice === null || confidenceLevel === null || isSubmitting) return

    setIsSubmitting(true)
    const question = questions[currentIndex]
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
    const isCorrect = selectedChoice === question.correctIndex

    // ✅ คำนวณแต้มที่ได้รับ
    let pointsEarned = 0
    if (isCorrect && user) {
      // แต้มพื้นฐาน 1 แต้มต่อข้อ
      pointsEarned = 1
      
      // โบนัสตามความมั่นใจ
      if (confidenceLevel === 'confident') pointsEarned += 2 // รวม 3 แต้ม
      else if (confidenceLevel === 'uncertain') pointsEarned += 1 // รวม 2 แต้ม
      // 'guess' ได้ 1 แต้มเท่านั้น
      
      // โบนัสตามเวลา (ถ้าตอบเร็วกว่า 30 วินาที)
      if (timeSpent <= 30) pointsEarned += 1
      
      // อัพเดทแต้มในฐานข้อมูล
      const userRef = doc(db, 'users', user.uid)
      const newPoints = userPoints + pointsEarned
      await setDoc(userRef, { points: newPoints }, { merge: true })
      setUserPoints(newPoints)
      setEarnedPoints(pointsEarned)
      
      // แสดง animation แต้ม
      setShowPointsAnimation(true)
      setTimeout(() => setShowPointsAnimation(false), 2000)
    }

    const answer: Answer = {
      questionId: question.id,
      question: question.question,
      selectedIndex: selectedChoice,
      correctIndex: question.correctIndex,
      isCorrect,
      confidenceLevel,
      timeSpent,
      subject: question.subject || 'ไม่ระบุ',
      topic: question.topic || 'ไม่ระบุ',
      difficulty: question.difficulty || 'medium'
    }

    setAnswers(prev => [...prev, answer])

    // Save to database (only for logged-in users)
    if (user) {
      try {
        // ตรวจสอบและทำความสะอาดข้อมูลก่อนบันทึก
        const cleanAnswer = {
          ...answer,
          userId: user.uid,
          userEmail: user.email || '',
          timestamp: serverTimestamp(),
          quizSession: timeStart,
          pointsEarned, // ✅ เพิ่มการบันทึกแต้มที่ได้
          // ให้แน่ใจว่าไม่มีค่า undefined
          subject: answer.subject || 'ไม่ระบุ',
          topic: answer.topic || 'ไม่ระบุ',
          difficulty: answer.difficulty || 'medium',
          question: answer.question || '',
          questionId: answer.questionId || ''
        }
        
        await addDoc(collection(db, 'quiz_v2_answers'), cleanAnswer)
      } catch (e) {
        console.error('Error saving answer:', e)
      }
    }

    // Move to next question or show results
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
      setSelectedChoice(null)
      setConfidenceLevel(null) // ✅ เปลี่ยนเป็น null เพื่อบังคับให้เลือกใหม่
      setQuestionStartTime(Date.now())
    } else {
      setShowResult(true)
    }
    setIsSubmitting(false)
  }

  const calculateStats = () => {
    const totalQuestions = answers.length
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    
    // ✅ คำนวณแต้มรวมที่ได้รับ
    const totalPointsEarned = answers.reduce((sum, answer) => {
      if (!answer.isCorrect) return sum
      
      let points = 1 // แต้มพื้นฐาน
      if (answer.confidenceLevel === 'confident') points += 2
      else if (answer.confidenceLevel === 'uncertain') points += 1
      
      // โบนัสเวลา (สมมติเก็บเวลาไว้)
      if (answer.timeSpent <= 30) points += 1
      
      return sum + points
    }, 0)
    
    const bySubject = answers.reduce((acc, answer) => {
      if (!acc[answer.subject]) {
        acc[answer.subject] = { correct: 0, total: 0 }
      }
      acc[answer.subject].total++
      if (answer.isCorrect) acc[answer.subject].correct++
      return acc
    }, {} as Record<string, { correct: number; total: number }>)

    const byConfidence = answers.reduce((acc, answer) => {
      if (!acc[answer.confidenceLevel]) {
        acc[answer.confidenceLevel] = { correct: 0, total: 0 }
      }
      acc[answer.confidenceLevel].total++
      if (answer.isCorrect) acc[answer.confidenceLevel].correct++
      return acc
    }, {} as Record<string, { correct: number; total: number }>)

    const avgTime = totalQuestions > 0 ? 
      Math.round(answers.reduce((sum, a) => sum + a.timeSpent, 0) / totalQuestions) : 0

    return {
      percentage,
      correctAnswers,
      totalQuestions,
      totalPointsEarned,
      bySubject,
      byConfidence,
      avgTime,
      totalTime: Math.round((Date.now() - timeStart) / 1000)
    }
  }

  if (loading) {
    return (
      <ThemedLayout>
        <p className="p-6 text-center" style={{ color: theme.textColor }}>
          ⏳ กำลังโหลดข้อสอบ...
        </p>
      </ThemedLayout>
    )
  }

  if (error) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">
          <p style={{ color: '#ef4444' }} className="mb-4">❌ {error}</p>
          <button
            onClick={() => router.push('/quiz/v2/select')}
            className="px-4 py-2 rounded-lg hover:opacity-80"
            style={{ backgroundColor: theme.textColor, color: theme.bgColor }}
          >
            ← กลับไปเลือกข้อสอบใหม่
          </button>
        </div>
      </ThemedLayout>
    )
  }

  if (showResult) {
    const stats = calculateStats()
    
    return (
      <ThemedLayout>
        <main className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: theme.textColor }}
            >
              🎯 ผลการทำข้อสอบ V2
            </h1>
            <div 
              className="text-6xl font-bold mb-4"
              style={{ 
                color: stats.percentage >= 80 ? '#10b981' : 
                       stats.percentage >= 60 ? '#f59e0b' : '#ef4444'
              }}
            >
              {stats.percentage}%
            </div>
            <p style={{ color: theme.textColor + '80' }}>
              ตอบถูก {stats.correctAnswers} จาก {stats.totalQuestions} ข้อ
            </p>
            {/* ✅ แสดงแต้มที่ได้รับ */}
            {user && stats.totalPointsEarned > 0 && (
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4"
                style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
              >
                <span className="text-2xl">🎉</span>
                <span className="text-xl font-bold">+{stats.totalPointsEarned} แต้ม!</span>
              </div>
            )}
          </div>

          {/* Overall Stats */}
          <div 
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          >
            <div 
              className="p-4 rounded-lg text-center"
              style={{ backgroundColor: theme.textColor + '10', borderLeft: `4px solid #10b981` }}
            >
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>
                ⏱️ {stats.avgTime}s
              </div>
              <div style={{ color: theme.textColor + '80' }}>เวลาเฉลี่ยต่อข้อ</div>
            </div>
            <div 
              className="p-4 rounded-lg text-center"
              style={{ backgroundColor: theme.textColor + '10', borderLeft: `4px solid #3b82f6` }}
            >
              <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
                ⌛ {Math.floor(stats.totalTime / 60)}:{(stats.totalTime % 60).toString().padStart(2, '0')}
              </div>
              <div style={{ color: theme.textColor + '80' }}>เวลารวม</div>
            </div>
            <div 
              className="p-4 rounded-lg text-center"
              style={{ backgroundColor: theme.textColor + '10', borderLeft: `4px solid #8b5cf6` }}
            >
              <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
                {stats.percentage >= 80 ? '🏆' : stats.percentage >= 60 ? '👍' : '💪'}
              </div>
              <div style={{ color: theme.textColor + '80' }}>
                {stats.percentage >= 80 ? 'ยอดเยี่ยม!' : stats.percentage >= 60 ? 'ดีมาก!' : 'ต้องพัฒนา'}
              </div>
            </div>
            {/* ✅ เพิ่มการ์ดแต้ม */}
            <div 
              className="p-4 rounded-lg text-center"
              style={{ backgroundColor: theme.textColor + '10', borderLeft: `4px solid #f59e0b` }}
            >
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                ⭐ {stats.totalPointsEarned}
              </div>
              <div style={{ color: theme.textColor + '80' }}>แต้มที่ได้รับ</div>
            </div>
          </div>

          {/* By Subject Analysis */}
          <div 
            className="rounded-lg p-6"
            style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: theme.textColor }}>
              📊 วิเคราะห์ตามวิชา
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.bySubject).map(([subject, data]) => {
                const subjectPercentage = Math.round((data.correct / data.total) * 100)
                return (
                  <div key={subject} className="flex items-center justify-between">
                    <span style={{ color: theme.textColor }}>{subject}</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-32 h-2 rounded-full"
                        style={{ backgroundColor: theme.textColor + '20' }}
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${subjectPercentage}%`,
                            backgroundColor: subjectPercentage >= 80 ? '#10b981' : 
                                           subjectPercentage >= 60 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span 
                        className="font-bold"
                        style={{ 
                          color: subjectPercentage >= 80 ? '#10b981' : 
                                 subjectPercentage >= 60 ? '#f59e0b' : '#ef4444'
                        }}
                      >
                        {subjectPercentage}%
                      </span>
                      <span style={{ color: theme.textColor + '70' }}>
                        ({data.correct}/{data.total})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Confidence Analysis */}
          <div 
            className="rounded-lg p-6"
            style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: theme.textColor }}>
              🧠 วิเคราะห์ความมั่นใจ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byConfidence).map(([confidence, data]) => {
                const confPercentage = Math.round((data.correct / data.total) * 100)
                const labels = {
                  confident: { icon: '💪', label: 'มั่นใจ', color: '#10b981' },
                  uncertain: { icon: '🤔', label: 'ไม่แน่ใจ', color: '#f59e0b' },
                  guess: { icon: '🎲', label: 'เดา', color: '#ef4444' }
                }
                const label = labels[confidence as keyof typeof labels]
                
                return (
                  <div 
                    key={confidence}
                    className="p-4 rounded-lg text-center"
                    style={{ backgroundColor: theme.textColor + '05', border: `1px solid ${label.color}40` }}
                  >
                    <div className="text-2xl mb-2">{label.icon}</div>
                    <div className="font-bold" style={{ color: theme.textColor }}>
                      {label.label}
                    </div>
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: label.color }}
                    >
                      {confPercentage}%
                    </div>
                    <div style={{ color: theme.textColor + '70' }}>
                      ({data.correct}/{data.total} ข้อ)
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/quiz/v2/select')}
              className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
            >
              🔄 ทำข้อสอบใหม่
            </button>
            <button
              onClick={() => router.push('/analysis')}
              className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#8b5cf6', color: '#ffffff' }}
            >
              📈 ดูสถิติทั้งหมด
            </button>
            <button
              onClick={() => router.push('/dashboard')}
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

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex) / questions.length) * 100

  return (
    <ThemedLayout>
      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-between items-center mb-4">
            <h1 
              className="text-2xl font-bold"
              style={{ color: theme.textColor }}
            >
              🚀 ข้อสอบ V2
            </h1>
            {/* แสดงแต้มปัจจุบัน */}
            {user && (
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
              >
                <span className="text-lg">⭐</span>
                <span className="font-bold">{userPoints} แต้ม</span>
              </div>
            )}
          </div>
          
          <div 
            className="text-sm mb-4"
            style={{ color: theme.textColor + '80' }}
          >
            ข้อ {currentIndex + 1} จาก {questions.length}
          </div>
          
          {/* Progress Bar */}
          <div 
            className="w-full h-2 rounded-full mb-6"
            style={{ backgroundColor: theme.textColor + '20' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #10b981, #059669)'
              }}
            />
          </div>
        </div>

        {/* Points Animation */}
        {showPointsAnimation && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div 
              className="bg-yellow-400 text-white px-6 py-4 rounded-full text-xl font-bold animate-bounce shadow-lg"
              style={{ animation: 'bounce 1s infinite' }}
            >
              +{earnedPoints} แต้ม! 🎉
            </div>
          </div>
        )}

        {/* Question */}
        <div 
          className="rounded-lg p-6"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <div className="flex justify-between items-start mb-4">
            <div style={{ color: theme.textColor + '70' }} className="text-sm">
              📚 {currentQuestion.subject} | 📖 {currentQuestion.topic}
            </div>
            <div className="flex gap-2">
              <div 
                className="px-2 py-1 rounded text-xs"
                style={{ 
                  backgroundColor: currentQuestion.difficulty === 'easy' ? '#10b981' :
                                  currentQuestion.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                  color: '#ffffff'
                }}
              >
                {currentQuestion.difficulty === 'easy' ? '📗 ง่าย' :
                 currentQuestion.difficulty === 'medium' ? '📘 ปานกลาง' : '📕 ยาก'}
              </div>
              {/* แสดงแต้มที่จะได้รับ */}
              <div 
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
              >
                ⭐ 1-4 แต้ม
              </div>
            </div>
          </div>
          
          <h2 
            className="text-xl font-medium mb-6"
            style={{ color: theme.textColor }}
          >
            {currentQuestion.question}
          </h2>

          {/* Choices */}
          <div className="space-y-3">
            {currentQuestion.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => setSelectedChoice(index)}
                disabled={isSubmitting}
                className="w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  backgroundColor: selectedChoice === index ? theme.textColor + '10' : theme.bgColor,
                  borderColor: selectedChoice === index ? '#3b82f6' : theme.textColor + '30',
                  color: theme.textColor
                }}
              >
                <span className="font-medium mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                {choice}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Selector */}
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <h3 className="font-medium mb-3" style={{ color: theme.textColor }}>
            🧠 ระดับความมั่นใจในการตอบ:
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'confident', icon: '💪', label: 'มั่นใจ', color: '#10b981', points: '+3 แต้ม' },
              { value: 'uncertain', icon: '🤔', label: 'ไม่แน่ใจ', color: '#f59e0b', points: '+2 แต้ม' },
              { value: 'guess', icon: '🎲', label: 'เดา', color: '#ef4444', points: '+1 แต้ม' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setConfidenceLevel(option.value as any)}
                className="p-3 rounded-lg text-center transition-all duration-200 hover:scale-[1.05]"
                style={{
                  backgroundColor: confidenceLevel === option.value ? option.color + '20' : theme.textColor + '05',
                  border: `2px solid ${confidenceLevel === option.value ? option.color : theme.textColor + '30'}`,
                  color: confidenceLevel === option.value ? option.color : theme.textColor
                }}
              >
                <div className="text-xl mb-1">{option.icon}</div>
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs opacity-70">{option.points}</div>
              </button>
            ))}
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: theme.textColor + '60' }}>
            💡 ตอบเร็วภายใน 30 วินาที = โบนัส +1 แต้ม
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAnswer}
          disabled={selectedChoice === null || confidenceLevel === null || isSubmitting} // ✅ เพิ่ม confidenceLevel === null
          className="w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
          style={{
            background: selectedChoice !== null && confidenceLevel !== null // ✅ เพิ่มเงื่อนไข confidenceLevel
              ? 'linear-gradient(45deg, #10b981, #059669)' 
              : theme.textColor + '40',
            color: '#ffffff'
          }}
        >
          {isSubmitting ? 
            '⏳ กำลังบันทึก...' : 
            currentIndex + 1 === questions.length ? 
              '🏁 ส่งคำตอบและดูผล' : 
              '➡️ ข้อถัดไป'
          }
        </button>

        {/* Current Stats */}
        <div 
          className="text-center text-sm"
          style={{ color: theme.textColor + '70' }}
        >
          ⏱️ เวลาที่ใช้: {Math.round((Date.now() - questionStartTime) / 1000)} วินาที
        </div>
      </main>
    </ThemedLayout>
  )
}
