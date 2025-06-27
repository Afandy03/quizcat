import { useEffect, useRef, useState } from "react";

/**
 * Hook สำหรับจับเวลาแต่ละข้อ (elapsedTime) และเวลารวมทั้งหมด (totalElapsedTime)
 * trigger: ค่าอะไรก็ได้ที่เปลี่ยนตอนเริ่มข้อใหม่ เช่น index ของคำถาม
 */
export default function useElapsedTime(trigger: any) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const globalStartRef = useRef<number | null>(null); // เริ่มตั้งแต่คำถามแรก
  const localStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    // ตั้งค่าครั้งแรก
    if (!globalStartRef.current) {
      globalStartRef.current = now;
    }

    localStartRef.current = now;
    setElapsedTime(0);

    const timer = setInterval(() => {
      const localElapsed = Math.floor((Date.now() - localStartRef.current) / 1000);
      const globalElapsed = Math.floor((Date.now() - globalStartRef.current!) / 1000);

      setElapsedTime(localElapsed);
      setTotalElapsedTime(globalElapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [trigger]);

  return { elapsedTime, totalElapsedTime };
}
