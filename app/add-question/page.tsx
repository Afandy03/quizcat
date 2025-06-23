"use client"

import { useState } from "react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"

export default function AddQuestionPage() {
  const [question, setQuestion] = useState("")
  const [choices, setChoices] = useState(["", "", "", ""])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [topic, setTopic] = useState("")

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices]
    newChoices[index] = value
    setChoices(newChoices)
  }

  const handleSubmit = async () => {
    if (!question || choices.some(c => !c)) {
      alert("กรอกคำถามและตัวเลือกให้ครบ")
      return
    }

    try {
      await addDoc(collection(db, "questions"), {
        question,
        choices,
        correctIndex,
        topic,
      })
      alert("เพิ่มโจทย์เรียบร้อยแล้ว!")
      setQuestion("")
      setChoices(["", "", "", ""])
      setCorrectIndex(0)
      setTopic("")
    } catch (err: any) {
      alert("เพิ่มไม่ได้: " + err.message)
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold mb-4">เพิ่มโจทย์ใหม่</h2>

      <input
        className="w-full border p-2"
        placeholder="คำถาม"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      {choices.map((c, i) => (
        <input
          key={i}
          className="w-full border p-2"
          placeholder={`ตัวเลือก ${i + 1}`}
          value={c}
          onChange={(e) => handleChoiceChange(i, e.target.value)}
        />
      ))}

      <select
        className="w-full border p-2"
        value={correctIndex}
        onChange={(e) => setCorrectIndex(parseInt(e.target.value))}
      >
        <option value={0}>คำตอบที่ถูก: ตัวเลือก 1</option>
        <option value={1}>คำตอบที่ถูก: ตัวเลือก 2</option>
        <option value={2}>คำตอบที่ถูก: ตัวเลือก 3</option>
        <option value={3}>คำตอบที่ถูก: ตัวเลือก 4</option>
      </select>

      <input
        className="w-full border p-2"
        placeholder="หัวข้อ (เช่น บวกเลข, วิทย์, อังกฤษ)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <button
        className="w-full bg-green-600 text-white py-2 rounded"
        onClick={handleSubmit}
      >
        ✅ เพิ่มโจทย์
      </button>
    </main>
  )
}
