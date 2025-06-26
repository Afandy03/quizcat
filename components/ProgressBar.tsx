type ProgressBarProps = {
  questions: any[];
  current: number;
  skipped: number[];
  answered: number[]; // ✅ ใช้เช็คว่าข้อนี้ "ตอบแล้วจริง"
  isAnswering?: boolean;
  onSelect?: (index: number) => void;
};

export default function ProgressBar({
  questions,
  current,
  skipped,
  answered,
  isAnswering = false,
  onSelect = () => {},
}: ProgressBarProps) {
  return (
    <div className="flex gap-2 justify-center text-xs text-white py-2 flex-wrap">
      {questions.map((_, i) => {
        const isCurrent = i === current;
        const isSkipped = skipped.includes(i);
        const isAnswered = answered.includes(i);

        let bgColor = "bg-gray-300 text-gray-800";
        if (isAnswered) bgColor = "bg-green-500 text-white";
        if (isSkipped) bgColor = "bg-yellow-400 text-black ring-1 ring-yellow-300";
        if (isCurrent) bgColor = "bg-blue-600 text-white ring-2 ring-blue-300 animate-pulse";

        return (
          <button
            key={i}
            onClick={() => !isAnswering && onSelect(i)}
            title={`ข้อที่ ${i + 1} - ${
              isSkipped
                ? "ข้าม"
                : isAnswered
                ? "ตอบแล้ว"
                : isCurrent
                ? "กำลังทำ"
                : "ยังไม่ได้ทำ"
            }`}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-150 ${bgColor} hover:scale-110`}
            disabled={isAnswering}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
