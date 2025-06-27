import React from "react";

interface CurrentQuestionProps {
  question: {
    question: string;
    subject?: string;
    topic?: string;
  };
  current: number;
}

export default function CurrentQuestion({ question, current }: CurrentQuestionProps) {
  return (
    <div className="text-left bg-white shadow-md rounded-xl px-6 py-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-blue-700">
          📘 ข้อ {current + 1}
        </h1>
      </div>

      <p className="text-sm text-gray-500 mb-1">
        🧠 วิชา: <span className="font-semibold">{question.subject || "?"}</span> / หมวด: <span className="font-semibold">{question.topic || "?"}</span>
      </p>

      <p className="text-lg font-semibold text-gray-800 leading-relaxed mt-2">
        {question.question}
      </p>
    </div>
  );
}
