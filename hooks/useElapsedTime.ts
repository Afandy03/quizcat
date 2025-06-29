import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook สำหรับจับเวลาแต่ละข้อ (elapsedTime) และเวลารวมทั้งหมด (totalElapsedTime)
 * trigger: ค่าอะไรก็ได้ที่เปลี่ยนตอนเริ่มข้อใหม่ เช่น index ของคำถาม
 */
export default function useElapsedTime(trigger: number | string) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const globalStartRef = useRef<number | null>(null);
  const localStartRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    
    const now = Date.now();

    // ตั้งค่าครั้งแรก
    if (globalStartRef.current === null) {
      globalStartRef.current = now;
    }

    localStartRef.current = now;
    setElapsedTime(0);

    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const localElapsed = Math.floor((currentTime - localStartRef.current) / 1000);
      const globalElapsed = globalStartRef.current 
        ? Math.floor((currentTime - globalStartRef.current) / 1000)
        : 0;

      setElapsedTime(localElapsed);
      setTotalElapsedTime(globalElapsed);
    }, 1000);

    return clearTimer;
  }, [trigger, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { elapsedTime, totalElapsedTime };
}
