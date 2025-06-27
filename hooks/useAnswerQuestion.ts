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
import { normalizeKey } from "@/lib/normalizeKey";

interface Props {
  user: any;
}

export default function useAnswerQuestion({ user }: Props) {
  const [loading, setLoading] = useState(false);

  const answer = async ({
    question,
    selectedIndex,
    confidenceLevel,
    correct,
    timeStart, // ✅ รับเวลาที่เริ่มทำข้อสอบเข้ามา
  }: {
    question: any;
    selectedIndex: number;
    confidenceLevel: "confident" | "not_confident" | "guess";
    correct?: boolean;
    timeStart: number; // ✅ เป็น Date.now() จากหน้าทำข้อสอบ
  }) => {
    if (!user?.uid) return;

    setLoading(true);

    try {
      const alreadyAnsweredQuery = query(
        collection(db, "user_answers"),
        where("userId", "==", user.uid),
        where("questionId", "==", question.id)
      );
      const alreadyAnswered = await getDocs(alreadyAnsweredQuery);

      if (alreadyAnswered.empty) {
        // ✅ fallback + validation
        const correctValue =
          typeof correct === "boolean"
            ? correct
            : selectedIndex === question.correctIndex;

        // ✅ คำนวณเวลาที่ใช้จาก timeStart
        const elapsed = Math.floor((Date.now() - timeStart) / 1000);
        const safeTimeSpent = elapsed >= 0 && elapsed <= 3600 ? elapsed : 0;

        const newAnswer = {
          userId: user.uid,
          questionId: question.id ?? "unknown",
          subject: question.subject ?? "ไม่ระบุ",
          topic: question.topic ?? "ไม่ระบุ",
          normalizedKey: normalizeKey(question.subject, question.topic),
          correct: correctValue,
          score: correctValue ? 1 : 0,
          timeSpent: safeTimeSpent, // ✅ ใช้เวลาแบบ real
          confidenceLevel: confidenceLevel ?? "not_confident",
          createdAt: serverTimestamp(),

          // 👉 สำหรับวิเคราะห์เพิ่มเติม
          selectedIndex: typeof selectedIndex === "number" ? selectedIndex : -1,
          choices: Array.isArray(question.choices) ? question.choices : [],
          questionText: question.question ?? "",
        };

        await addDoc(collection(db, "user_answers"), newAnswer);

        if (correctValue) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { points: increment(10) });
        }
      }
    } catch (error) {
      console.error("❌ Error saving answer:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    answer,
    loading,
  };
}
