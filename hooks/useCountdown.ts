import { useEffect, useState } from "react";

type UseCountdownOptions = {
  resetSignal: any;             // ตัวที่ใช้ trigger การรีเซ็ตเวลา
  duration?: number;            // หน่วยเป็นมิลลิวินาที (default = 30 วิ)
  onTimeOut?: () => void;       // ฟังก์ชันที่จะถูกเรียกเมื่อหมดเวลา
  paused?: boolean;             // หยุดนับชั่วคราว
};

export default function useCountdown({
  resetSignal,
  duration = 30000,
  onTimeOut,
  paused = false,
}: UseCountdownOptions) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(duration / 1000));

  useEffect(() => {
    if (paused) return;

    const seconds = Math.floor(duration / 1000);
    setTimeLeft(seconds);

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
  }, [resetSignal, duration, onTimeOut, paused]);

  return timeLeft;
}
