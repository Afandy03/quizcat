// components/ChoiceButton.tsx
import { MouseEventHandler } from "react";

type Props = {
  choice: string;
  index: number;
  selectedIndex: number | null;
  correctIndex: number;
  isAnswering: boolean;
  finished: boolean;
  theme: { bgColor: string; textColor: string };
  onSelect: MouseEventHandler<HTMLButtonElement>;
};

export default function ChoiceButton({
  choice,
  index,
  selectedIndex,
  correctIndex,
  isAnswering,
  finished,
  theme,
  onSelect,
}: Props) {
  const isSelected = index === selectedIndex;
  const isCorrect = correctIndex === index;

  let bg = theme.textColor;
  let text = theme.bgColor;

  if (selectedIndex !== null) {
    if (isSelected && isCorrect) {
      bg = "#16a34a"; // เขียว
      text = "#fff";
    } else if (isSelected && !isCorrect) {
      bg = "#dc2626"; // แดง
      text = "#fff";
    } else {
      bg = "#e5e7eb"; // เทาอ่อน
      text = "#000";
    }
  }

  return (
    <button
      onClick={onSelect}
      disabled={selectedIndex !== null || isAnswering || finished}
      className="block font-medium px-4 py-3 rounded-xl w-full shadow-md transition-opacity hover:opacity-80"
      style={{ backgroundColor: bg, color: text }}
    >
      {choice}
    </button>
  );
}
