// hooks/useFetchAnswers.ts
import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, deleteDoc } from "firebase/firestore"

export function useFetchAnswers() {
  const [answers, setAnswers] = useState<any[]>([])
  const [summary, setSummary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const computeSummary = (allAnswers: any[]) => {
    const grouped: Record<string, any> = {}

    for (const ans of allAnswers) {
      const subject = ans.subject?.trim() || "ไม่ระบุ"
      const topic = ans.topic?.trim() || "ไม่ระบุ"
      const key = `${subject} / ${topic}`

      if (!grouped[key]) {
        grouped[key] = {
          correct: 0,
          total: 0,
          guess: 0,
          not_confident: 0,
          confident: 0,
        }
      }

      grouped[key].total++
      if (ans.correct) grouped[key].correct++
      if (ans.confidenceLevel === "เดา") grouped[key].guess++
      if (ans.confidenceLevel === "ไม่มั่นใจ") grouped[key].not_confident++
      if (ans.confidenceLevel === "มั่นใจ") grouped[key].confident++
    }

    const result = Object.entries(grouped).map(([key, value]) => ({
      section: key,
      ...value,
      percent: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    }))

    result.sort((a, b) => a.percent - b.percent)
    setSummary(result)
  }

  const deleteAnswer = async (answerId: string) => {
    await deleteDoc(doc(db, "user_answers", answerId))
    const updated = answers.filter(a => a.id !== answerId)
    setAnswers(updated)
    computeSummary(updated)
  }

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser
      if (!user) return

      const q = query(collection(db, "user_answers"), where("userId", "==", user.uid))
      const snap = await getDocs(q)
      const allAnswers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAnswers(allAnswers)
      computeSummary(allAnswers)
      setLoading(false)
    }

    fetchData()
  }, [])

  return { answers, summary, loading, deleteAnswer }
}
