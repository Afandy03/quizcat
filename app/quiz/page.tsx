// app/quiz/page.tsx

"use client"

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useUserTheme } from "../../lib/useTheme"; // << 1. import hook ธีมเข้ามา

export default function QuizPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const theme = useUserTheme(); // << 2. เรียกใช้ hook ใน component

  useEffect(() => {
    // ... โค้ดส่วน useEffect ของคุณเหมือนเดิม ไม่ต้องแก้ ...
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
      setQuestions(qList.sort(() => Math.random() - 0.5));
    };

    loadQuestions();
  }, []); // dependency array ว่างเปล่า ถูกต้องแล้ว

  const handleAnswer = async (choiceIndex: number) => {
    // ... โค้ดส่วน handleAnswer ของคุณเหมือนเดิม ไม่ต้องแก้ ...
    const q = questions[current];
    const correct = choiceIndex === q.correctIndex;

    if (correct) {
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
            // 👇 3. ลบคลาสสีที่ตายตัว (bg-white, text-black) ออกไป
            className="block font-medium px-4 py-3 rounded-xl w-full max-w-md mx-auto shadow-md transition-opacity hover:opacity-80"
            // 👇 4. เพิ่ม style แบบ inline เพื่อใช้สีจาก hook แทน
            style={{
              backgroundColor: theme.textColor, // พื้นหลังปุ่ม = สีตัวหนังสือของธีม
              color: theme.bgColor,             // สีตัวหนังสือปุ่ม = สีพื้นหลังของธีม
            }}
          >
            {choice}
          </button>
        ))}
      </div>
    </main>
  );
}