'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore'
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
  // ✅ Simple client-side only check
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>⏳ กำลังโหลดข้อสอบ...</p>
        </div>
      </ThemedLayout>
    )
  }

  return <QuizV2PlayContentComponent />
}

function QuizV2PlayContentComponent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [confidenceLevel, setConfidenceLevel] = useState<'guess' | 'uncertain' | 'confident' | null>(null) // ✅ เปลี่ยนเป็น null
  const [timeStart, setTimeStart] = useState<number>(0) // ✅ เปลี่ยนเป็น 0 เพื่อป้องกัน hydration error
  const [questionStartTime, setQuestionStartTime] = useState<number>(0) // ✅ เปลี่ยนเป็น 0 เพื่อป้องกัน hydration error
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // ✅ เพิ่ม saving state สำหรับแสดง indicator
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // ✅ เพิ่ม hydrated state เพื่อป้องกัน hydration error
  const [isHydrated, setIsHydrated] = useState(false)
  // ✅ เพิ่ม current timer state เพื่อป้องกัน hydration error  
  const [currentTime, setCurrentTime] = useState(0)

  const theme = useUserTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ Mark as hydrated เมื่อ component mount เพื่อป้องกัน hydration error
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // ✅ Initialize timestamps after component mount เพื่อป้องกัน hydration error
  useEffect(() => {
    const now = Date.now()
    setTimeStart(now)
    setQuestionStartTime(now)
  }, [])

  // ✅ Update timer every second เพื่อป้องกัน hydration error
  useEffect(() => {
    if (!isHydrated || questionStartTime === 0) return

    const interval = setInterval(() => {
      setCurrentTime(Math.round((Date.now() - questionStartTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [isHydrated, questionStartTime])

  // Cleanup: บันทึกคำตอบที่ทำไปแล้วก่อนออกจากหน้า
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (answers.length > 0 && user) {
        // ใช้ sendBeacon สำหรับบันทึกข้อมูลตอน page unload
        const data = JSON.stringify({
          answers,
          userId: user.uid,
          userEmail: user.email || '',
          quizSession: timeStart
        })
        
        // Note: sendBeacon ไม่รองรับ Firestore โดยตรง
        // แต่เราสามารถบันทึกลง localStorage เป็น fallback
        localStorage.setItem('quiz-v2-incomplete', data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [answers, user, timeStart])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      
      if (!u) {
        const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
        if (!isGuestMode) {
          router.push('/login')
        }
      } else {
        localStorage.removeItem('quizcat-guest-mode')
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    // Guard: ตรวจสอบว่า searchParams พร้อมใช้งานแล้ว
    if (!searchParams) {
      return
    }

    // ✅ รอให้ hydrated ก่อนโหลดข้อสอบเพื่อป้องกัน hydration error
    if (!isHydrated) {
      return
    }

    // ดึงค่าพารามิเตอร์ออกมาก่อน เพื่อลด .get() calls
    const subject = searchParams.get('subject')
    const topic = searchParams.get('topic')
    const grade = searchParams.get('grade')
    const count = parseInt(searchParams.get('count') || '10')

    // ถ้าไม่มีพารามิเตอร์อะไรเลย อาจจะยังไม่พร้อม
    if (!subject && !topic && !grade && !searchParams.get('count')) {
      console.log('No search params found, waiting...')
      return
    }

    const loadQuestions = async () => {
      try {
        setLoading(true)
        
        const qSnap = await getDocs(collection(db, 'questions'))
        let questionList = qSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Question, 'id'>),
        }))

        // ใช้ filter chain แทนการ filter แยก (performance ดีกว่า)
        questionList = questionList.filter(q => {
          return (!subject || q.subject === subject) &&
                 (!topic || q.topic === topic) &&
                 (!grade || q.grade === parseInt(grade))
        })

        // Early return ถ้าไม่มีข้อสอบ
        if (questionList.length === 0) {
          setError('ไม่พบข้อสอบที่ตรงกับเงื่อนไข')
          setLoading(false)
          return
        }

        // ✅ ใช้ fixed seed เพื่อป้องกัน hydration error
        // สร้าง seed จาก search params แทน timestamp
        const paramString = `${subject}-${topic}-${grade}-${count}`
        const shuffleSeed = paramString.split('').reduce((acc, char) => {
          return acc + char.charCodeAt(0)
        }, 1000) // เริ่มจาก 1000 เพื่อหลีกเลี่ยงค่า 0

        const shuffled = [...questionList].sort((a, b) => {
          // ใช้ simple hash function แทน Math.random()
          const hash = (str: string) => {
            let hash = 0
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i)
              hash = ((hash << 5) - hash) + char
              hash = hash & hash // Convert to 32bit integer
            }
            return hash
          }
          
          const aHash = hash(a.id + shuffleSeed.toString())
          const bHash = hash(b.id + shuffleSeed.toString())
          return aHash - bHash
        })
        
        const selectedQuestions = shuffled.slice(0, Math.min(count, questionList.length))

        setQuestions(selectedQuestions)
        setQuestionStartTime(Date.now())
        setError(null) // Clear any previous errors
      } catch (e: any) {
        console.error('Error loading questions:', e)
        setError('โหลดข้อสอบล้มเหลว: ' + (e.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'))
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [searchParams, isHydrated]) // ✅ ลบ timeStart dependency ออก

  // ฟังก์ชันสำหรับบันทึกคำตอบทั้งหมดยกชุด (performance ดีกว่า)
  const saveAllAnswersToFirebase = async (allAnswers: Answer[]) => {
    // ✅ เพิ่ม validation และ early return
    if (!allAnswers || allAnswers.length === 0) {
      console.log('No answers to save')
      return
    }

    // ✅ รองรับ Guest Mode - ไม่บังคับต้องมี user
    const isGuestMode = !user && localStorage.getItem('quizcat-guest-mode') === 'true'
    
    if (!user && !isGuestMode) {
      console.log('No user logged in and not in guest mode, skipping Firebase save')
      return
    }

    try {
      console.log('💾 Saving', allAnswers.length, 'answers to Firebase...')
      setIsSaving(true) // ✅ เริ่มแสดง saving indicator
      setSaveError(null) // Clear previous errors
      
      // ใช้ Firestore batch เพื่อบันทึกยกชุด
      const batch = writeBatch(db)
      const collectionRef = collection(db, 'quiz_v2_answers')

      allAnswers.forEach((answer) => {
        // สร้าง document reference ใหม่สำหรับแต่ละคำตอบ
        const docRef = doc(collectionRef)
        
        // ตรวจสอบและทำความสะอาดข้อมูลก่อนบันทึก
        const cleanAnswer = {
          ...answer,
          userId: user?.uid || 'guest',
          userEmail: user?.email || 'guest@quizcat.local',
          timestamp: serverTimestamp(),
          quizSession: timeStart,
          isGuestMode: isGuestMode,
          // ให้แน่ใจว่าไม่มีค่า undefined
          subject: answer.subject || 'ไม่ระบุ',
          topic: answer.topic || 'ไม่ระบุ',
          difficulty: answer.difficulty || 'medium',
          questionId: answer.questionId || ''
        }
        
        batch.set(docRef, cleanAnswer)
      })

      // บันทึกทั้งหมดในครั้งเดียว
      await batch.commit()
      console.log('✅ Successfully saved all answers to Firebase!')
      
      // ✅ ลบ fallback data ที่เก็บไว้ (ถ้ามี)
      localStorage.removeItem('quiz-v2-incomplete')
      localStorage.removeItem('quiz-v2-failed-save')
      
    } catch (e) {
      // ✅ จัดการ error แบบเงียบ ๆ แต่ log ไว้ (ไม่ให้ UI พัง)
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      console.error('❌ Error saving answers to Firebase:', e)
      setSaveError(errorMessage)
      
      // ✅ เก็บไว้ใน localStorage เป็น fallback
      const fallbackData = {
        answers: allAnswers,
        userId: user?.uid || 'guest',
        userEmail: user?.email || 'guest@quizcat.local',
        quizSession: timeStart,
        timestamp: new Date().toISOString(),
        error: errorMessage
      }
      localStorage.setItem('quiz-v2-failed-save', JSON.stringify(fallbackData))
      
      // ✅ ไม่ throw error เพื่อไม่ให้ UI พัง - user ยังดูผลได้ปกติ
    } finally {
      setIsSaving(false) // ✅ ซ่อน saving indicator
    }
  }

  const handleAnswer = async () => {
    // ✅ เพิ่ม guard สำหรับ confidenceLevel
    if (selectedChoice === null || confidenceLevel === null || isSubmitting) return
    
    // Guard: ตรวจสอบว่ามี currentQuestion
    const question = questions[currentIndex]
    if (!question) {
      console.error('Current question not found')
      return
    }

    setIsSubmitting(true)
    const timeSpent = questionStartTime > 0 ? Math.round((Date.now() - questionStartTime) / 1000) : 0 // ✅ ป้องกัน negative value
    const isCorrect = selectedChoice === question.correctIndex

    const answer: Answer = {
      questionId: question.id,
      selectedIndex: selectedChoice,
      correctIndex: question.correctIndex,
      isCorrect,
      confidenceLevel,
      timeSpent,
      subject: question.subject || 'ไม่ระบุ',
      topic: question.topic || 'ไม่ระบุ',
      difficulty: question.difficulty || 'medium'
    }

    // ✅ สร้าง newAnswers เพื่อใช้กับทั้ง setAnswers และ saveAllAnswersToFirebase
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    // ✅ ปรับปรุงประสิทธิภาพ: ลดเวลา delay และแยก logic
    const isLastQuestion = currentIndex + 1 >= questions.length
    
    if (isLastQuestion) {
      // ✅ ข้อสุดท้าย - แสดงผลทันทีเลย (ไม่ต้องรอ)
      setShowResult(true)
      setIsSubmitting(false)
      
      // ✅ บันทึก Firebase แบบ async background
      saveAllAnswersToFirebase(newAnswers).catch(err => {
        console.error('Background save failed:', err)
      })
    } else {
      // ✅ ข้อปกติ - หน่วงเวลาสั้น ๆ เพื่อให้เห็น feedback แล้วไปข้อต่อไป
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
        setSelectedChoice(null)
        setConfidenceLevel(null) // ✅ เปลี่ยนเป็น null เพื่อบังคับให้เลือกใหม่
        setQuestionStartTime(Date.now())
        setCurrentTime(0) // ✅ Reset timer
        setIsSubmitting(false)
      }, 300) // ✅ ลดจาก 1500ms เหลือ 300ms
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
      totalTime: timeStart > 0 ? Math.round((Date.now() - timeStart) / 1000) : 0 // ✅ ป้องกัน negative value
    }
  }

  // Loading state - รวมการตรวจสอบหลายเงื่อนไข รวมทั้ง hydration
  if (loading || !searchParams || questions.length === 0 || !isHydrated) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center" style={{ color: theme.textColor }} suppressHydrationWarning>
          <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4" 
               style={{ borderColor: theme.textColor + '40', borderTopColor: 'transparent' }}></div>
          <p>⏳ กำลังโหลดข้อสอบ...</p>
          {!searchParams && (
            <p className="text-sm mt-2 opacity-70">กำลังเตรียมพารามิเตอร์...</p>
          )}
          {!isHydrated && (
            <p className="text-sm mt-2 opacity-70">กำลังเตรียมระบบ...</p>
          )}
        </div>
      </ThemedLayout>
    )
  }

  if (error) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center" suppressHydrationWarning>
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
        <main className="p-6 max-w-4xl mx-auto space-y-6" suppressHydrationWarning>
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

          {/* ✅ Saving Indicator - แสดงสถานะการบันทึก */}
          {isSaving && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div 
                  className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full"
                  style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }}
                ></div>
                <p className="text-sm" style={{ color: '#3b82f6' }}>
                  📡 กำลังบันทึกผล...
                </p>
              </div>
            </div>
          )}

          {/* ✅ Save Success/Error Indicator */}
          {!isSaving && saveError && (
            <p className="text-sm text-center mt-2" style={{ color: '#f59e0b' }}>
              ⚠️ บันทึกไม่สำเร็จ แต่ข้อมูลถูกเก็บไว้ในอุปกรณ์แล้ว
            </p>
          )}
          
          {!isSaving && !saveError && answers.length > 0 && (
            <p className="text-sm text-center mt-2" style={{ color: '#10b981' }}>
              ✅ บันทึกผลสำเร็จแล้ว
            </p>
          )}
        </main>
      </ThemedLayout>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex) / questions.length) * 100

  // Guard: ตรวจสอบว่ามี currentQuestion และ questions โหลดเสร็จแล้ว
  if (!currentQuestion || questions.length === 0) {
    return (
      <ThemedLayout>
        <p className="p-6 text-center" style={{ color: theme.textColor }} suppressHydrationWarning>
          ⏳ กำลังเตรียมข้อสอบ...
        </p>
      </ThemedLayout>
    )
  }

  return (
    <ThemedLayout>
      <main className="p-6 max-w-3xl mx-auto space-y-6" suppressHydrationWarning={!isHydrated}>
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
          style={{ backgroundColor: theme.bgColor, border: `1px solid ${theme.textColor}20` }}
        >
          <div className="flex justify-between items-start mb-4">
            <div style={{ color: theme.textColor + '70' }} className="text-sm">
              📚 {currentQuestion.subject || 'ไม่ระบุ'} | 📖 {currentQuestion.topic || 'ไม่ระบุ'}
            </div>
            <div 
              className="px-2 py-1 rounded text-xs"
              style={{ 
                backgroundColor: (currentQuestion.difficulty === 'easy') ? '#10b981' :
                                (currentQuestion.difficulty === 'medium') ? '#f59e0b' : '#ef4444',
                color: '#ffffff'
              }}
            >
              {(currentQuestion.difficulty === 'easy') ? '📗 ง่าย' :
               (currentQuestion.difficulty === 'medium') ? '📘 ปานกลาง' : '📕 ยาก'}
            </div>
          </div>
          
          <h2 
            className="text-xl font-medium mb-6"
            style={{ color: theme.textColor }}
          >
            {currentQuestion.question || 'ไม่พบคำถาม'}
          </h2>

          {/* Choices */}
          <div className="space-y-3">
            {(currentQuestion.choices || []).map((choice, index) => (
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
              { value: 'confident', icon: '💪', label: 'มั่นใจ', color: '#10b981' },
              { value: 'uncertain', icon: '🤔', label: 'ไม่แน่ใจ', color: '#f59e0b' },
              { value: 'guess', icon: '🎲', label: 'เดา', color: '#ef4444' }
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
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAnswer}
          disabled={selectedChoice === null || confidenceLevel === null || isSubmitting} // ✅ เพิ่ม confidenceLevel === null
          className="w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-default hover:scale-[1.02]"
          style={{
            background: selectedChoice !== null && confidenceLevel !== null // ✅ เพิ่มเงื่อนไข confidenceLevel
              ? (isSubmitting ? '#059669' : 'linear-gradient(45deg, #10b981, #059669)')
              : theme.textColor + '40',
            color: '#ffffff'
          }}
        >
          {isSubmitting ? 
            '✅ กำลังบันทึก...' : 
            currentIndex + 1 === questions.length ? 
              '🏁 ส่งคำตอบและดูผล' : 
              '➡️ ข้อถัดไป'
          }
        </button>

        {/* Current Stats */}
        <div 
          className="text-center text-sm"
          style={{ color: theme.textColor + '70' }}
          suppressHydrationWarning
        >
          ⏱️ เวลาที่ใช้: {currentTime} วินาที
        </div>
      </main>
    </ThemedLayout>
  )
}
