// app/analysis/page.tsx
'use client'

import ThemedLayout from "@/components/ThemedLayout"
import { useState, useMemo } from "react"
import { useFetchAnswers } from "@/hooks/useFetchAnswers"
import SummaryChart from "@/components/SummaryChart"
import AnswerSection from "@/components/AnswerSection"
import { normalizeKey } from "@/lib/normalizeKey"
import { formatTime } from "@/lib/formatters"

export default function AnalysisPage() {
  const { answers, summary, insights, loading, deleteAnswer } = useFetchAnswers()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleExpand = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  const answersBySection = useMemo(() => {
    if (answers.length === 0) return {}

    const grouped: Record<string, any[]> = {}
    for (const ans of answers) {
      const key = normalizeKey(ans.subject, ans.topic)
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(ans)
    }
    return grouped
  }, [answers])

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-purple-800">📊 วิเคราะห์ผลของคุณ</h1>

        {loading ? (
          <p className="text-center text-gray-500">กำลังโหลด...</p>
        ) : !insights || summary.length === 0 ? (
          <p className="text-center text-gray-500">ยังไม่มีข้อมูลให้วิเคราะห์</p>
        ) : (
          <>
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-xl shadow-sm space-y-1 text-sm">
              <p>📝 ตอบทั้งหมด <strong>{insights.total}</strong> ข้อ</p>
              <p>🎯 คะแนนเฉลี่ย: <strong>{(insights.avgScore * 100).toFixed(0)}%</strong></p>
              <p>⏱️ เวลาเฉลี่ยต่อข้อ: <strong>{formatTime(insights.avgTime)}</strong></p>
              <p>🧠 หัวข้อที่ทำได้ดีที่สุด: <strong>{insights.best?.topic}</strong> (เฉลี่ย {((insights.best?.avg || 0) * 100).toFixed(0)}%)</p>
              <p>⚠️ หัวข้อที่คะแนนน้อยสุด: <strong>{insights.worst?.topic}</strong> (เฉลี่ย {((insights.worst?.avg || 0) * 100).toFixed(0)}%)</p>
              <p>⏳ หัวข้อที่ใช้เวลามากที่สุด: <strong>{insights.mostTimeSpent?.[0]}</strong> ({formatTime(insights.mostTimeSpent?.[1])})</p>
            </div>

            <SummaryChart data={summary} />

            {/* ➕ แก้ logic ในการแสดงรายข้อ: เอา answersBySection มาใช้ ไม่ filter แบบเดิม */}
            {summary.map((sectionData) => {
              const isExpanded = expandedSection === sectionData.section
              // แสดงเฉพาะคำตอบที่จับกลุ่มแล้ว
              const sectionAnswers = answersBySection[sectionData.section] || []

              return (
                <AnswerSection
                  key={sectionData.section}
                  data={sectionData}
                  answers={sectionAnswers}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(sectionData.section)}
                  onDelete={deleteAnswer}
                />
              )
            })}
          </>
        )}
      </div>
    </ThemedLayout>
  )
}