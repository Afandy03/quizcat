import React from "react";

interface QuizSummaryProps {
  score: number;
  maxScore: number;
  onBack: () => void;
}

export default function QuizSummary({ score, maxScore, onBack }: QuizSummaryProps) {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold text-green-600">🎉 ทำครบแล้ว!</h1>
      <p className="text-lg font-semibold">
        คุณได้คะแนน <span className="text-blue-600">{score}</span> / {maxScore} แต้ม
      </p>
      <button
        onClick={onBack}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
      >
        กลับหน้า Dashboard
      </button>
    </div>
  );
}
