'use client'

// 🧩 นำเข้า Component และ Hook ต่างๆ ที่ใช้ในหน้า
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import ThemedLayout from "@/components/ThemedLayout";
import ChatBot from "@/components/ChatBot";
import ProgressBar from "@/components/ProgressBar";
import ChoiceButton from "@/components/ChoiceButton";
import CurrentQuestion from "@/components/CurrentQuestion";
import ConfidenceSelector from "@/components/ConfidenceSelector";
import QuizSummary from "@/components/QuizSummary";

import { useUserTheme } from "@/lib/useTheme";
import useLoadQuestions from "@/hooks/useLoadQuestions";
import useCountdown from "@/hooks/useCountdown";
import useAnswerQuestion from "@/hooks/useAnswerQuestion";
import useQuestionFlow from "@/hooks/useQuestionFlow";

export default function QuizPlayPage() {
  // 📦 เก็บค่าต่างๆ ที่ใช้ในการทำข้อสอบ
  const [current, setCurrent] = useState(0); // ข้อที่กำลังทำ
  const [user, setUser] = useState<any>(null); // ผู้ใช้งาน (login แล้ว)
  const [isAnswering, setIsAnswering] = useState(false); // กำลังตอบอยู่ไหม
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // ตัวเลือกที่กด
  const [score, setScore] = useState(0); // คะแนนรวม
  const [finished, setFinished] = useState(false); // ทำข้อสอบครบหรือยัง
  const [showChat, setShowChat] = useState(false); // เปิด/ปิดบอท
  const [timeStart, setTimeStart] = useState<number>(Date.now()); // เวลาเริ่มทำแต่ละข้อ
  const [confidenceLevel, setConfidenceLevel] = useState<"confident" | "not_confident" | "guess">("confident"); // ระดับความมั่นใจ
  const [answered, setAnswered] = useState<number[]>([]); // ข้อที่ตอบไปแล้ว
  const [skipped, setSkipped] = useState<number[]>([]); // ข้อที่ข้ามไปก่อน

  // 🧠 โหลดคำถามจากฐานข้อมูล
  const { questions, loading, error } = useLoadQuestions();

  // 🎨 ธีมที่ผู้ใช้เลือก
  const theme = useUserTheme();

  // 🔁 router สำหรับ redirect
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔁 ใช้ hook จัดการ logic ข้ามข้อ / ข้อต่อไป
  const { getNextIndex, handleSkip } = useQuestionFlow({ questions, skipped, current });

  // 🕒 ตัวจับเวลานับถอยหลัง
  const timeLeft = useCountdown({
    key: current,
    duration: 3000000, // 50 นาที
    onTimeOut: () => {
      const { nextIndex, updatedSkipped } = handleSkip();
      setSkipped(updatedSkipped);
      if (nextIndex !== null) {
        setCurrent(nextIndex);
      } else {
        setFinished(true);
      }
    },
    paused: finished || isAnswering,
  });

  // ✅ logic การบันทึกคำตอบ
  const {
    answer,
    loading: answerLoading,
    elapsedAfterAnswer, // เวลาที่ใช้ตอบข้อก่อนหน้า
  } = useAnswerQuestion({
    user,
    onScoreUpdate: setScore,
  });

  // 🔒 เช็คว่า login แล้วหรือยัง
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 💡 กดข้ามข้อ
  const onSkip = () => {
    if (isAnswering) return;
    const { nextIndex, updatedSkipped } = handleSkip();
    setSkipped(updatedSkipped);
    if (nextIndex !== null) {
      setCurrent(nextIndex);
    } else {
      setFinished(true);
    }
  };

  // 📭 ถ้ากำลังโหลดหรือ error
  if (loading) return <ThemedLayout><p className="p-6 text-gray-500">⏳ กำลังโหลด...</p></ThemedLayout>;
  if (error) return <ThemedLayout><p className="p-6 text-red-500">{error}</p></ThemedLayout>;
  if (questions.length === 0) return null;

  // 🎯 คำถามปัจจุบัน
  const q = questions[current];

  // ========================
  // 🧾 ส่วนแสดงผลหน้า Quiz
  // ========================
  return (
    <ThemedLayout>
      <main className="p-6 text-center space-y-4 max-w-2xl mx-auto">
        {!finished ? (
          <>
            {/* ✅ แถบข้อสอบ */}
            <ProgressBar
              questions={questions}
              current={current}
              skipped={skipped}
              answered={answered}
              isAnswering={isAnswering}
              onSelect={(i) => setCurrent(i)}
            />

            {/* ✅ แสดงคำถาม */}
            <CurrentQuestion question={q} current={current} timeLeft={timeLeft} />

            {/* ✅ ปุ่มเปิดบอท */}
            {!selectedIndex && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-2 text-sm text-white bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2 rounded-full shadow-md hover:from-blue-600 hover:to-blue-800 transition-all"
                >
                  💬 ถามบังฟันดี้
                </button>
              </div>
            )}

            {/* ✅ กล่องแชท */}
            <ChatBot
              show={showChat}
              onClose={() => setShowChat(false)}
              question={q.question}
              choices={q.choices}
            />

            {/* ✅ ปุ่มตัวเลือกคำตอบ */}
            <div className="space-y-2 pt-4">
              {q.choices.map((choice: string, index: number) => (
                <ChoiceButton
                  key={index}
                  choice={choice}
                  index={index}
                  selectedIndex={selectedIndex}
                  correctIndex={q.correctIndex}
                  isAnswering={isAnswering}
                  finished={finished}
                  theme={theme}
                  onSelect={async () => {
                    if (isAnswering || finished || answerLoading) return;
                    const confirmAnswer = window.confirm("ยืนยันคำตอบนี้ใช่หรือไม่?");
                    if (!confirmAnswer) return;

                    setIsAnswering(true);
                    setSelectedIndex(index);

                    await answer({
                      question: q,
                      selectedIndex: index,
                      confidenceLevel,
                      timeStart,
                      currentScore: score,
                    });

                    setTimeout(() => {
                      setIsAnswering(false);
                      setSelectedIndex(null);
                      setConfidenceLevel("confident");
                      setAnswered((prev) => [...new Set([...prev, current])]);
                      setTimeStart(Date.now());

                      const newSkipped = skipped.filter((item) => item !== current);
                      setSkipped(newSkipped);

                      const remainingQuestions = questions
                        .map((_, i) => i)
                        .filter((i) => i !== current && !newSkipped.includes(i));
                      const nextUnanswered = remainingQuestions.find((i) => i > current);

                      if (nextUnanswered !== undefined) {
                        setCurrent(nextUnanswered);
                      } else if (newSkipped.length > 0) {
                        setCurrent(newSkipped[0]);
                      } else {
                        setFinished(true);
                      }
                    }, 1500);
                  }}
                />
              ))}
            </div>

            {/* ✅ ปุ่มข้าม */}
            <div className="flex justify-center gap-2 mt-4 text-sm">
              <button
                onClick={onSkip}
                className="px-5 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl shadow-md hover:from-gray-700 hover:to-black transition-all duration-200"
              >
                ⏭️ ข้ามข้อนี้ไปก่อน
              </button>
            </div>

            {/* ✅ ปุ่มเลือกความมั่นใจ */}
            <ConfidenceSelector
              value={confidenceLevel}
              onChange={(level) => setConfidenceLevel(level)}
            />

            {/* ✅ เวลาใช้ไป */}
            {elapsedAfterAnswer !== null && (
              <p className="text-sm text-gray-700 pt-4 font-mono bg-gray-100 rounded-md px-4 py-2 inline-block shadow-inner">
                🕒 ใช้เวลา <span className="font-bold text-blue-600">{elapsedAfterAnswer}</span> วินาที | 🎯 แต้ม: <span className="font-bold text-green-600">{score}</span>
              </p>
            )}
          </>
        ) : (
          // ✅ หน้าสรุปผลตอนทำครบ
          <QuizSummary
            score={score}
            maxScore={questions.length * 10}
            onBack={() => router.push("/dashboard")}
          />
        )}
      </main>
    </ThemedLayout>
  );
}
