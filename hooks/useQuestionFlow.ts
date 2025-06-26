import { useCallback } from "react";

interface UseQuestionFlowProps {
  questions: any[];
  skipped: number[];
  current: number;
}

export default function useQuestionFlow({ questions, skipped, current }: UseQuestionFlowProps) {
  const getNextIndex = useCallback(() => {
    const remaining = questions
      .map((_, i) => i)
      .filter((i) => i !== current && !skipped.includes(i));
    const next = remaining.find((i) => i > current);
    if (next !== undefined) return next;
    if (skipped.length > 0) return skipped[0];
    return null;
  }, [questions, skipped, current]);

  const handleSkip = useCallback(() => {
    const newSkipped = [...skipped, current];
    const remaining = questions.map((_, i) => i).filter((i) => !newSkipped.includes(i));
    const next = remaining.find((i) => i > current);
    if (next !== undefined) return { nextIndex: next, updatedSkipped: newSkipped };
    if (newSkipped.length < questions.length) {
      const nextSkipped = newSkipped.find((i) => i !== current);
      return { nextIndex: nextSkipped!, updatedSkipped: newSkipped };
    }
    return { nextIndex: null, updatedSkipped: newSkipped };
  }, [current, questions, skipped]);

  return {
    getNextIndex,
    handleSkip,
  };
}
