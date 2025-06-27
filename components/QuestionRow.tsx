"use client"
import { useRef, useEffect } from "react"
/**
 * QuestionRow
 * Props:
 *  - question: object { id, question, subject, topic, grade, choices, correctIndex }
 *  - isSelected: boolean
 *  - onToggle: () => void              // toggle เมื่อคลิก checkbox
 *  - onMouseDown: () => void           // เริ่ม drag-select
 *  - onMouseOver: () => void           // ขณะ drag-over
 *  - onMouseUp: () => void             // จบ drag-select
 *
 * ⚠️ อย่าแก้ layout ของ <td> โดยไม่รู้ว่าใช้กับ ManageQuestionsPage
 */
interface QuestionRowProps {
  question: {
    id: string
    question: string
    subject?: string
    topic?: string
    grade?: number
    choices: string[]
    correctIndex: number
  }
  isSelected: boolean
  onToggle: () => void
  onMouseDown: () => void
  onMouseOver: () => void
  onMouseUp: () => void
}

export default function QuestionRow({
  question,
  isSelected,
  onToggle,
  onMouseDown,
  onMouseOver,
  onMouseUp,
}: QuestionRowProps) {
  // เริ่มจับเวลาเมื่อ component โหลดคำถาม
  const timeStart = useRef<number>(Date.now())

  // รีเซ็ตเวลาเริ่มต้นทุกครั้งที่โจทย์เปลี่ยน
  useEffect(() => {
    timeStart.current = Date.now()
  }, [question])

  const preview = question.question.length > 50
    ? question.question.slice(0, 50) + "..."
    : question.question

  return (
    <tr
      className={isSelected ? "bg-red-50" : ""}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onMouseUp={onMouseUp}
    >
      <td className="border px-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
        />
      </td>
      <td className="border px-2">{preview}</td>
      <td className="border px-2">{question.subject || "-"} / {question.topic || "-"}</td>
      <td className="border px-2">{question.grade ?? "-"}</td>
      <td className="border px-2">{question.choices.join(", ")}</td>
      <td className="border px-2">{question.choices[question.correctIndex] || "-"}</td>
    </tr>
  )
}
