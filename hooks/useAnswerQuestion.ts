import { useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  user: any;
  onScoreUpdate?: (score: number) => void;
  onAnswered?: () => void;
}

export default function useAnswerQuestion({ user, onScoreUpdate, onAnswered }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastElapsed, setLastElapsed] = useState<number | null>(null);

  const answer = async ({
    question,
    selectedIndex,
    confidenceLevel,
    timeStart,
    currentScore,
  }: {
    question: any;
    selectedIndex: number;
    confidenceLevel: "confident" | "not_confident" | "guess";
    timeStart: number;
    currentScore: number;
  }) => {
    if (!user) return;

    setLoading(true);

    const correct = selectedIndex === question.correctIndex;
    const elapsed = Math.floor((Date.now() - timeStart) / 1000);
    setLastElapsed(elapsed);

    const alreadyAnsweredQuery = query(
      collection(db, "user_answers"),
      where("userId", "==", user.uid),
      where("questionId", "==", question.id)
    );

    const alreadyAnswered = await getDocs(alreadyAnsweredQuery);

    const newAnswer = {
      userId: user.uid,
      questionId: question.id,
      subject: question.subject,
      topic: question.topic,
      correct,
      score: correct ? 1 : 0, // ✅ เพิ่ม score
      timeSpent: elapsed,     // ✅ ใช้ชื่อให้ตรงกับ Analysis
      confidenceLevel,
      createdAt: serverTimestamp(),
    };

    if (alreadyAnswered.empty) {
      await addDoc(collection(db, "user_answers"), newAnswer);

      // ✅ อัปเดตแต้มใน Firestore
      if (correct) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { points: increment(10) });
        onScoreUpdate?.(currentScore + 10);
      }

      // ✅ เก็บลง localStorage ด้วย
      const localAnswer = {
        question: question.question,
        answer: question.choices?.[selectedIndex],
        correct,
        subject: question.subject,
        topic: question.topic,
        score: correct ? 1 : 0,
        timeSpent: elapsed,
        type: question.type,
      };

      const existing = JSON.parse(localStorage.getItem("answers") || "[]");
      localStorage.setItem("answers", JSON.stringify([...existing, localAnswer]));
    }

    setLoading(false);
    onAnswered?.();
  };

  return {
    answer,
    loading,
    elapsedAfterAnswer: lastElapsed,
  };
}
