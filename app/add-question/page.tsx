'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import ThemedLayout from "@/components/ThemedLayout";
import Papa from "papaparse";

const choiceLabels = ["ก", "ข", "ค", "ง"];

export default function AddQuestionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "csv">("manual");

  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState(4);
  const [csvText, setCsvText] = useState("");

  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [existingTopics, setExistingTopics] = useState<string[]>([]);

  const resetManualForm = () => {
    setQuestion("");
    setChoices(["", "", "", ""]);
    setCorrectIndex(0);
  };

  useEffect(() => {
    // ตรวจสอบ guest mode - ไม่อนุญาตให้ guest เพิ่มข้อสอบ
    const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
    if (isGuestMode) {
      router.push("/dashboard");
      return;
    }

    const loadMeta = async () => {
      const snap = await getDocs(collection(db, "questions"));
      const subSet = new Set<string>();
      const topicSet = new Set<string>();
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.subject) subSet.add(data.subject);
        if (data.topic) topicSet.add(data.topic);
      });
      setExistingSubjects([...subSet]);
      setExistingTopics([...topicSet]);
    };
    loadMeta();
  }, []);

  const handleSubmit = async () => {
    if (!question.trim() || choices.some((c) => !c.trim()) || !subject.trim() || !topic.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    await addDoc(collection(db, "questions"), {
      question,
      choices,
      correctIndex,
      subject,
      topic,
      grade,
      createdAt: serverTimestamp(),
    });

    alert("✅ เพิ่มโจทย์แล้ว!");
    resetManualForm();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvText || !subject.trim() || !topic.trim() || !grade) {
      alert("เติม subject / topic / grade ให้ครบก่อน import");
      return;
    }

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];

        for (const row of data) {
          if (!row.question || !row.choice1 || !row.correctIndex) continue;

          await addDoc(collection(db, "questions"), {
            question: row.question,
            choices: [row.choice1, row.choice2, row.choice3, row.choice4],
            correctIndex: Number(row.correctIndex) - 1,
            subject,
            topic,
            grade,
            createdAt: serverTimestamp(),
          });
        }

        alert("🚀 อัปโหลดสำเร็จ!");
        setCsvText("");
      },
    });
  };

  const handleChoiceChange = (i: number, value: string) => {
    const updated = [...choices];
    updated[i] = value;
    setChoices(updated);
  };

  return (
    <ThemedLayout>
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">📘 เพิ่มข้อสอบใหม่</h1>

        {/* Toggle Mode */}
        <div className="flex justify-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="manual"
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
            />
            ✍️ พิมพ์เองทีละข้อ
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="csv"
              checked={mode === "csv"}
              onChange={() => setMode("csv")}
            />
            📥 นำเข้า CSV
          </label>
        </div>

        {/* Meta: Subject, Topic, Grade */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* วิชา */}
          <div>
            <label className="text-sm font-medium">วิชา</label>
            <select
              className="w-full border p-2 rounded"
              value={subject}
              onChange={(e) => {
                if (e.target.value === "__new") {
                  const custom = prompt("พิมพ์ชื่อวิชาใหม่:");
                  if (custom) setSubject(custom);
                } else {
                  setSubject(e.target.value);
                }
              }}
            >
              <option value="">-- เลือกวิชา --</option>
              {existingSubjects.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
              <option value="__new">➕ เพิ่มวิชาใหม่...</option>
            </select>
          </div>

          {/* หัวข้อ */}
          <div>
            <label className="text-sm font-medium">หัวข้อ</label>
            <select
              className="w-full border p-2 rounded"
              value={topic}
              onChange={(e) => {
                if (e.target.value === "__new") {
                  const custom = prompt("พิมพ์ชื่อหัวข้อใหม่:");
                  if (custom) setTopic(custom);
                } else {
                  setTopic(e.target.value);
                }
              }}
            >
              <option value="">-- เลือกหัวข้อ --</option>
              {existingTopics.map((t, i) => (
                <option key={i} value={t}>{t}</option>
              ))}
              <option value="__new">➕ เพิ่มหัวข้อใหม่...</option>
            </select>
          </div>

          {/* ระดับชั้น */}
          <div>
            <label className="text-sm font-medium">ระดับชั้น</label>
            <select
              className="w-full border p-2 rounded"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              {[4, 5, 6].map((g) => (
                <option key={g} value={g}>ป.{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Manual Mode */}
        {mode === "manual" && (
          <div className="bg-gray-50 p-6 rounded-xl space-y-4 shadow">
            <input
              placeholder="พิมพ์คำถามตรงนี้"
              className="w-full border p-2 rounded"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            {choices.map((c, i) => (
              <input
                key={i}
                className="w-full border p-2 rounded"
                placeholder={`ตัวเลือก ${choiceLabels[i]}`}
                value={c}
                onChange={(e) => handleChoiceChange(i, e.target.value)}
              />
            ))}
            <select
              value={correctIndex}
              onChange={(e) => setCorrectIndex(Number(e.target.value))}
              className="w-full border p-2 rounded"
            >
              {choiceLabels.map((c, i) => (
                <option key={i} value={i}>✅ คำตอบที่ถูก: {c}</option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
            >
              ➕ เพิ่มโจทย์นี้
            </button>
          </div>
        )}

        {/* CSV Upload Mode */}
        {mode === "csv" && (
          <div className="bg-white p-6 rounded-xl space-y-4 shadow">
            <input
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="border p-2 rounded w-full"
            />
            <button
              onClick={handleImport}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              📤 อัปโหลดเข้า Firebase
            </button>
          </div>
        )}
      </main>
    </ThemedLayout>
  );
}
