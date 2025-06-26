'use client'

import { useEffect, useState, useCallback } from "react";
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
  query, // เพิ่ม import
  where,   // เพิ่ม import
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ThemedLayout from "@/components/ThemedLayout";
import { useUserTheme } from "@/lib/useTheme";

export default function QuizPlayPage() {
  // --- State เดิม ---
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
  const [confidenceLevel, setConfidenceLevel] = useState<"confident" | "not_confident" | "guess">("confident");

  // --- State ใหม่สำหรับฟีเจอร์ที่เพิ่มเข้ามา ---
  const [timeLeft, setTimeLeft] = useState(30); // ✅ 2. State สำหรับ Countdown Timer (30 วินาที)
  const [skipped, setSkipped] = useState<number[]>([]); // ✅ 3. State สำหรับเก็บข้อที่ข้าม

  const router = useRouter();
  const theme = useUserTheme();
  const searchParams = useSearchParams();

  // ✅ 3. ฟังก์ชันสำหรับจัดการการข้ามข้อ
  const handleSkip = useCallback(() => {
    // ป้องกันการกดข้ามระหว่างรอผล
    if (isAnswering) return;

    // เพิ่ม index ของข้อปัจจุบันลงใน array 'skipped'
    const newSkipped = [...skipped, current];
    setSkipped(newSkipped);

    // หาข้อถัดไปที่ยังไม่ได้ทำและยังไม่ได้ข้าม
    const remainingQuestions = questions.map((_, i) => i).filter(i => !newSkipped.includes(i));

    if (remainingQuestions.length > 0 && remainingQuestions.some(i => i > current)) {
      // ไปยังข้อถัดไปที่ยังไม่ได้ทำ
      setCurrent(remainingQuestions.find(i => i > current)!);
    } else if (newSkipped.length < questions.length) {
      // ถ้าไม่มีข้อถัดไปแล้ว แต่ยังมีข้อที่ข้ามไว้ ให้กลับไปทำข้อแรกที่ข้ามไว้
      const nextSkippedIndex = questions.map((_, i) => i).find(i => newSkipped.includes(i))!;
      setCurrent(nextSkippedIndex);
    } else {
      // ถ้าทำครบทุกข้อแล้ว (ไม่มีข้อเหลือและไม่มีข้อที่ข้าม)
      setFinished(true);
    }
  }, [current, questions.length, skipped, isAnswering]);

  // ✅ 2. ฟังก์ชันสำหรับส่งคำตอบอัตโนมัติเมื่อหมดเวลา
  const handleAutoSubmit = useCallback(() => {
    // ทำเหมือนการกดข้ามเมื่อเวลาหมด
    handleSkip();
  }, [handleSkip]);

  // ✅ 2. Effect สำหรับนับถอยหลัง
  useEffect(() => {
    // ไม่ต้องนับเวลาถ้าทำข้อสอบเสร็จแล้ว หรือกำลังแสดงผล
    if (finished || isAnswering) return;

    setTimeLeft(300); // รีเซ็ตเวลาเป็น 300 วินาทีทุกครั้งที่เริ่มข้อใหม่

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit(); // ส่งคำตอบอัตโนมัติ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clear interval เมื่อ component unmount หรือ current เปลี่ยน
    return () => clearInterval(timer);
  }, [current, finished, isAnswering, handleAutoSubmit]);

  useEffect(() => {
    // ... โค้ดส่วน onAuthStateChanged และ loadQuestions เหมือนเดิม ...
    const unsubscribe = onAuthStateChanged(auth, (u) => {
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

        if (subject) qList = qList.filter(q => q.subject === subject);
        if (topic) qList = qList.filter(q => q.topic === topic);

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
  const answeredQuestions = new Set(questions.map((_, i) => i).filter(i => !skipped.includes(i)));

  return (
    <ThemedLayout>
      <main className="p-6 text-center space-y-4 max-w-2xl mx-auto">
        {!finished ? (
          <>
            {/* ✅ 5. Progress bar / แถบข้อสอบ */}
            <div className="flex gap-1 justify-center text-xs text-white">
              {questions.map((_, i) => {
                const isCurrent = i === current;
                const isSkipped = skipped.includes(i);
                const isAnswered = !isSkipped && i < current;

                let bgColor = "bg-gray-300"; // ยังไม่ได้ทำ
                if (isCurrent) bgColor = "bg-blue-600 animate-pulse"; // ข้อปัจจุบัน
                if (isSkipped) bgColor = "bg-yellow-400"; // ข้อที่ข้าม
                if (isAnswered) bgColor = "bg-green-500"; // ข้อที่ตอบแล้ว

                return (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${bgColor}`}
                    title={`ข้อที่ ${i + 1}`}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>

            <h1 className="text-xl font-bold">ข้อที่ {current + 1} <span className="text-base font-normal text-gray-500">(เหลือเวลา {timeLeft} วินาที)</span></h1>
            <p className="text-sm text-gray-500">🧠 วิชา: {q.subject || "?"} / หมวด: {q.topic || "?"}</p>
            <p className="font-medium">{q.question}</p>



            {/* ... ส่วน Chat บอทด้านล่าง ... */}

            {!selectedIndex && (
              <div className="text-sm text-blue-600">
                <button onClick={() => setShowChat(true)}>💬 ถามบังฟันดี้</button>
              </div>
            )}

            {showChat && (
              <div className="bg-white border border-gray-300 rounded-xl shadow-md p-4 mt-4 text-left space-y-3 text-sm">
                {/* Header */}
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-blue-600">🤖 บังฟันดี้อยู่ตรงนี้ ถามได้เลย</p>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-xs text-gray-500 hover:text-red-500 transition"
                  >
                    ❌ ปิด
                  </button>
                </div>

                {/* Log */}
                <div className="max-h-52 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md px-3 py-2 space-y-1">
                  {chatLog.length === 0 ? (
                    <p className="text-gray-400">ยังไม่มีข้อความ</p>
                  ) : (
                    chatLog.map((msg, i) => (
                      <p
                        key={i}
                        className={
                          msg.startsWith("คุณ:")
                            ? "text-right text-blue-700"
                            : "text-left text-gray-700"
                        }
                      >
                        {msg}
                      </p>
                    ))
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!chatInput.trim()) return;

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
                    setChatLog((prev) => [
                      ...prev,
                      `คุณ: ${chatInput}`,
                      `บังฟันดี้: ${data.reply || "…"}`,
                    ]);
                    setChatInput("");
                  }}
                  className="flex gap-2"
                >
                  <input
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="พิมพ์ถามบัง เช่น เริ่มยังไงดี?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    ส่ง
                  </button>
                </form>
              </div>
            )}




            {/* ... ส่วน Chat บอทจบแค่บรรทัดนี้... */}


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

                      // ✅ 4. Popup ยืนยันก่อนตอบ
                      const confirmAnswer = window.confirm("ยืนยันคำตอบนี้ใช่หรือไม่?");
                      if (!confirmAnswer) {
                        return; // ถ้าไม่ยืนยัน ก็หยุดการทำงาน
                      }

                      setIsAnswering(true);
                      setSelectedIndex(index);

                      const correct = index === q.correctIndex;
                      const elapsed = Math.floor((Date.now() - timeStart) / 1000);
                      setLastElapsed(elapsed);

                      if (user) {
                        // ✅ 1. กันตอบซ้ำ
                        const alreadyAnsweredQuery = query(
                          collection(db, "user_answers"),
                          where("userId", "==", user.uid),
                          where("questionId", "==", q.id)
                        );
                        const alreadyAnswered = await getDocs(alreadyAnsweredQuery);

                        if (alreadyAnswered.empty) {
                          // ถ้ายังไม่เคยตอบข้อนี่้ ให้บันทึกคำตอบ
                          await addDoc(collection(db, "user_answers"), {
                            userId: user.uid,
                            questionId: q.id,
                            subject: q.subject,      // เพิ่มดึง subject/topic มาด้วยเลย
                            topic: q.topic,
                            correct,
                            timeSpentSec: elapsed,
                            confidenceLevel,         // 'confident' | 'not_confident' | 'guess'
                            createdAt: serverTimestamp(),
                          })

                          if (correct) {
                            const userRef = doc(db, "users", user.uid);
                            await updateDoc(userRef, { points: increment(10) });
                            setScore(score + 10);
                          }
                        } else {
                          // อาจจะแจ้งเตือนว่าเคยตอบไปแล้ว หรือไม่ทำอะไรเลย
                          console.log("ข้อนี่้เคยตอบไปแล้ว");
                        }
                      }

                      setTimeout(() => {
                        setIsAnswering(false);
                        setSelectedIndex(null);
                        setConfidenceLevel("confident");
                        setTimeStart(Date.now());

                        // นำข้อที่เพิ่งตอบออกจาก array 'skipped' (ถ้ามี)
                        const newSkipped = skipped.filter(item => item !== current);
                        setSkipped(newSkipped);

                        const remainingQuestions = questions.map((_, i) => i).filter(i => i !== current && !newSkipped.includes(i));
                        const nextUnanswered = remainingQuestions.find(i => i > current);

                        if (nextUnanswered !== undefined) {
                          setCurrent(nextUnanswered);
                        } else if (newSkipped.length > 0) {
                          // ถ้าไม่มีข้อที่ยังไม่ตอบเหลืออยู่ข้างหน้า ให้ไปทำข้อที่ข้ามไว้
                          setCurrent(newSkipped[0]);
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


            {/* ปุ่มข้าม */}
            <div className="flex justify-center gap-2 mt-4 text-sm">
              <button
                onClick={handleSkip}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                ⏭️ ข้ามข้อนี้ไปก่อน
              </button>
            </div>

            {/* ปุ่มเลือกความมั่นใจ */}
            <div className="flex justify-center gap-2 mt-2 text-sm">
              <button
                onClick={() => setConfidenceLevel("guess")}
                className={`px-3 py-1 rounded-full ${confidenceLevel === "guess" ? "bg-yellow-200" : "bg-gray-200"}`}
              >
                😕 เดา
              </button>
              <button
                onClick={() => setConfidenceLevel("not_confident")}
                className={`px-3 py-1 rounded-full ${confidenceLevel === "not_confident" ? "bg-yellow-300" : "bg-gray-200"}`}
              >
                😬 ไม่มั่นใจ
              </button>
              <button
                onClick={() => setConfidenceLevel("confident")}
                className={`px-3 py-1 rounded-full ${confidenceLevel === "confident" ? "bg-green-300" : "bg-gray-200"}`}
              >
                😎 มั่นใจ
              </button>
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
    </ThemedLayout >
  );
}