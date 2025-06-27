import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";

export default function useLoadQuestions() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const subject = searchParams.get("subject");
  const topic = searchParams.get("topic");

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, "questions"));
        let qList = qSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        // Filter ที่ trim กันพลาด
        if (subject) qList = qList.filter(q => q.subject?.trim() === subject.trim());
        if (topic) qList = qList.filter(q => q.topic?.trim() === topic.trim());

        // กัน document format พัง
        qList = qList.filter(q => q.question && Array.isArray(q.choices) && q.choices.length > 0);

        if (qList.length === 0) {
          setError("❌ ไม่พบข้อสอบตามที่เลือก");
        } else {
          setQuestions(qList.sort(() => Math.random() - 0.5)); // shuffle
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "🔥 โหลดข้อสอบล้มเหลว");
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [subject, topic]);

  return { questions, loading, error };
}
