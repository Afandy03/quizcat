'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
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

export default function QuizV2SelectPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [grades, setGrades] = useState<number[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const theme = useUserTheme()
  const router = useRouter()

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, 'questions'))
        const questions = qSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Question, 'id'>),
        }))

        setAllQuestions(questions)

        // Extract unique values
        const uniqueSubjects = [...new Set(questions.map(q => q.subject).filter(Boolean))]
        const uniqueGrades = [...new Set(questions.map(q => q.grade).filter(Boolean))].sort((a, b) => a - b)
        
        setSubjects(uniqueSubjects)
        setGrades(uniqueGrades)
      } catch (e: any) {
        console.error(e)
        setError('โหลดข้อมูลข้อสอบล้มเหลว')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      const filteredQuestions = allQuestions.filter(q => q.subject === selectedSubject)
      const uniqueTopics = [...new Set(filteredQuestions.map(q => q.topic).filter(Boolean))]
      setTopics(uniqueTopics)
      setSelectedTopic('')
    } else {
      setTopics([])
      setSelectedTopic('')
    }
  }, [selectedSubject, allQuestions])

  const getAvailableQuestions = () => {
    // ✅ ถ้าไม่ได้เลือกเงื่อนไขใดๆ เลย ให้คืนค่า array ว่าง
    if (!selectedSubject && !selectedTopic && !selectedGrade) {
      return []
    }

    let filtered = allQuestions

    if (selectedSubject) {
      filtered = filtered.filter(q => q.subject === selectedSubject)
    }
    if (selectedTopic) {
      filtered = filtered.filter(q => q.topic === selectedTopic)
    }
    if (selectedGrade) {
      filtered = filtered.filter(q => q.grade === parseInt(selectedGrade))
    }

    return filtered
  }

  const handleStartQuiz = () => {
    const questions = getAvailableQuestions()
    if (questions.length === 0) {
      alert('กรุณาเลือกวิชา หรือหมวด หรือระดับชั้น เพื่อค้นหาข้อสอบ')
      return
    }

    // ✅ ใช้จำนวนข้อสอบคงที่ 10 ข้อ หรือจำนวนที่มีทั้งหมด (ถ้าน้อยกว่า 10)
    const questionCount = Math.min(questions.length, 10)

    // สร้าง URL parameters
    const params = new URLSearchParams()
    if (selectedSubject) params.set('subject', selectedSubject)
    if (selectedTopic) params.set('topic', selectedTopic)
    if (selectedGrade) params.set('grade', selectedGrade)
    params.set('count', questionCount.toString())

    router.push(`/quiz/v2/play?${params.toString()}`)
  }

  if (loading) {
    return (
      <ThemedLayout>
        <p className="p-6 text-center" style={{ color: theme.textColor }}>
          ⏳ กำลังโหลดข้อมูลข้อสอบ...
        </p>
      </ThemedLayout>
    )
  }

  if (error) {
    return (
      <ThemedLayout>
        <p className="p-6 text-center" style={{ color: '#ef4444' }}>
          ❌ {error}
        </p>
      </ThemedLayout>
    )
  }

  const availableQuestions = getAvailableQuestions()

  return (
    <ThemedLayout>
      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            🚀 ทำข้อสอบ V2
          </h1>
          <p 
            className="text-lg"
            style={{ color: theme.textColor + '80' }}
          >
            ระบบวิเคราะห์ขั้นสูง พร้อมสถิติแบบละเอียด
          </p>
          <div 
            className="inline-block px-4 py-2 rounded-full mt-2"
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff'
            }}
          >
            ✨ NEW FEATURES ✨
          </div>
        </div>

        <div 
          className="rounded-2xl shadow-lg border p-6 space-y-6"
          style={{
            backgroundColor: theme.bgColor,
            borderColor: theme.textColor + '20'
          }}
        >
          {/* Features List */}
          <div 
            className="rounded-lg p-4"
            style={{
              backgroundColor: theme.textColor + '05',
              borderLeft: `4px solid #10b981`
            }}
          >
            <h3 
              className="font-bold mb-3"
              style={{ color: theme.textColor }}
            >
              🎯 คุณสมบัติใหม่:
            </h3>
            <div 
              className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm"
              style={{ color: theme.textColor + '90' }}
            >
              <div>📊 วัดเปอร์เซ็นการสอบติด</div>
              <div>📉 วิเคราะห์จุดอ่อนแต่ละวิชา</div>
              <div>🎲 ระบุข้อที่ตอบมั่ว vs แน่ใจ</div>
              <div>📈 กราฟแยกตามวิชา</div>
              <div>⏱️ วิเคราะห์เวลาต่อข้อ</div>
              <div>🧠 ระดับความมั่นใจ</div>
            </div>
          </div>

          {/* Subject Selection */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: theme.textColor }}
            >
              📚 เลือกวิชา:
            </label>
            <select
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              style={{
                backgroundColor: theme.bgColor,
                color: theme.textColor,
                borderColor: theme.textColor + '40'
              }}
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value)
                setSelectedTopic('')
                setSelectedGrade('')
              }}
            >
              <option value="">-- ทุกวิชา --</option>
              {subjects.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Topic Selection */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: theme.textColor }}
            >
              📖 เลือกหมวด:
            </label>
            <select
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: theme.bgColor,
                color: theme.textColor,
                borderColor: theme.textColor + '40'
              }}
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!selectedSubject}
            >
              <option value="">-- ทุกหมวด --</option>
              {topics.map((t, i) => (
                <option key={i} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Grade Selection */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: theme.textColor }}
            >
              🎓 เลือกระดับชั้น:
            </label>
            <select
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              style={{
                backgroundColor: theme.bgColor,
                color: theme.textColor,
                borderColor: theme.textColor + '40'
              }}
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">-- ทุกระดับชั้น --</option>
              {grades.map((g, i) => (
                <option key={i} value={g}>ป.{g <= 6 ? g : g - 6}</option>
              ))}
            </select>
          </div>

          {/* Question Count Display */}
          <div 
            className="border rounded-lg p-4 text-center"
            style={{
              borderColor: theme.textColor + '20',
              backgroundColor: theme.textColor + '05'
            }}
          >
            <div 
              className="text-2xl font-bold mb-2"
              style={{ color: theme.textColor }}
            >
              📋 {availableQuestions.length > 0 ? availableQuestions.length : '--'} ข้อ
            </div>
            <p 
              className="text-sm"
              style={{ color: theme.textColor + '80' }}
            >
              {availableQuestions.length > 0 ? 'ข้อสอบที่พบตามเงื่อนไข' : 'กรุณาเลือกเงื่อนไขการค้นหา'}
            </p>
            {availableQuestions.length > 0 && (
              <div 
                className="mt-2 text-xs grid grid-cols-3 gap-2"
                style={{ color: theme.textColor + '70' }}
              >
                <div>
                  <div className="font-semibold">📗 ง่าย</div>
                  <div>{availableQuestions.filter(q => q.difficulty === 'easy').length} ข้อ</div>
                </div>
                <div>
                  <div className="font-semibold">📘 ปานกลาง</div>
                  <div>{availableQuestions.filter(q => q.difficulty === 'medium').length} ข้อ</div>
                </div>
                <div>
                  <div className="font-semibold">📕 ยาก</div>
                  <div>{availableQuestions.filter(q => q.difficulty === 'hard').length} ข้อ</div>
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartQuiz}
            disabled={availableQuestions.length === 0}
            className="w-full py-4 px-6 rounded-xl font-bold text-xl shadow-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: availableQuestions.length > 0 
                ? 'linear-gradient(45deg, #10b981, #059669)' 
                : theme.textColor + '40',
              color: '#ffffff',
              transform: availableQuestions.length > 0 ? 'scale(1)' : 'scale(0.98)'
            }}            >
            {availableQuestions.length > 0 ? '🚀 เริ่มทำข้อสอบ V2' : '🔍 กรุณาเลือกเงื่อนไข'}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:opacity-80 transition-opacity text-sm"
            style={{ color: theme.textColor + '80' }}
          >
            ⬅️ กลับหน้าหลัก
          </button>
        </div>
      </main>
    </ThemedLayout>
  )
}
