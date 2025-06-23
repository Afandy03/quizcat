"use client"

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function QuizPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
    });

    const loadQuestions = async () => {
      const qSnap = await getDocs(collection(db, "questions"));
      const qList = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qList.sort(() => Math.random() - 0.5)); // สุ่ม
    };

    loadQuestions();
  }, []);

  const handleAnswer = async (choiceIndex: number) => {
    const q = questions[current];
    const correct = choiceIndex === q.correctIndex;

    if (correct) {
      // เพิ่มแต้ม
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        points: increment(10)
      });
      alert("ถูกต้อง! +10 แต้ม");
    } else {
      alert("ผิด ลองใหม่");
    }

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      alert("ทำหมดแล้ว กลับหน้า Dashboard");
      router.push("/dashboard");
    }
  };

  if (questions.length === 0) return <p className="p-6">กำลังโหลดโจทย์...</p>;

  const q = questions[current];

  return (
    <main className="p-6 text-center">
      <h1 className="text-xl font-bold mb-4">ข้อที่ {current + 1}</h1>
      <p className="mb-4">{q.question}</p>
      <div className="space-y-2">
        {q.choices.map((choice: string, index: number) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            className="block bg-white text-black hover:bg-blue-100 font-medium px-4 py-3 rounded-xl w-full max-w-md mx-auto shadow-md"
          >
            {choice}
          </button>
        ))}
      </div>
    </main>
  );
}
