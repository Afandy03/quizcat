"use client"

type Answer = {
  id: string
  questionText?: string
  correct: boolean
  timeTaken?: number
  confidenceLevel?: string
}

type Props = {
  answer: Answer
  onDelete: (id: string) => void
}

export default function AnswerItem({ answer, onDelete }: Props) {
  const handleDelete = () => {
    const ok = window.confirm("แน่ใจหรือว่าจะลบคำตอบนี้?")
    if (!ok) return
    onDelete(answer.id)
  }

  return (
    <div className="text-sm p-2 rounded bg-gray-50 border flex justify-between items-start">
      <div>
        <p className="font-medium text-gray-800">
          📝 โจทย์: {answer.questionText || "(ไม่มีชื่อโจทย์)"}
        </p>
        <p>✅ ถูกไหม: {answer.correct ? "✅ ถูก" : "❌ ผิด"}</p>
        <p>⏱️ ใช้เวลา: {answer.timeTaken ?? "?"} วินาที</p>
        <p>🧠 ความมั่นใจ: {answer.confidenceLevel || "-"}</p>
      </div>
      <button
        onClick={handleDelete}
        className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
      >
        ลบ
      </button>
    </div>
  )
}
