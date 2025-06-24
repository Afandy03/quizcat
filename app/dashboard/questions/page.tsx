'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore'

export default function ManageQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragModeAdd, setDragModeAdd] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'questions'))
    const unsubscribe = onSnapshot(q, snap => {
      const items: any[] = []
      snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }))
      setQuestions(items)
    })
    return () => unsubscribe()
  }, [])

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelected(newSet)
  }

  const toggleSelectAll = () => {
    if (selected.size === questions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(questions.map(q => q.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) {
      alert('ยังไม่ได้เลือกอะไรเลย')
      return
    }

    if (confirm(`จะลบ ${selected.size} ข้อใช่มั้ย?`)) {
      const promises = Array.from(selected).map(id => deleteDoc(doc(db, 'questions', id)))
      await Promise.all(promises)
      setSelected(new Set())
    }
  }

  const handleMouseDown = (id: string) => {
    const willAdd = !selected.has(id)
    setIsDragging(true)
    setDragModeAdd(willAdd)
    const newSet = new Set(selected)
    willAdd ? newSet.add(id) : newSet.delete(id)
    setSelected(newSet)
  }

  const handleMouseOver = (id: string) => {
    if (!isDragging) return
    const newSet = new Set(selected)
    dragModeAdd ? newSet.add(id) : newSet.delete(id)
    setSelected(newSet)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">🗂️ จัดการข้อสอบ</h1>

      <div className="mb-4 flex gap-4">
        <button onClick={toggleSelectAll} className="bg-gray-700 text-white px-3 py-1 rounded">
          {selected.size === questions.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
        </button>
        <button onClick={handleDeleteSelected} className="bg-red-700 text-white px-3 py-1 rounded">
          🗑️ ลบที่เลือกทั้งหมด ({selected.size})
        </button>
      </div>

      <table className="w-full border text-sm select-none">
        <thead>
          <tr>
            <th className="border px-2">
              <input type="checkbox" onChange={toggleSelectAll} checked={selected.size === questions.length} />
            </th>
            <th className="border px-2">คำถาม</th>
            <th className="border px-2">วิชา / หัวข้อ</th>
            <th className="border px-2">ชั้น</th>
            <th className="border px-2">ตัวเลือก</th>
            <th className="border px-2">เฉลย</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr
              key={q.id}
              className={selected.has(q.id) ? 'bg-red-50' : ''}
              onMouseDown={() => handleMouseDown(q.id)}
              onMouseOver={() => handleMouseOver(q.id)}
              onMouseUp={handleMouseUp}
            >
              <td className="border px-2 text-center">
                <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} />
              </td>
              <td className="border px-2">{q.question.slice(0, 50)}...</td>
              <td className="border px-2">{q.subject} / {q.topic}</td>
              <td className="border px-2">{q.grade}</td>
              <td className="border px-2">{q.choices.join(', ')}</td>
              <td className="border px-2">{q.choices[q.correctIndex]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
