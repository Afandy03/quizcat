'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { db } from '@/lib/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function QuestionsPage() {
  const [question, setQuestion] = useState('')
  const [choices, setChoices] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [topic, setTopic] = useState('')

  const [csvText, setCsvText] = useState('')
  const [subject, setSubject] = useState('')
  const [csvTopic, setCsvTopic] = useState('')
  const [grade, setGrade] = useState(4)

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices]
    newChoices[index] = value
    setChoices(newChoices)
  }

  const handleSubmit = async () => {
    if (!question || choices.some(c => !c)) {
      alert('กรอกคำถามและตัวเลือกให้ครบ')
      return
    }
    try {
      await addDoc(collection(db, 'questions'), {
        question,
        choices,
        correctIndex,
        topic,
        createdAt: serverTimestamp()
      })
      alert('เพิ่มโจทย์เรียบร้อยแล้ว!')
      setQuestion('')
      setChoices(['', '', '', ''])
      setCorrectIndex(0)
      setTopic('')
    } catch (err: any) {
      alert('เพิ่มไม่ได้: ' + err.message)
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(reader.result as string)
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!csvText || !subject || !csvTopic || !grade) {
      alert('ใส่ข้อมูลให้ครบ')
      return
    }
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[]
        for (const row of data) {
          await addDoc(collection(db, 'questions'), {
            question: row.question,
            choices: [row.choice1, row.choice2, row.choice3, row.choice4],
            correctIndex: Number(row.correctIndex) - 1, // ✅ แก้ตรงนี้ ลบ 1 เพื่อให้ match กับ index JS
            subject,
            topic: csvTopic,
            grade: Number(grade),
            createdAt: serverTimestamp()
          })
        }
        alert('อัปโหลดสำเร็จ!')
      }
    })
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">🧠 ระบบเพิ่มข้อสอบ</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4 border p-4 rounded bg-white">
          <h2 className="text-xl font-semibold">✍️ เพิ่มโจทย์ทีละข้อ</h2>

          <input className="w-full border p-2" placeholder="คำถาม" value={question} onChange={(e) => setQuestion(e.target.value)} />
          {choices.map((c, i) => (
            <input key={i} className="w-full border p-2" placeholder={`ตัวเลือก ${i + 1}`} value={c} onChange={(e) => handleChoiceChange(i, e.target.value)} />
          ))}
          <select className="w-full border p-2" value={correctIndex} onChange={(e) => setCorrectIndex(parseInt(e.target.value))}>
            <option value={0}>คำตอบที่ถูก: ตัวเลือก 1</option>
            <option value={1}>ตัวเลือก 2</option>
            <option value={2}>ตัวเลือก 3</option>
            <option value={3}>ตัวเลือก 4</option>
          </select>
          <input className="w-full border p-2" placeholder="หัวข้อ (เช่น บวกเลข)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button onClick={handleSubmit} className="bg-green-600 text-white py-2 px-4 rounded w-full">✅ เพิ่มโจทย์</button>
        </div>

        <div className="flex-1 space-y-4 border p-4 rounded bg-white">
          <h2 className="text-xl font-semibold">📥 อัปโหลดข้อสอบ (CSV)</h2>
          <input type="file" accept=".csv" onChange={handleUpload} className="border p-2 w-full" />
          <input placeholder="วิชา (เช่น คณิตศาสตร์)" value={subject} onChange={(e) => setSubject(e.target.value)} className="border p-2 w-full" />
          <input placeholder="หัวข้อ (เช่น เศษส่วน)" value={csvTopic} onChange={(e) => setCsvTopic(e.target.value)} className="border p-2 w-full" />
          <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="border p-2 w-full">
            <option value={4}>ป.4</option>
            <option value={5}>ป.5</option>
            <option value={6}>ป.6</option>
          </select>
          <button onClick={handleImport} className="bg-blue-600 text-white py-2 px-4 rounded w-full">🚀 อัปโหลดเข้า Firebase</button>
        </div>
      </div>
    </main>
  )
}
