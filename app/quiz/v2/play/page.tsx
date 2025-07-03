'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useUserTheme, getBackgroundStyle } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'
import ChatBot from '@/components/ChatBot'

interface Question {
  id: string
  question: string
  choices: string[]
  correctIndex: number
  subject: string
  topic: string
  grade: string | number  // รองรับทั้ง string และ number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

interface Answer {
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
}

export default function QuizV2PlayPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [confidenceLevel, setConfidenceLevel] = useState<'guess' | 'uncertain' | 'confident' | null>(null)
  const [timeStart, setTimeStart] = useState<number>(Date.now())
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [elapsedTime, setElapsedTime] = useState<number>(0); // เพิ่ม state สำหรับเวลาข้อปัจจุบัน
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChatBot, setShowChatBot] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)

  const { theme, isLoading } = useUserTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  // อัปเดต elapsedTime แบบเรียลไทม์
  useEffect(() => {
    setElapsedTime(Math.round((Date.now() - questionStartTime) / 1000));
    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - questionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [questionStartTime]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      
      if (!u) {
        router.push('/login')
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
          questionList = questionList.filter(q => {
            // เปรียบเทียบแบบตรงไปตรงมาก่อน (สำหรับข้อความ)
            if (q.grade === grade) {
              return true;
            }

            // ถ้าไม่ตรงกัน ลองแปลงเป็นตัวเลขเปรียบเทียบ (สำหรับตัวเลข)
            let questionGradeNum = -1;
            let selectedGradeNum = -1;

            // แปลงค่า grade ของข้อสอบ
            if (typeof q.grade === 'number') {
              questionGradeNum = q.grade;
            } else if (typeof q.grade === 'string') {
              const num = parseInt(q.grade.replace('ป.', ''));
              if (!isNaN(num)) {
                questionGradeNum = num;
              }
            }

            // แปลงค่า grade ที่เลือก
            if (typeof grade === 'string') {
              const num = parseInt(grade.replace('ป.', ''));
              if (!isNaN(num)) {
                selectedGradeNum = num;
              }
            } else if (typeof grade === 'number') {
              selectedGradeNum = grade;
            }

            // เปรียบเทียบตัวเลข (ถ้าแปลงได้)
            return questionGradeNum !== -1 && selectedGradeNum !== -1 && questionGradeNum === selectedGradeNum;
          })
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
    if (selectedChoice === null || confidenceLevel === null || isSubmitting) return

    setIsSubmitting(true)
    const question = questions[currentIndex]
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
    const isCorrect = selectedChoice === question.correctIndex

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
      setConfidenceLevel(null)
      setQuestionStartTime(Date.now())
    } else {
      // Quiz completed - calculate and award points
      await awardPoints()
      setShowResult(true)
    }
    setIsSubmitting(false)
  }

  const awardPoints = async () => {
    if (!user) return // ไม่ให้แต้มถ้าไม่ได้ล็อกอิน
    
    try {
      const allAnswers = [...answers, {
        questionId: questions[currentIndex].id,
        question: questions[currentIndex].question,
        selectedIndex: selectedChoice!,
        correctIndex: questions[currentIndex].correctIndex,
        isCorrect: selectedChoice === questions[currentIndex].correctIndex,
        confidenceLevel: confidenceLevel!,
        timeSpent: Math.round((Date.now() - questionStartTime) / 1000),
        subject: questions[currentIndex].subject || 'ไม่ระบุ',
        topic: questions[currentIndex].topic || 'ไม่ระบุ',
        difficulty: questions[currentIndex].difficulty || 'medium'
      }]
      
      const correctAnswers = allAnswers.filter(a => a.isCorrect).length
      const totalQuestions = allAnswers.length
      const percentage = Math.round((correctAnswers / totalQuestions) * 100)
      
      // คำนวณแต้มที่ได้รับ
      let pointsEarned = 0
      
      // แต้มพื้นฐานตามจำนวนข้อที่ถูก (ลดลง)
      pointsEarned += correctAnswers * 1
      
      // โบนัสตามเปอร์เซ็นต์ (ลดลงและเพิ่มเงื่อนไข)
      if (percentage >= 95) {
        pointsEarned += 15 // โบนัสสำหรับคะแนนเกือบเต็ม (ลดจาก 20)
      } else if (percentage >= 85) {
        pointsEarned += 10 // โบนัสสำหรับคะแนนดี (ลดจาก 15)
      } else if (percentage >= 75) {
        pointsEarned += 6 // โบนัสสำหรับผ่านเกณฑ์ (ลดจาก 10)
      } else if (percentage >= 65) {
        pointsEarned += 3 // โบนัสเล็กน้อย (ลดจาก 5)
      }
      
      // โบนัสตามความยาก (ลดลง)
      allAnswers.forEach(answer => {
        if (answer.isCorrect) {
          if (answer.difficulty === 'hard') {
            pointsEarned += 2 // ลดจาก 3
          } else if (answer.difficulty === 'medium') {
            pointsEarned += 1 // ลดจาก 2
          }
          // ไม่ให้โบนัสสำหรับ easy แล้ว
        }
      })
      
      // โบนัสตามความมั่นใจ (เหมือนเดิม แต่ต้องตอบถูกอย่างน้อย 70%)
      const confidentCorrect = allAnswers.filter(a => a.isCorrect && a.confidenceLevel === 'confident').length
      if (percentage >= 70) {
        pointsEarned += Math.floor(confidentCorrect * 0.5) // ลดจาก 1 เป็น 0.5 และปัดลง
      }
      
      // เพิ่มเงื่อนไข: ต้องทำได้อย่างน้อย 50% ถึงจะได้แต้ม
      if (percentage < 50) {
        pointsEarned = 0
      }
      
      // อัปเดตแต้มในฐานข้อมูล
      if (pointsEarned > 0) {
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          points: increment(pointsEarned)
        })
        
        // บันทึกประวัติการได้แต้ม
        await addDoc(collection(db, 'point_history'), {
          userId: user.uid,
          userEmail: user.email || '',
          points: pointsEarned,
          reason: 'quiz_completion',
          quizDetails: {
            totalQuestions,
            correctAnswers,
            percentage,
            subjects: [...new Set(allAnswers.map(a => a.subject))],
            difficulties: [...new Set(allAnswers.map(a => a.difficulty))]
          },
          timestamp: serverTimestamp(),
          quizSession: timeStart
        })
        
        console.log(`ได้แต้ม: ${pointsEarned} แต้ม`)
        setPointsEarned(pointsEarned) // เก็บแต้มที่ได้รับเพื่อแสดงผล
      }
      
    } catch (error) {
      console.error('Error awarding points:', error)
    }
  }

  const calculateStats = () => {
    const totalQuestions = answers.length
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    
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
      bySubject,
      byConfidence,
      avgTime,
      totalTime: Math.round((Date.now() - timeStart) / 1000)
    }
  }

  if (loading || isLoading) {
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
            {user && pointsEarned > 0 && (
              <div 
                className="mt-4 p-4 rounded-lg border-2"
                style={{ 
                  backgroundColor: '#10b981' + '20',
                  borderColor: '#10b981',
                  color: '#10b981'
                }}
              >
                <div className="text-2xl font-bold">🏆 +{pointsEarned} แต้ม!</div>
                <div className="text-sm">ได้รับแต้มจากการทำข้อสอบ</div>
              </div>
            )}
          </div>

          {/* Overall Stats */}
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
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
          </div>

          {/* By Subject Analysis */}
          <div 
            className="rounded-lg p-6"
            style={{ ...getBackgroundStyle(theme.bgColor), border: `1px solid ${theme.textColor}20` }}
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
            style={{ ...getBackgroundStyle(theme.bgColor), border: `1px solid ${theme.textColor}20` }}
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
                
                // ตรวจสอบว่า label มีค่าหรือไม่
                if (!label) {
                  console.warn(`Unknown confidence level: ${confidence}`)
                  return null
                }
                
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
              onClick={() => router.push('/quiz/v2/analysis')}
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
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            🚀 ข้อสอบ V2
          </h1>
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

        {/* Question */}
        <div 
          className="rounded-lg p-6"
          style={{ ...getBackgroundStyle(theme.bgColor), border: `1px solid ${theme.textColor}20` }}
        >
          <div className="flex justify-between items-start mb-4">
            <div style={{ color: theme.textColor + '70' }} className="text-sm">
              📚 {currentQuestion.subject} | 📖 {currentQuestion.topic}
            </div>
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
          </div>
          
          <h2 
            className="text-xl font-medium mb-6"
            style={{ color: theme.textColor }}
          >
            {currentQuestion.question}
          </h2>

          {/* Choices */}
          <div className="space-y-3">
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selectedChoice === index
              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedChoice(index);
                    setConfidenceLevel(null);
                  }}
                  className="w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    backgroundColor: isSelected ? theme.textColor + '10' : 'transparent',
                    borderColor: isSelected ? '#3b82f6' : theme.textColor + '30',
                    color: theme.textColor,
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  <span className="font-medium mr-3">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {choice}
                </button>
              )
            })}
          </div>
        </div>

        {/* Confidence Selector */}
        <div 
          className="rounded-lg p-4"
          style={{ ...getBackgroundStyle(theme.bgColor), border: `1px solid ${theme.textColor}20` }}
        >
          <h3 className="font-medium mb-3" style={{ color: theme.textColor }}>
            🧠 ระดับความมั่นใจในการตอบ:
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'confident', icon: '💪', label: 'มั่นใจ', color: '#10b981' },
              { value: 'uncertain', icon: '🤔', label: 'ไม่แน่ใจ', color: '#f59e0b' },
              { value: 'guess', icon: '🎲', label: 'เดา', color: '#ef4444' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => selectedChoice !== null && setConfidenceLevel(option.value as any)}
                disabled={selectedChoice === null || isSubmitting}
                className="p-3 rounded-lg text-center transition-all duration-200 hover:scale-[1.05] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: confidenceLevel === option.value ? option.color + '20' : theme.textColor + '05',
                  border: `2px solid ${confidenceLevel === option.value ? option.color : theme.textColor + '30'}`,
                  color: confidenceLevel === option.value ? option.color : theme.textColor
                }}
              >
                <div className="text-xl mb-1">{option.icon}</div>
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAnswer}
          disabled={selectedChoice === null || confidenceLevel === null || isSubmitting}
          className="w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
          style={{
            background: selectedChoice !== null && confidenceLevel !== null 
              ? 'linear-gradient(45deg, #10b981, #059669)' 
              : theme.textColor + '40',
            color: '#ffffff'
          }}
        >
          {currentIndex + 1 === questions.length ? 
            '🏁 ส่งคำตอบและดูผล' : 
            '➡️ ข้อถัดไป'
          }
        </button>

        {/* Current Stats */}
        <div 
          className="text-center text-sm"
          style={{ color: theme.textColor + '70' }}
        >
          ⏱️ เวลาที่ใช้: {elapsedTime} วินาที
        </div>

        {/* ChatBot Button */}
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowChatBot(prev => !prev)}
            className="p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
            style={{ 
              backgroundColor: showChatBot ? '#ef4444' : '#3b82f6',
              color: '#ffffff'
            }}
          >
            {showChatBot ? '❌ ปิด' : '💬 ช่วยเหลือ'}
          </button>
        </div>

        {/* ChatBot Component */}
        {showChatBot && (
          <div className="fixed bottom-20 right-4 w-80 max-w-[90vw] z-50">
            <ChatBot
              show={showChatBot}
              onClose={() => setShowChatBot(false)}
              question={currentQuestion.question}
              choices={currentQuestion.choices}
            />
          </div>
        )}
      </main>
    </ThemedLayout>
  )
}
