'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import ThemedLayout from "@/components/ThemedLayout";

export default function QuizSelectPage() {
  const router = useRouter();
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [grades, setGrades] = useState<number[]>([]);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      const snap = await getDocs(collection(db, "questions"));
      const qList = snap.docs.map(doc => doc.data());
      setAllQuestions(qList);

      const uniqueSubjects = [...new Set(qList.map(q => q.subject))];
      setSubjects(uniqueSubjects);
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setTopics([]);
      setGrades([]);
      return;
    }

    const filtered = allQuestions.filter(q => q.subject === selectedSubject);
    const uniqueTopics = [...new Set(filtered.map(q => q.topic))];
    const uniqueGrades = [...new Set(filtered.map(q => q.grade))];

    setTopics(uniqueTopics);
    setGrades(uniqueGrades.sort((a, b) => a - b));
  }, [selectedSubject, allQuestions]);

  const handleStart = () => {
    const query = new URLSearchParams();
    if (selectedSubject) query.set("subject", selectedSubject);
    if (selectedTopic) query.set("topic", selectedTopic);
    if (selectedGrade) query.set("grade", selectedGrade);
    router.push(`/quiz/play?${query.toString()}`);
  };

  return (
    <ThemedLayout>
      <main className="p-6 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">🧠 เลือกแบบฝึกหัด</h1>

        <div className="space-y-3">
          <div>
            <label className="block font-medium">เลือกวิชา:</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic("");
                setSelectedGrade("");
              }}
            >
              <option value="">-- เลือกวิชา --</option>
              {subjects.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium">เลือกหมวด:</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!topics.length}
            >
              <option value="">-- เลือกหมวด --</option>
              {topics.map((t, i) => (
                <option key={i} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium">เลือกระดับชั้น:</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              disabled={!grades.length}
            >
              <option value="">-- เลือกระดับชั้น --</option>
              {grades.map((g, i) => (
                <option key={i} value={g}>ป.{g <= 6 ? g : g - 6}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center pt-4">
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50"
            onClick={handleStart}
            disabled={!selectedSubject}
          >
            🚀 เริ่มทำข้อสอบ
          </button>
        </div>
      </main>
    </ThemedLayout>
  );
}
