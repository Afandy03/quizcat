// components/AnswerItem.tsx
'use client'

import { Answer } from "@/types" // 1. Import Type เข้ามา
import { formatTime } from "@/lib/formatters" // 2. Import ฟังก์ชัน formatTime มาใช้ด้วย

// 3. กำหนด Type ของ Props ที่จะรับเข้ามา
interface AnswerItemProps {
  answer: Answer
  onDelete: (id: string) => void
}

export default function AnswerItem({ answer, onDelete }: AnswerItemProps) {
  const isCorrect = answer.correct;

  return (
    // 4. สร้าง UI สำหรับแสดงผลคำตอบแต่ละข้อ
    <div className={`p-3 border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'} bg-gray-50 rounded-r-md`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="font-semibold text-gray-800">{answer.questionText || "(ไม่มีข้อมูลคำถาม)"}</p>
          <div className="text-sm">
            {isCorrect ? (
              <p className="text-green-700">✅ คุณตอบถูก</p>
            ) : (
              <p className="text-red-700">❌ คุณตอบผิด</p>
            )}
            <p className="text-gray-600">⏱️ ใช้เวลา: {formatTime(answer.timeSpent)}</p>
          </div>
        </div>
        <button 
          onClick={() => onDelete(answer.id)}
          className="ml-4 px-2 py-1 text-xs text-red-700 bg-red-100 hover:bg-red-200 rounded"
        >
          ลบ
        </button>
      </div>
    </div>
  )
}