'use client'
import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, deleteDoc } from "firebase/firestore"
import ThemedLayout from "@/components/ThemedLayout"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts"

export default function AnalysisPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<any[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // ฟังก์ชันลบคำตอบทีละอัน
  const handleDeleteAnswer = async (answerId: string) => {
    const ok = window.confirm("แน่ใจหรือว่าจะลบคำตอบนี้?")
    if (!ok) return

    try {
      await deleteDoc(doc(db, "user_answers", answerId))
      // อัปเดต state
      setAnswers(prev => prev.filter(a => a.id !== answerId))
      // รีคำนวณข้อมูลกรุ๊ปใหม่
      const updated = answers.filter(a => a.id !== answerId)
      computeSummary(updated)
    } catch (err) {
      console.error("ลบไม่สำเร็จ:", err)
      alert("เกิดข้อผิดพลาดเวลา ลบคำตอบ")
    }
  }

  // แยกออกมาเพื่อใช้ทั้งตอน fetch ครั้งแรก และหลังลบ
  const computeSummary = (allAnswers: any[]) => {
    const grouped: Record<string, any> = {}

    for (const ans of allAnswers) {
      const subject = ans.subject?.trim() || "ไม่ระบุ"
      const topic   = ans.topic?.trim()   || "ไม่ระบุ"
      const key     = `${subject} / ${topic}`

      if (!grouped[key]) {
        grouped[key] = {
          correct: 0,
          total: 0,
          guess: 0,
          not_confident: 0,
          confident: 0,
        }
      }

      grouped[key].total++
      if (ans.correct) grouped[key].correct++
      if (ans.confidenceLevel === "เดา") grouped[key].guess++
      if (ans.confidenceLevel === "ไม่มั่นใจ") grouped[key].not_confident++
      if (ans.confidenceLevel === "มั่นใจ") grouped[key].confident++
    }

    const result = Object.entries(grouped).map(([key, value]) => ({
      section: key,
      ...value,
      percent: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    }))

    result.sort((a, b) => a.percent - b.percent)
    setData(result)
  }

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser
      if (!user) return

      const q = query(collection(db, "user_answers"), where("userId", "==", user.uid))
      const snap = await getDocs(q)
      // เอา doc.id มาเก็บด้วย เพื่อจะลบทีละอันได้
      const allAnswers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAnswers(allAnswers)

      computeSummary(allAnswers)
      setLoading(false)
    }

    fetchData()
  }, [])

  const toggleExpand = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-purple-800">📊 วิเคราะห์ผลของคุณ</h1>

        {loading ? (
          <p className="text-center text-gray-500">กำลังโหลด...</p>
        ) : data.length === 0 ? (
          <p className="text-center text-gray-500">ยังไม่มีข้อมูล</p>
        ) : (
          <>
            {/* กราฟสรุป */}
            <div className="bg-white p-4 rounded shadow border">
              <h2 className="text-lg font-semibold mb-2">📈 เปรียบเทียบเปอร์เซ็นต์ความเข้าใจ</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="section" fontSize={10} interval={0} angle={-25} dy={20} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="percent" fill="#8884d8">
                    <LabelList dataKey="percent" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* รายละเอียดแต่ละ section */}
            {data.map((d, i) => {
              const isExpanded = expandedSection === d.section
              const detailAnswers = answers.filter(a =>
                `${a.subject?.trim() || "ไม่ระบุ"} / ${a.topic?.trim() || "ไม่ระบุ"}` === d.section
              )

              return (
                <div key={i} className="p-4 bg-white border-2 border-red-400 rounded-lg shadow-md space-y-2">
                  <h2
                    className="text-lg font-semibold text-red-600 cursor-pointer hover:underline"
                    onClick={() => toggleExpand(d.section)}
                  >
                    {d.section}
                  </h2>
                  <p className="text-gray-800">
                    ✅ ถูก: <span className="font-bold">{d.correct} / {d.total}</span> (
                    <span className="text-blue-600">{d.percent}%</span>)
                  </p>
                  <div className="flex gap-4 text-sm text-gray-700">
                    <p>😎 มั่นใจ: <span className="font-medium text-purple-700">{d.confident}</span></p>
                    <p>😬 ไม่มั่นใจ: <span className="font-medium text-yellow-600">{d.not_confident}</span></p>
                    <p>😕 เดา: <span className="font-medium text-orange-600">{d.guess}</span></p>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t pt-2 space-y-2">
                      {detailAnswers.map((a, idx) => (
                        <div key={idx} className="text-sm p-2 rounded bg-gray-50 border flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">📝 โจทย์: {a.questionText || "(ไม่มีชื่อโจทย์)"}</p>
                            <p>✅ ถูกไหม: {a.correct ? "✅ ถูก" : "❌ ผิด"}</p>
                            <p>⏱️ ใช้เวลา: {a.timeTaken || "?"} วินาที</p>
                            <p>🧠 ความมั่นใจ: {a.confidenceLevel || "-"}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteAnswer(a.id)}
                            className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </ThemedLayout>
  )
}
