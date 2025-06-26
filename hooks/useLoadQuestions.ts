import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";

export default function useLoadQuestions() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
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
          setQuestions(qList.sort(() => Math.random() - 0.5)); // สุ่ม
        }
      } catch (e) {
        console.error(e);
        setError("🔥 โหลดข้อสอบล้มเหลว");
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [searchParams]);

  return { questions, loading, error };
}
