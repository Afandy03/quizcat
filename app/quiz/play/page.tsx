'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import ThemedLayout from "@/components/ThemedLayout";
import ChatBot from "@/components/ChatBot";
import ProgressBar from "@/components/ProgressBar";
import ChoiceButton from "@/components/ChoiceButton";
import CurrentQuestion from "@/components/CurrentQuestion";
import ConfidenceSelector from "@/components/ConfidenceSelector";
import QuizSummary from "@/components/QuizSummary";

import { useUserTheme } from "@/lib/useTheme";
import useLoadQuestions from "@/hooks/useLoadQuestions";
import useAnswerQuestion from "@/hooks/useAnswerQuestion";
import useElapsedTime from "@/hooks/useElapsedTime";

export default function QuizPlayPage() {
  const [current, setCurrent] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<"confident" | "not_confident" | "guess">("confident");
  const [answered, setAnswered] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<{
    elapsed: number;
    correct: boolean;
  } | null>(null);

  // ✅ ใช้ Hook ที่ย้ายมาใหม่
  const { elapsedTime, totalElapsedTime } = useElapsedTime(current);

  const { questions, loading, error } = useLoadQuestions();
  const theme = useUserTheme();
  const router = useRouter();

  const { answer, loading: answerLoading } = useAnswerQuestion({
    user,
    onScoreUpdate: setScore,
  });

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

  const handleConfirmAnswer = async () => {
    if (selectedIndex === null || isAnswering || finished || answerLoading) return;

    setIsAnswering(true);
    const q = questions[current];

    await answer({
      question: q,
      selectedIndex,
      confidenceLevel,
      timeStart: elapsedTime,
      currentScore: score,
    });

    const isCorrect = selectedIndex === q.correctIndex;
    setLastResult({ elapsed: elapsedTime, correct: isCorrect });

    const updatedAnswered = [...new Set([...answered, current])];
    setAnswered(updatedAnswered);

    setTimeout(() => {
      const unansweredQuestions = questions
        .map((_, index) => index)
        .filter(index => !updatedAnswered.includes(index));

      if (unansweredQuestions.length > 0) {
        setCurrent(unansweredQuestions[0]);
      } else {
        setFinished(true);
      }

      setSelectedIndex(null);
      setIsAnswering(false);
      setConfidenceLevel("confident");
    }, 1500);
  };

  const onSkip = () => {
    const unanswered = questions
      .map((_, i) => i)
      .filter(i => !answered.includes(i) && i !== current);
    const nextUnansweredIndex = unanswered.find(i => i > current);
    const firstUnansweredIndex = unanswered[0];
    setSkipped(prev => [...new Set([...prev, current])]);
    if (nextUnansweredIndex !== undefined) {
      setCurrent(nextUnansweredIndex);
    } else if (firstUnansweredIndex !== undefined) {
      setCurrent(firstUnansweredIndex);
    } else {
      setFinished(true);
    }
  };

  if (loading) return <ThemedLayout><p className="p-6 text-gray-500">⏳ กำลังโหลด...</p></ThemedLayout>;
  if (error) return <ThemedLayout><p className="p-6 text-red-500">{error}</p></ThemedLayout>;
  if (questions.length === 0) return null;

  const q = questions[current];

  return (
    <ThemedLayout>
      <main className="p-6 text-center space-y-4 max-w-2xl mx-auto">
        {!finished ? (
          <>
            <ProgressBar
              questions={questions}
              current={current}
              skipped={skipped}
              answered={answered}
              isAnswering={isAnswering}
              onSelect={(i) => {
                if (!answered.includes(i)) {
                  setCurrent(i);
                }
              }}
            />

            <CurrentQuestion question={q} current={current} />

            <div className="flex justify-end">
              <button
                onClick={() => setShowChat(true)}
                disabled={isAnswering}
                className="flex items-center gap-2 text-sm text-white bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2 rounded-full shadow-md hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💬 ถามบังฟันดี้
              </button>
            </div>



            <ChatBot
              show={showChat}
              onClose={() => setShowChat(false)}
              question={q.question}
              choices={q.choices}
            />

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
                  onSelect={() => {
                    if (!isAnswering) {
                      setSelectedIndex(index);
                    }
                  }}
                />
              ))}
            </div>

            {selectedIndex !== null && !isAnswering && (
              <div className="mt-4">
                <button
                  onClick={handleConfirmAnswer}
                  disabled={answerLoading}
                  className="w-full px-6 py-4 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {answerLoading ? 'กำลังส่งคำตอบ...' : '✅ ยืนยันคำตอบ'}
                </button>
              </div>
            )}

            <div className="flex justify-center gap-2 mt-4 text-sm">
              <button
                onClick={onSkip}
                disabled={isAnswering}
                className="px-5 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl shadow-md hover:from-gray-700 hover:to-black disabled:opacity-50"
              >
                ⏭️ ข้ามข้อนี้ไปก่อน
              </button>
            </div>

            <ConfidenceSelector
              value={confidenceLevel}
              onChange={(level) => setConfidenceLevel(level)}
            />

            <div className="text-sm text-gray-800 bg-white rounded-xl shadow-inner px-6 py-4 space-y-1 border border-gray-200 text-left">
              <div className="flex justify-between items-center">
                <span>⏱ เวลาข้อนี้:</span>
                <span className="font-bold text-blue-600">{elapsedTime} วินาที</span>
              </div>
              <div className="flex justify-between items-center">
                <span>⌛ เวลารวม:</span>
                <span className="font-bold text-indigo-500">{totalElapsedTime} วินาที</span>
              </div>
              <div className="flex justify-between items-center">
                <span>💰 แต้มสะสม:</span>
                <span className="font-bold text-green-600">{score} แต้ม</span>
              </div>
              <div className={`flex justify-between items-center pt-2 border-t mt-2 text-sm ${lastResult ? 'visible' : 'invisible'}`}>
                <span>ผลลัพธ์ข้อที่ผ่านมา:</span>
                {lastResult?.correct ? (
                  <span className="text-green-600 font-bold">🎯 +10 แต้ม</span>
                ) : (
                  <span className="text-red-500 font-bold">❌ ไม่ได้แต้ม</span>
                )}
              </div>
            </div>
          </>
        ) : (
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