import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc
} from "firebase/firestore"

export function useFetchAnswers() {
  const [answers, setAnswers] = useState<any[]>([])
  const [summary, setSummary] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const computeSummary = (allAnswers: any[]) => {
    const grouped: Record<string, any> = {}

    const scoreList: number[] = []
    const timeList: number[] = []

    const topicTimeMap: Record<string, number> = {}
    const topicScoreMap: Record<string, number[]> = {}

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

      // เก็บไว้ใช้ insight เพิ่มเติม
      if (typeof ans.score === "number") scoreList.push(ans.score)
      if (typeof ans.timeSpent === "number") timeList.push(ans.timeSpent)

      topicTimeMap[key] = (topicTimeMap[key] || 0) + (ans.timeSpent || 0)

      if (!topicScoreMap[key]) topicScoreMap[key] = []
      if (typeof ans.score === "number") topicScoreMap[key].push(ans.score)
    }

    const summaryList = Object.entries(grouped).map(([key, value]) => ({
      section: key,
      ...value,
      percent: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    }))

    summaryList.sort((a, b) => a.percent - b.percent)
    setSummary(summaryList)

    // 🧠 คำนวณ Insight พิเศษ
    const avgScore =
      scoreList.length > 0
        ? scoreList.reduce((s, v) => s + v, 0) / scoreList.length
        : 0

    const avgTime =
      timeList.length > 0
        ? timeList.reduce((s, v) => s + v, 0) / timeList.length
        : 0

    const mostTimeSpent = Object.entries(topicTimeMap).sort((a, b) => b[1] - a[1])[0] || null

    const avgScoreByTopic = Object.entries(topicScoreMap).map(([topic, scores]) => ({
      topic,
      avg: scores.reduce((s, v) => s + v, 0) / scores.length
    }))
    const best = avgScoreByTopic.sort((a, b) => b.avg - a.avg)[0] || null
    const worst = avgScoreByTopic.sort((a, b) => a.avg - b.avg)[0] || null

    setInsights({
      total: allAnswers.length,
      avgScore: avgScore.toFixed(2),
      avgTime: avgTime.toFixed(1),
      mostTimeSpent,
      best,
      worst,
    })
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

  return { answers, summary, insights, loading, deleteAnswer }
}
