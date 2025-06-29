'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import ThemedLayout from "@/components/ThemedLayout";
import ChatBot from "@/components/ChatBot";
import ProgressBar from "@/components/ProgressBar";
import ChoiceButton from "@/components/ChoiceButton";
import CurrentQuestionDisplay from "@/components/CurrentQuestionDisplay";
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
      setUser(u);
      
      // ตรวจสอบ guest mode
      if (!u) {
        const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
        if (!isGuestMode) {
          router.push("/login");
        }
      } else {
        // ถ้า login แล้ว ลบ guest session
        localStorage.removeItem('quizcat-guest-mode')
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

  if (loading) return <ThemedLayout><p className="p-6" style={{ color: theme.textColor + '80' }}>⏳ กำลังโหลด...</p></ThemedLayout>;
  if (error) return <ThemedLayout><p className="p-6" style={{ color: '#ef4444' }}>{error}</p></ThemedLayout>;
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

            <CurrentQuestionDisplay question={q} current={current} />

            <div className="flex justify-end">
              <button
                onClick={() => setShowChat(true)}
                disabled={isAnswering}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
                style={{
                  background: 'linear-gradient(to right, #3b82f6, #1d4ed8)',
                  color: '#ffffff'
                }}
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
                  className="w-full px-6 py-4 rounded-xl shadow-lg font-bold text-lg disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff'
                  }}
                >
                  {answerLoading ? 'กำลังส่งคำตอบ...' : '✅ ยืนยันคำตอบ'}
                </button>
              </div>
            )}

            <div className="flex justify-center gap-2 mt-4 text-sm">
              <button
                onClick={onSkip}
                disabled={isAnswering}
                className="px-5 py-3 rounded-xl shadow-md disabled:opacity-50 hover:opacity-80 transition-opacity"
                style={{
                  background: 'linear-gradient(to right, #4b5563, #1f2937)',
                  color: '#ffffff'
                }}
              >
                ⏭️ ข้ามข้อนี้ไปก่อน
              </button>
            </div>

            <ConfidenceSelector
              value={confidenceLevel}
              onChange={(level) => setConfidenceLevel(level)}
            />

            <div 
              className="text-sm rounded-xl shadow-inner px-6 py-4 space-y-1 border text-left"
              style={{
                color: theme.textColor,
                backgroundColor: theme.bgColor,
                borderColor: theme.textColor + '20'
              }}
            >
              <div className="flex justify-between items-center">
                <span>⏱ เวลาข้อนี้:</span>
                <span className="font-bold" style={{ color: '#3b82f6' }}>{elapsedTime} วินาที</span>
              </div>
              <div className="flex justify-between items-center">
                <span>⌛ เวลารวม:</span>
                <span className="font-bold" style={{ color: '#6366f1' }}>{totalElapsedTime} วินาที</span>
              </div>
              <div className="flex justify-between items-center">
                <span>💰 แต้มสะสม:</span>
                <span className="font-bold" style={{ color: '#10b981' }}>{score} แต้ม</span>
              </div>
              <div 
                className={`flex justify-between items-center pt-2 border-t mt-2 text-sm ${lastResult ? 'visible' : 'invisible'}`}
                style={{ borderColor: theme.textColor + '20' }}
              >
                <span>ผลลัพธ์ข้อที่ผ่านมา:</span>
                {lastResult?.correct ? (
                  <span className="font-bold" style={{ color: '#10b981' }}>🎯 +10 แต้ม</span>
                ) : (
                  <span className="font-bold" style={{ color: '#ef4444' }}>❌ ไม่ได้แต้ม</span>
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