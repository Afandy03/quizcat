// hooks/useFetchAnswers.ts
import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { normalizeKey } from "@/lib/normalizeKey";
import { collection, getDocs, query, where, doc, deleteDoc } from "firebase/firestore";
import { Answer, SummaryData, Insights } from "@/types"; // ✨ 1. ยืนยันการใช้ Import และลบ interface ในไฟล์นี้ทิ้ง

export function useFetchAnswers() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [summary, setSummary] = useState<SummaryData[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // ✨ 2. ปรับปรุง computeSummary ให้เป็น Pure Function คือคืนค่าออกมาอย่างเดียว
  const computeNewState = useCallback((allAnswers: Answer[]): { newSummary: SummaryData[], newInsights: Insights | null } => {
    if (allAnswers.length === 0) {
      return { newSummary: [], newInsights: null };
    }

    const grouped: Record<string, any> = {};
    const scoreList: number[] = [];
    const timeList: number[] = [];
    const topicTimeMap: Record<string, number> = {};
    const topicScoreMap: Record<string, number[]> = {};

    for (const ans of allAnswers) {
      const key = normalizeKey(ans.subject, ans.topic);
      if (!grouped[key]) {
        grouped[key] = { correct: 0, total: 0, /* ... confidence ... */ };
      }
      // ... (โค้ดใน loop เหมือนเดิม)
      grouped[key].total++;
      if (ans.correct) grouped[key].correct++;
      
      const score = ans.score ?? 0;
      const timeSpent = typeof ans.timeSpent === "number" && ans.timeSpent >= 0 && ans.timeSpent <= 3600 ? ans.timeSpent : 0;
      scoreList.push(score);
      timeList.push(timeSpent);
      topicTimeMap[key] = (topicTimeMap[key] || 0) + timeSpent;
      if (!topicScoreMap[key]) topicScoreMap[key] = [];
      topicScoreMap[key].push(score);
    }

    const summaryList = Object.entries(grouped).map(([key, value]) => ({
      section: key,
      ...value,
      percent: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    }));
    
    const newSummary = [...summaryList].sort((a, b) => a.percent - b.percent);

    const avgScore = scoreList.length > 0 ? scoreList.reduce((s, v) => s + v, 0) / scoreList.length : 0;
    const avgTime = timeList.length > 0 ? timeList.reduce((s, v) => s + v, 0) / timeList.length : 0;
    const mostTimeSpent = [...Object.entries(topicTimeMap)].sort((a, b) => b[1] - a[1])[0] || null;
    const avgScoreByTopic = Object.entries(topicScoreMap).map(([topic, scores]) => ({
      topic,
      avg: scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
    }));
    const best = [...avgScoreByTopic].sort((a, b) => b.avg - a.avg)[0] || null;
    const worst = [...avgScoreByTopic].sort((a, b) => a.avg - b.avg)[0] || null;

    const newInsights = { total: allAnswers.length, avgScore, avgTime, mostTimeSpent, best, worst };

    return { newSummary, newInsights };
  }, []);

  const fetchData = useCallback(async (currentUser: User) => {
    setLoading(true);
    try {
      const q = query(collection(db, "user_answers"), where("userId", "==", currentUser.uid));
      const snap = await getDocs(q);
      const allAnswers = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Answer[];
      
      setAnswers(allAnswers);
      const { newSummary, newInsights } = computeNewState(allAnswers);
      setSummary(newSummary);
      setInsights(newInsights);

    } catch (error) {
      console.error("Failed to fetch answers:", error);
    } finally {
      setLoading(false);
    }
  }, [computeNewState]);

  // ✨ 3. ทำให้ deleteAnswer เสถียรขึ้นด้วย useCallback และจัดการ State อย่างปลอดภัย
  const deleteAnswer = useCallback(async (answerId: string) => {
    try {
      await deleteDoc(doc(db, "user_answers", answerId));
      setAnswers(prevAnswers => {
        const updatedAnswers = prevAnswers.filter(a => a.id !== answerId);
        const { newSummary, newInsights } = computeNewState(updatedAnswers);
        setSummary(newSummary);
        setInsights(newInsights);
        return updatedAnswers;
      });
    } catch (error) {
      console.error("Failed to delete answer:", error);
    }
  }, [computeNewState]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchData(currentUser);
      } else {
        setAnswers([]);
        setSummary([]);
        setInsights(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchData]);

  return { 
    answers, 
    summary, 
    insights, 
    loading, 
    deleteAnswer,
    refetch: () => user && fetchData(user)
  };
}