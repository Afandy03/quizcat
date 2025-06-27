import { useCallback } from "react";

interface UseQuestionFlowProps {
  questions: any[];
  skipped: number[];
  current: number;
}

export default function useQuestionFlow({ questions, skipped, current }: UseQuestionFlowProps) {
  const getNextIndex = useCallback(() => {
    const total = questions.length;
    if (total === 0) return null;

    const remaining = questions
      .map((_, i) => i)
      .filter((i) => i !== current && !skipped.includes(i));

    const next = remaining.find((i) => i > current);
    if (next !== undefined) return next;

    // ลองหาข้อที่ skip ไปแล้ว
    const nextFromSkipped = skipped.find((i) => i !== current);
    if (nextFromSkipped !== undefined) return nextFromSkipped;

    return null; // หมดแล้ว
  }, [questions, skipped, current]);

  const handleSkip = useCallback(() => {
    const newSkipped = [...new Set([...skipped, current])]; // ป้องกัน skip ซ้ำ

    const remaining = questions
      .map((_, i) => i)
      .filter((i) => !newSkipped.includes(i));

    const next = remaining.find((i) => i > current);
    if (next !== undefined) return { nextIndex: next, updatedSkipped: newSkipped };

    const fromSkipped = newSkipped.find((i) => i !== current);
    return { nextIndex: fromSkipped ?? null, updatedSkipped: newSkipped };
  }, [current, questions, skipped]);

  return {
    getNextIndex,
    handleSkip,
  };
}
