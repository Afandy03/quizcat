// components/AnswerSection.tsx
'use client'

// ✨ 1. Import ทุกอย่างที่จำเป็น รวมถึง Type จากไฟล์กลาง
import AnswerItem from "@/components/AnswerItem"
import { Answer, SummaryData } from "@/types"

// กำหนด Props โดยใช้ Type ที่ import มา
type Props = {
  data: SummaryData, // 👈 2. เปลี่ยน SectionData เป็น SummaryData
  answers: Answer[],
  isExpanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
}

export default function AnswerSection({ data, answers, isExpanded, onToggle, onDelete }: Props) {
  return (
    // ✨ 2. ปรับปรุง UI เล็กน้อยเพื่อความสวยงาม
    <div className="p-4 bg-white border rounded-lg shadow-sm transition-all duration-300">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <h2 className="text-lg font-semibold text-gray-800">
          {/* ✨ 3. เพิ่มไอคอน Chevron เพื่อบอกสถานะ */}
          <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
          {data.section}
        </h2>
        <p className="text-gray-800 text-sm md:text-base">
          <span className="font-bold">{data.correct} / {data.total}</span> 
          <span className="text-blue-600 ml-2">({data.percent}%)</span>
        </p>
      </div>

      {/* ✨ 4. เมื่อขยาย Section ออกมาแล้ว จะแสดงรายละเอียดส่วนนี้ */}
      {isExpanded && (
        <div className="mt-4 border-t pt-4 space-y-3">
          {/* ส่วนแสดงความมั่นใจ */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 p-2 bg-gray-50 rounded-md">
            <p>😎 มั่นใจ: <span className="font-medium text-purple-700">{data.confident}</span></p>
            <p>😬 ไม่มั่นใจ: <span className="font-medium text-yellow-600">{data.not_confident}</span></p>
            <p>😕 เดา: <span className="font-medium text-orange-600">{data.guess}</span></p>
          </div>

          {/* ✨ 5. จัดการกรณีที่ไม่มีคำตอบ (Empty State) */}
          {answers.length > 0 ? (
            answers.map((a) => (
              <AnswerItem key={a.id} answer={a} onDelete={onDelete} />
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">ไม่มีคำตอบในหัวข้อนี้</p>
          )}
        </div>
      )}
    </div>
  )
}