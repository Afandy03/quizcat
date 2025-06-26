import { useEffect, useState } from "react";

type UseCountdownOptions = {
  key: any; // ตัวที่ใช้ trigger reset (เปลี่ยนข้อ ฯลฯ)
  duration?: number; // หน่วย = "มิลลิวินาที" เช่น 30000 = 30 วิ
  onTimeOut?: () => void; // ฟังก์ชันที่เรียกเมื่อหมดเวลา
  paused?: boolean; // หยุดนับได้
};

export default function useCountdown({
  key,
  duration = 30000, // default = 30 วิ (30,000 มิลลิวินาที)
  onTimeOut,
  paused = false,
}: UseCountdownOptions) {
  const initialSeconds = Math.floor(duration / 1000); // แปลงเป็นวินาที
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (paused) return;
    setTimeLeft(initialSeconds);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeOut?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [key, initialSeconds, onTimeOut, paused]);

  return timeLeft;
}
