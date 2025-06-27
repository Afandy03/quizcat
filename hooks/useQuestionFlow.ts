// hooks/useQuestionFlow.ts (ฉบับแก้ไข)
import { useState, useMemo, useCallback } from "react";

/**
 * Hook อัจฉริยะสำหรับจัดการลำดับของคำถาม
 * @param questions - อาร์เรย์ของคำถามทั้งหมด
 */
export default function useQuestionFlow(questions: any[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredIndices, setAnsweredIndices] = useState<number[]>([]);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);

  // ---- ส่วนตรรกะหลัก: หาข้อถัดไป ----
  const getNextIndex = useCallback(() => {
    const answeredOrSkipped = new Set([...answeredIndices, ...skippedIndices]);

    // 1. หาข้อที่ยังไม่เคยเจอ ที่อยู่ถัดจากข้อปัจจุบัน
    for (let i = currentIndex + 1; i < questions.length; i++) {
      if (!answeredOrSkipped.has(i)) {
        return i;
      }
    }

    // 2. ถ้าไม่เจอ ให้วนกลับไปหาข้อที่ข้ามไป (skipped) ที่ยังเหลืออยู่
    for (const skippedIndex of skippedIndices) {
      if (!answeredOrSkipped.has(skippedIndex)) {
        return skippedIndex;
      }
    }
    
    // 3. ถ้าไม่เหลือแล้วจริงๆ คือจบ
    return null;
  }, [questions, currentIndex, answeredIndices, skippedIndices]);


  // ---- ส่วนควบคุม: ฟังก์ชันที่ส่งให้ Component เรียกใช้ ----

  /**
   * ฟังก์ชันสำหรับตอบคำถามข้อปัจจุบัน และเลื่อนไปยังข้อถัดไป
   */
  const answerAndGoToNext = useCallback(() => {
    const newAnswered = [...answeredIndices, currentIndex];
    setAnsweredIndices(newAnswered);

    const nextIndex = getNextIndex();
    if (nextIndex !== null) {
      setCurrentIndex(nextIndex);
    } else {
      // ไม่มีข้อต่อไปแล้ว (อาจจะตั้งค่าสถานะว่าจบเกม)
      setCurrentIndex(questions.length); // ตั้ง index ให้อยู่นอกช่วงเพื่อบอกว่าจบ
    }
  }, [currentIndex, answeredIndices, getNextIndex, questions.length]);

  /**
   * ฟังก์ชันสำหรับข้ามคำถามข้อปัจจุบัน
   */
  const skip = useCallback(() => {
    // เพิ่มข้อปัจจุบันเข้าไปในลิสต์ที่ข้ามแล้ว
    const newSkipped = [...skippedIndices, currentIndex];
    setSkippedIndices(newSkipped);

    const nextIndex = getNextIndex();
    if (nextIndex !== null) {
      setCurrentIndex(nextIndex);
    } else {
      setCurrentIndex(questions.length);
    }
  }, [currentIndex, skippedIndices, getNextIndex, questions.length]);


  // ---- ส่วนผลลัพธ์: สิ่งที่ส่งกลับไปให้ Component ----
  const isFinished = currentIndex >= questions.length;
  const currentQuestion = isFinished ? null : questions[currentIndex];

  return {
    currentQuestion,    // คำถามข้อปัจจุบัน
    currentIndex,       // index ของข้อปัจจุบัน
    isFinished,         // สถานะว่าควิซจบแล้วหรือยัง
    answerAndGoToNext,  // ฟังก์ชันสำหรับ "ตอบแล้วไปต่อ"
    skip,               // ฟังก์ชันสำหรับ "ข้าม"
  };
}