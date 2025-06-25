'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import ThemedLayout from '@/components/ThemedLayout'

export default function ManageQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [isDragging, setIsDragging] = useState(false)
  const [dragModeAdd, setDragModeAdd] = useState(true)
  const [dragPath, setDragPath] = useState<string[]>([])
  const dragStartedFrom = useRef<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'questions'))
    const unsubscribe = onSnapshot(q, snap => {
      const items: any[] = []
      snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }))
      setQuestions(items)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const handleUp = () => {
      setIsDragging(false)
      setDragPath([])
      dragStartedFrom.current = null
    }
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [])

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected)
    newSet.has(id) ? newSet.delete(id) : newSet.add(id)
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
    dragStartedFrom.current = id
    setTimeout(() => {
      // ถ้ายังไม่ปล่อยคลิก ถือว่าเป็น drag
      if (dragStartedFrom.current === id) {
        const isAlreadySelected = selected.has(id)
        setIsDragging(true)
        setDragModeAdd(!isAlreadySelected)

        const newSet = new Set(selected)
        !isAlreadySelected ? newSet.add(id) : newSet.delete(id)
        setSelected(newSet)
        setDragPath([id])
      }
    }, 100) // ปรับ delay ได้ตามใจ (100ms คือ safe ทั่วไป)

    window.getSelection()?.removeAllRanges()
  }

  const handleClick = (id: string) => {
    if (isDragging) return
    toggleSelect(id)
  }

  const handleMouseOver = (id: string) => {
    if (!isDragging) return

    const newSet = new Set(selected)
    const lastId = dragPath[dragPath.length - 1]
    if (id === lastId) return

    const newPath = [...dragPath]

    if (dragModeAdd) {
      if (!selected.has(id)) {
        newSet.add(id)
        newPath.push(id)
      } else if (dragPath.includes(id)) {
        if (dragPath.length <= 1) return
        newSet.delete(lastId)
        newPath.pop()
      }
    } else {
      if (selected.has(id)) {
        newSet.delete(id)
        newPath.push(id)
      } else if (dragPath.includes(id)) {
        if (dragPath.length <= 1) return
        newSet.add(lastId)
        newPath.pop()
      }
    }

    setSelected(newSet)
    setDragPath(newPath)
  }

  return (
    <ThemedLayout>
      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">🗂️ จัดการข้อสอบ</h1>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={toggleSelectAll}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded shadow transition"
          >
            {selected.size === questions.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
          </button>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded shadow transition"
          >
            🗑️ ลบที่เลือกทั้งหมด ({selected.size})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto select-none">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={selected.size === questions.length}
                  />
                </th>
                <th className="border px-3 py-2 text-left">คำถาม</th>
                <th className="border px-3 py-2 text-left">หัวข้อ</th>
                <th className="border px-3 py-2 text-center">ชั้น</th>
                <th className="border px-3 py-2 text-left">ตัวเลือก</th>
                <th className="border px-3 py-2 text-left">เฉลย</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr
                  key={q.id}
                  className={`hover:bg-yellow-50 transition cursor-pointer ${selected.has(q.id) ? 'bg-red-100' : ''}`}
                  onMouseDown={() => handleMouseDown(q.id)}
                  onClick={() => handleClick(q.id)}
                  onMouseOver={() => handleMouseOver(q.id)}
                >
                  <td className="border px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                    />
                  </td>
                  <td className="border px-3 py-2">{q.question?.slice(0, 50)}...</td>
                  <td className="border px-3 py-2">{q.subject || '-'} / {q.topic || '-'}</td>
                  <td className="border px-3 py-2 text-center">{q.grade || '-'}</td>
                  <td className="border px-3 py-2">{q.choices?.join(', ')}</td>
                  <td className="border px-3 py-2">{q.choices?.[q.correctIndex]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </ThemedLayout>
  )
}
