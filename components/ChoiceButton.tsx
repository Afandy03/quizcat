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

  let buttonStyle = {
    backgroundColor: theme.bgColor,
    color: theme.textColor,
    border: `1px solid ${theme.textColor}`,
  };

  if (!isAnswering) {
    if (isSelected) {
      buttonStyle = {
        backgroundColor: "#3b82f6", // สีน้ำเงิน (blue-500)
        color: "#ffffff",
        border: "1px solid #3b82f6",
      };
    } else {
       buttonStyle = {
        backgroundColor: "#ffffff", // สีขาว
        color: "#1f2937", // สีเทาเข้ม (gray-800)
        border: "1px solid #d1d5db", // สีเทา (gray-300)
       }
    }
  } 
  else {
    if (isCorrect) {
      buttonStyle = {
        backgroundColor: "#16a34a", // สีเขียว
        color: "#ffffff",
        border: "1px solid #16a34a",
      };
    } else if (isSelected && !isCorrect) {
      buttonStyle = {
        backgroundColor: "#dc2626", // สีแดง
        color: "#ffffff",
        border: "1px solid #dc2626",
      };
    } else {
      // ปุ่มอื่นๆ ที่ไม่ถูกเลือกและไม่ใช่คำตอบที่ถูก
      buttonStyle = {
        backgroundColor: theme.textColor + "10", // ใช้สีจาก theme แต่โปร่งใส
        color: theme.textColor + "70", // ใช้สีจาก theme แต่จาง
        border: `1px solid ${theme.textColor}20`,
        // แก้ไข: ลบ opacity: 0.7 ออกตามที่คุณต้องการ
      };
    }
  }

  return (
    <button
      onClick={onSelect}
      disabled={isAnswering || finished}
      className={`
        w-full text-left px-5 py-3 rounded-2xl font-medium
        shadow-sm 
        ${isAnswering || finished ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        ...buttonStyle,
        ...(!(isAnswering || finished) && {
          '&:hover': {
            backgroundColor: theme.textColor + "20"
          }
        })
      }}
    >
      {choice}
    </button>
  );
}