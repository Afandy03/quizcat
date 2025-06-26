"use client"

import AnswerItem from "@/components/AnswerItem"


type Answer = {
  id: string
  questionText?: string
  correct: boolean
  timeTaken?: number
  confidenceLevel?: string
  subject?: string
  topic?: string
}

type SectionData = {
  section: string
  correct: number
  total: number
  guess: number
  not_confident: number
  confident: number
  percent: number
}

type Props = {
  data: SectionData
  answers: Answer[]
  isExpanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
}

export default function AnswerSection({ data, answers, isExpanded, onToggle, onDelete }: Props) {
  return (
    <div className="p-4 bg-white border-2 border-red-400 rounded-lg shadow-md space-y-2">
      <h2
        className="text-lg font-semibold text-red-600 cursor-pointer hover:underline"
        onClick={onToggle}
      >
        {data.section}
      </h2>
      <p className="text-gray-800">
        ✅ ถูก: <span className="font-bold">{data.correct} / {data.total}</span> (
        <span className="text-blue-600">{data.percent}%</span>)
      </p>
      <div className="flex gap-4 text-sm text-gray-700">
        <p>😎 มั่นใจ: <span className="font-medium text-purple-700">{data.confident}</span></p>
        <p>😬 ไม่มั่นใจ: <span className="font-medium text-yellow-600">{data.not_confident}</span></p>
        <p>😕 เดา: <span className="font-medium text-orange-600">{data.guess}</span></p>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t pt-2 space-y-2">
          {answers.map((a, idx) => (
            <AnswerItem key={a.id} answer={a} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
