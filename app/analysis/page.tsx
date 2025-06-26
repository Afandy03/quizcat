'use client'

import ThemedLayout from "@/components/ThemedLayout"
import { useState } from "react"
import { useFetchAnswers } from "@/hooks/useFetchAnswers"
import SummaryChart from "@/components/SummaryChart"
import AnswerSection from "@/components/AnswerSection"

export default function AnalysisPage() {
  const { answers, summary, loading, deleteAnswer } = useFetchAnswers()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleExpand = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

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
            {/* กราฟ */}
            <SummaryChart data={summary} />

            {/* Section รายละเอียด */}
            {summary.map((sectionData, idx) => {
              const isExpanded = expandedSection === sectionData.section
              const sectionAnswers = answers.filter(a =>
                `${a.subject?.trim() || "ไม่ระบุ"} / ${a.topic?.trim() || "ไม่ระบุ"}` === sectionData.section
              )

              return (
                <AnswerSection
                  key={idx}
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
