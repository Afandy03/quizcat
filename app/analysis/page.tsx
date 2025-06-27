'use client'

import ThemedLayout from "@/components/ThemedLayout"
import { useState, useMemo } from "react"
import { useFetchAnswers } from "@/hooks/useFetchAnswers"
import SummaryChart from "@/components/SummaryChart"
import AnswerSection from "@/components/AnswerSection"

export default function AnalysisPage() {
  const { answers, summary, loading, deleteAnswer } = useFetchAnswers()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleExpand = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  // 🧠 สถิติพื้นฐานแบบจัดเต็ม
  const stats = useMemo(() => {
    if (answers.length === 0) return null

    const total = answers.length
    const avgScore = answers.reduce((sum, a) => sum + (a.score || 0), 0) / total
    const avgTime = answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / total

    const scoreByTopic: Record<string, number[]> = {}
    const timeByTopic: Record<string, number> = {}
    const countByTopic: Record<string, number> = {}

    for (const a of answers) {
      const key = `${a.subject?.trim() || "ไม่ระบุ"} / ${a.topic?.trim() || "ไม่ระบุ"}`
      scoreByTopic[key] = scoreByTopic[key] || []
      timeByTopic[key] = (timeByTopic[key] || 0) + (a.timeSpent || 0)
      countByTopic[key] = (countByTopic[key] || 0) + 1
      if (a.score !== undefined) scoreByTopic[key].push(a.score)
    }

    const avgScoreByTopic = Object.entries(scoreByTopic).map(([topic, scores]) => ({
      topic,
      avg: scores.reduce((s, v) => s + v, 0) / scores.length
    }))
    const weak = avgScoreByTopic.sort((a, b) => a.avg - b.avg)[0]
    const strong = avgScoreByTopic.sort((a, b) => b.avg - a.avg)[0]

    const mostAnswered = Object.entries(countByTopic).sort((a, b) => b[1] - a[1])[0]
    const mostTimeSpent = Object.entries(timeByTopic).sort((a, b) => b[1] - a[1])[0]

    return {
      total,
      avgScore: avgScore.toFixed(2),
      avgTime: avgTime.toFixed(1),
      strong,
      weak,
      mostAnswered,
      mostTimeSpent
    }
  }, [answers])

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-purple-800">📊 วิเคราะห์ผลของคุณ</h1>

        {loading ? (
          <p className="text-center text-gray-500">กำลังโหลด...</p>
        ) : summary.length === 0 ? (
          <p className="text-center text-gray-500">ยังไม่มีข้อมูล</p>
        ) : (
          <>
            {/* ✅ สรุป insight */}
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-xl shadow-sm space-y-1 text-sm">
              <p>📝 ตอบทั้งหมด <strong>{stats?.total}</strong> ข้อ</p>
              <p>🎯 คะแนนเฉลี่ย <strong>{stats?.avgScore}</strong></p>
              <p>⏱️ เวลาเฉลี่ยต่อข้อ <strong>{stats?.avgTime} วินาที</strong></p>
              <p>🧠 หัวข้อที่ทำได้ดี: <strong>{stats?.strong?.topic}</strong> ({stats?.strong?.avg.toFixed(2)})</p>
              <p>⚠️ หัวข้อที่ควรฝึกเพิ่ม: <strong>{stats?.weak?.topic}</strong> ({stats?.weak?.avg.toFixed(2)})</p>
              <p>📌 หัวข้อที่ตอบบ่อยสุด: <strong>{stats?.mostAnswered?.[0]}</strong> ({stats?.mostAnswered?.[1]} ครั้ง)</p>
              <p>⏳ หัวข้อที่ใช้เวลามากสุด: <strong>{stats?.mostTimeSpent?.[0]}</strong> ({stats?.mostTimeSpent?.[1].toFixed(0)} วินาที)</p>
            </div>

            {/* ✅ กราฟ */}
            <SummaryChart data={summary} />

            {/* ✅ รายละเอียดแต่ละ section */}
            {summary.map((sectionData, idx) => {
              const isExpanded = expandedSection === sectionData.section
              const sectionAnswers = answers.filter(a =>
                `${a.subject?.trim() || "ไม่ระบุ"} / ${a.topic?.trim() || "ไม่ระบุ"}` === sectionData.section
              )

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
