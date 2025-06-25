'use client'

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ThemedLayout from "@/components/ThemedLayout";
import { useUserTheme } from "@/lib/useTheme";

export default function QuizPlayPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [timeStart, setTimeStart] = useState<number>(Date.now());
  const [lastElapsed, setLastElapsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const theme = useUserTheme();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
    });

    const loadQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, "questions"));
        let qList = qSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        const subject = searchParams.get("subject");
        const topic = searchParams.get("topic");
        const grade = searchParams.get("grade");

        console.log("🔍 Filter", { subject, topic, grade });

        if (subject) qList = qList.filter(q => q.subject === subject);
        if (topic) qList = qList.filter(q => q.topic === topic);
        if (grade) qList = qList.filter(q => String(q.grade) === grade);

        if (qList.length === 0) {
          setError("❌ ไม่พบข้อสอบตามที่เลือก");
        } else {
          setQuestions(qList.sort(() => Math.random() - 0.5));
        }
      } catch (e) {
        console.error(e);
        setError("🔥 โหลดข้อสอบล้มเหลว");
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
    return () => unsubscribe();
  }, [router, searchParams]);

  if (loading) return <ThemedLayout><p className="p-6 text-gray-500">⏳ กำลังโหลด...</p></ThemedLayout>;
  if (error) return <ThemedLayout><p className="p-6 text-red-500">{error}</p></ThemedLayout>;
  if (questions.length === 0) return null;

  const q = questions[current];

  return (
    <ThemedLayout>
      <main className="p-6 text-center space-y-4 max-w-2xl mx-auto">
        {!finished ? (
          <>
            <h1 className="text-xl font-bold">ข้อที่ {current + 1}</h1>
            <p className="text-sm text-gray-500">🧠 วิชา: {q.subject || "?"} / หมวด: {q.topic || "?"}</p>
            <p className="font-medium">{q.question}</p>

            {!selectedIndex && (
              <div className="text-sm text-blue-600">
                <button onClick={() => setShowChat(true)}>💬 ถามบังฟันดี้</button>
              </div>
            )}

            {showChat && (
              <div className="bg-gray-100 p-3 rounded-md mt-3 text-left text-sm space-y-2">
                <p className="font-semibold text-blue-600">บังฟันดี้อยู่ตรงนี้ ถามได้เลย</p>
                <div className="max-h-40 overflow-y-auto border p-2 bg-white rounded-md">
                  {chatLog.map((msg, i) => <p key={i}>{msg}</p>)}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    className="flex-1 border p-2 rounded-md"
                    placeholder="พิมพ์ถามบัง เช่น เริ่มยังไงดี?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    className="bg-blue-600 text-white px-3 py-2 rounded-md"
                    onClick={async () => {
                      const res = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          question: q.question,
                          choices: q.choices,
                          userMessage: chatInput,
                        }),
                      });
                      const data = await res.json();
                      setChatLog(prev => [...prev, `คุณ: ${chatInput}`, `บังฟันดี้: ${data.reply || "…"}`]);
                      setChatInput("");
                    }}
                  >
                    ส่ง
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-4">
              {q.choices.map((choice: string, index: number) => {
                const isSelected = index === selectedIndex;
                const isCorrect = q.correctIndex === index;

                let bg = theme.textColor;
                let text = theme.bgColor;

                if (selectedIndex !== null) {
                  if (isSelected && isCorrect) {
                    bg = "#16a34a"; text = "#fff";
                  } else if (isSelected && !isCorrect) {
                    bg = "#dc2626"; text = "#fff";
                  } else {
                    bg = "#e5e7eb"; text = "#000";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={async () => {
                      if (isAnswering || finished) return;
                      setIsAnswering(true);
                      setSelectedIndex(index);

                      const correct = index === q.correctIndex;
                      const elapsed = Math.floor((Date.now() - timeStart) / 1000);
                      setLastElapsed(elapsed);

                      if (user) {
                        await addDoc(collection(db, "user_answers"), {
                          userId: user.uid,
                          questionId: q.id,
                          correct,
                          timeSpentSec: elapsed,
                          createdAt: serverTimestamp(),
                        });

                        if (correct) {
                          const userRef = doc(db, "users", user.uid);
                          await updateDoc(userRef, { points: increment(10) });
                          setScore(score + 10);
                        }
                      }

                      setTimeout(() => {
                        setIsAnswering(false);
                        setSelectedIndex(null);
                        setShowChat(false);
                        setChatInput("");
                        setChatLog([]);
                        setTimeStart(Date.now());

                        if (current + 1 < questions.length) {
                          setCurrent(current + 1);
                        } else {
                          setFinished(true);
                        }
                      }, 1500);
                    }}
                    className="block font-medium px-4 py-3 rounded-xl w-full shadow-md transition-opacity hover:opacity-80"
                    disabled={selectedIndex !== null}
                    style={{ backgroundColor: bg, color: text }}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {lastElapsed !== null && (
              <p className="text-sm text-gray-600 pt-2">
                🕒 ใช้เวลา {lastElapsed} วินาทีในข้อนี้ | 🎯 แต้มปัจจุบัน: {score}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-green-600">🎉 ทำครบแล้ว!</h1>
            <p className="text-lg font-semibold">คุณได้คะแนน {score} / {questions.length * 10} แต้ม</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
            >
              กลับหน้า Dashboard
            </button>
          </>
        )}
      </main>
    </ThemedLayout>
  );
}
