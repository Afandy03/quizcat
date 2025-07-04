'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useUserTheme, getBackgroundStyle } from '@/lib/useTheme'
import ThemedLayout from '@/components/ThemedLayout'
import { motion, AnimatePresence } from 'framer-motion'

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

export default function QuizV2SelectPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [grades, setGrades] = useState<(string | number)[]>([])  // เปลี่ยนเป็น array ที่รองรับทั้ง string และ number
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [randomSeed, setRandomSeed] = useState(false)

  const { theme } = useUserTheme()
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
        
        // กรองและประมวลผล grades ให้รองรับทั้ง string และ number
        const allGrades = questions
          .map(q => q.grade)
          .filter(g => g != null && g !== '')
          .map(g => {
            // ถ้าเป็น string ที่ขึ้นต้นด้วย "ป." ให้แปลงเป็น number
            if (typeof g === 'string' && g.startsWith('ป.')) {
              const num = parseInt(g.replace('ป.', ''))
              return isNaN(num) ? g : num
            }
            // ถ้าเป็น number ที่ถูกต้อง
            if (typeof g === 'number' && !isNaN(g)) {
              return g
            }
            // ถ้าเป็น string ที่เป็นตัวเลข
            if (typeof g === 'string') {
              const num = parseInt(g)
              return isNaN(num) ? g : num
            }
            return g
          })
        
        const uniqueGrades = [...new Set(allGrades)].sort((a, b) => {
          // เรียงลำดับโดยพยายามแปลงเป็นตัวเลขก่อน
          const numA = typeof a === 'number' ? a : parseInt(String(a).replace('ป.', ''))
          const numB = typeof b === 'number' ? b : parseInt(String(b).replace('ป.', ''))
          
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }
          
          // ถ้าแปลงเป็นตัวเลขไม่ได้ ให้เรียงตามตัวอักษร
          return String(a).localeCompare(String(b))
        })
        
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
    let filtered = allQuestions

    if (selectedSubject) {
      filtered = filtered.filter(q => q.subject === selectedSubject)
    }
    if (selectedTopic) {
      filtered = filtered.filter(q => q.topic === selectedTopic)
    }
    if (selectedGrade) {
      filtered = filtered.filter(q => {
        // เปรียบเทียบแบบตรงไปตรงมาก่อน (สำหรับข้อความ)
        if (q.grade === selectedGrade) {
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
        if (typeof selectedGrade === 'string') {
          const num = parseInt(selectedGrade.replace('ป.', ''));
          if (!isNaN(num)) {
            selectedGradeNum = num;
          }
        } else if (typeof selectedGrade === 'number') {
          selectedGradeNum = selectedGrade;
        }

        // เปรียบเทียบตัวเลข (ถ้าแปลงได้)
        return questionGradeNum !== -1 && selectedGradeNum !== -1 && questionGradeNum === selectedGradeNum;
      })
    }
    if (selectedDifficulty) {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty)
    }

    return filtered
  }

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const handleStartQuiz = () => {
    const questions = getAvailableQuestions()
    if (questions.length === 0) {
      alert('ไม่พบข้อสอบที่ตรงกับเงื่อนไขที่เลือก')
      return
    }

    // ปรับจำนวนข้อสอบให้เท่ากับจำนวนข้อสอบที่มีจริง หากต้องการมากกว่า
    const finalQuestionCount = Math.min(questionCount, questions.length)

    // สุ่มข้อสอบ
    const selectedQuestions = randomSeed 
      ? shuffleArray(questions).slice(0, finalQuestionCount)
      : questions.slice(0, finalQuestionCount)

    // สร้าง URL parameters
    const params = new URLSearchParams()
    if (selectedSubject) params.set('subject', selectedSubject)
    if (selectedTopic) params.set('topic', selectedTopic)
    if (selectedGrade) params.set('grade', selectedGrade)
    if (selectedDifficulty) params.set('difficulty', selectedDifficulty)
    params.set('count', questionCount.toString())
    params.set('random', randomSeed.toString())

    router.push(`/quiz/v2/play?${params.toString()}`)
  }

  const resetFilters = () => {
    setSelectedSubject('')
    setSelectedTopic('')
    setSelectedGrade('')
    setSelectedDifficulty('')
    setQuestionCount(10)
    setRandomSeed(false)
  }

  const hasFilter = selectedSubject || selectedTopic || selectedGrade || selectedDifficulty
  const filteredQuestions = hasFilter ? getAvailableQuestions() : []
  const maxQuestions = Math.min(filteredQuestions.length, 50)

  const getDifficultyStats = () => {
    const easy = filteredQuestions.filter(q => q.difficulty === 'easy').length
    const medium = filteredQuestions.filter(q => q.difficulty === 'medium').length
    const hard = filteredQuestions.filter(q => q.difficulty === 'hard').length
    return { easy, medium, hard }
  }

  return (
    <ThemedLayout>
      <main className="p-6 max-w-4xl mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            🚀 ทำข้อสอบ
          </h1>
          <p 
            className="text-lg"
            style={{ color: theme.textColor + '80' }}
          >
            ระบบวิเคราะห์ขั้นสูง พร้อมสถิติแบบละเอียด
          </p>
          {/* ✨ NEW FEATURES ✨ removed as requested */}
        </motion.div>

        <div 
          className="rounded-2xl shadow-lg border p-6 space-y-6"
          style={{
            ...getBackgroundStyle(theme.bgColor),
            borderColor: theme.textColor + '20'
          }}
        >
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-bold" style={{ color: theme.textColor }}>
              🎯 กำหนดเงื่อนไขข้อสอบ
            </h2>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl text-sm bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                🔄 รีเซ็ททั้งหมด
              </button>
            </div>
          </div>

          {/* Features List */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
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
              className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm"
              style={{ color: theme.textColor + '90' }}
            >
              <div>📊 วัดเปอร์เซ็นการสอบติด</div>
              <div>📉 วิเคราะห์จุดอ่อนแต่ละวิชา</div>
              <div>🎲 ระบุข้อที่ตอบมั่ว vs แน่ใจ</div>
              <div>📈 กราฟแยกตามวิชา</div>
              <div>⏱️ วิเคราะห์เวลาต่อข้อ</div>
              <div>🧠 ระดับความมั่นใจ</div>
              <div>🎯 ความยากง่าย</div>
              <div>🔀 สุ่มข้อสอบ</div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Subject Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textColor }}
                >
                  📚 เลือกวิชา:
                </label>
                <select
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  style={{
                    ...getBackgroundStyle(theme.bgColor),
                    color: theme.textColor,
                    borderColor: theme.textColor + '40'
                  }}
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value)
                    setSelectedTopic('')
                  }}
                >
                  <option value="">-- ทุกวิชา --</option>
                  {subjects.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </motion.div>

              {/* Topic Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textColor }}
                >
                  📖 เลือกหมวด:
                </label>
                <select
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  style={{
                    ...getBackgroundStyle(theme.bgColor),
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
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Grade Selection */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textColor }}
                >
                  🎓 เลือกระดับชั้น:
                </label>
                <select
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  style={{
                    ...getBackgroundStyle(theme.bgColor),
                    color: theme.textColor,
                    borderColor: theme.textColor + '40'
                  }}
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <option value="">-- ทุกระดับชั้น --</option>
                  {grades.map((g, i) => {
                    // ตรวจสอบว่า g เป็นค่าที่ถูกต้อง
                    if (g == null || g === '') return null;
                    
                    // แสดงผลตามรูปแบบที่เหมาะสม
                    let displayText = '';
                    let value = g;
                    
                    if (typeof g === 'string' && g.startsWith('ป.')) {
                      // ถ้าเป็น "ป.X" ให้แสดงตามเดิม
                      displayText = g;
                      value = g;
                    } else if (typeof g === 'number') {
                      // ถ้าเป็นตัวเลข ให้แสดงเป็น "ป.X"
                      displayText = `ป.${g}`;
                      value = g;
                    } else {
                      // ถ้าเป็นค่าอื่น ให้แสดงตามเดิม
                      displayText = String(g);
                      value = g;
                    }
                    
                    return (
                      <option key={i} value={value}>{displayText}</option>
                    )
                  })}
                </select>
              </motion.div>

              {/* Difficulty Selection */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textColor }}
                >
                  ⭐ เลือกระดับความยาก:
                </label>
                <select
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  style={{
                    ...getBackgroundStyle(theme.bgColor),
                    color: theme.textColor,
                    borderColor: theme.textColor + '40'
                  }}
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  <option value="">-- ทุกระดับ --</option>
                  <option value="easy">🟢 ง่าย</option>
                  <option value="medium">🟡 ปานกลาง</option>
                  <option value="hard">🔴 ยาก</option>
                </select>
              </motion.div>
            </div>
          </div>

          {/* Question Count & Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: theme.textColor }}
              >
                📝 จำนวนข้อสอบ:
              </label>
              <input
                type="range"
                min="1"
                max={maxQuestions || 1}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                disabled={!hasFilter}
                className="w-full disabled:opacity-50"
              />
              <div 
                className="flex justify-between text-sm mt-1"
                style={{ color: theme.textColor + (hasFilter ? '80' : '50') }}
              >
                <span>1 ข้อ</span>
                <span 
                  className="font-bold text-lg"
                  style={{ color: theme.textColor + (hasFilter ? '' : '50') }}
                >
                  {hasFilter ? questionCount : 0} ข้อ
                </span>
                <span>{hasFilter ? maxQuestions : 0} ข้อ (สูงสุด)</span>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomSeed}
                  onChange={(e) => setRandomSeed(e.target.checked)}
                  className="scale-125"
                />
                <span style={{ color: theme.textColor }} className="text-sm">
                  🎲 สุ่มข้อสอบ
                </span>
              </label>
            </div>
          </motion.div>

          {/* Question Stats Display */}
          <AnimatePresence>
            {hasFilter ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="border rounded-lg p-6 text-center"
                style={{
                  borderColor: theme.textColor + '20',
                  backgroundColor: theme.textColor + '05'
                }}
              >
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{ color: theme.textColor }}
                >
                  📋 {filteredQuestions.length} ข้อ
                </div>
                <p 
                  className="text-sm mb-4"
                  style={{ color: theme.textColor + '80' }}
                >
                  ข้อสอบที่พบตามเงื่อนไข
                </p>
                {filteredQuestions.length > 0 && (
                  <div 
                    className="grid grid-cols-3 gap-4 text-xs"
                    style={{ color: theme.textColor + '70' }}
                  >
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: '#10b981' + '20' }}
                    >
                      <div className="font-semibold text-green-600">📗 ง่าย</div>
                      <div className="text-lg font-bold">{getDifficultyStats().easy}</div>
                    </div>
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: '#f59e0b' + '20' }}
                    >
                      <div className="font-semibold text-yellow-600">📘 ปานกลาง</div>
                      <div className="text-lg font-bold">{getDifficultyStats().medium}</div>
                    </div>
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: '#ef4444' + '20' }}
                    >
                      <div className="font-semibold text-red-600">📕 ยาก</div>
                      <div className="text-lg font-bold">{getDifficultyStats().hard}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border rounded-lg p-6 text-center"
                style={{
                  borderColor: theme.textColor + '20',
                  backgroundColor: theme.textColor + '05'
                }}
              >
                <div className="text-4xl mb-3">🔍</div>
                <p 
                  className="text-sm"
                  style={{ color: theme.textColor + '70' }}
                >
                  กรุณาเลือกเงื่อนไขข้อสอบก่อน
                </p>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Start Button */}
          <motion.button
            whileHover={{ scale: hasFilter && filteredQuestions.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: hasFilter && filteredQuestions.length > 0 ? 0.98 : 1 }}
            onClick={handleStartQuiz}
            disabled={!hasFilter || filteredQuestions.length === 0}
            className="w-full py-4 px-6 rounded-xl font-bold text-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: hasFilter && filteredQuestions.length > 0
                ? 'linear-gradient(45deg, #10b981, #059669)' 
                : theme.textColor + '40',
              color: '#ffffff',
            }}
          >
            {!hasFilter ? '🔍 เลือกเงื่อนไขก่อน' :
             filteredQuestions.length === 0 ? '❌ ไม่พบข้อสอบ' :
             questionCount > filteredQuestions.length ? `⚠️ มีข้อสอบเพียง ${filteredQuestions.length} ข้อ` :
             '🚀 เริ่มทำข้อสอบ'}
          </motion.button>
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

  if (loading) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.textColor }}></div>
            <p style={{ color: theme.textColor }}>⏳ กำลังโหลดข้อมูลข้อสอบ...</p>
          </div>
        </div>
      </ThemedLayout>
    )
  }

  if (error) {
    return (
      <ThemedLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </ThemedLayout>
    )
  }
}