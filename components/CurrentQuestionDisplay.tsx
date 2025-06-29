// components/CurrentQuestionDisplay.tsx
"use client"

interface CurrentQuestionDisplayProps {
  question: {
    question: string;
    choices: string[];
    subject?: string;
    topic?: string;
  };
  current: number;
}

export default function CurrentQuestionDisplay({ question, current }: CurrentQuestionDisplayProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          ข้อที่ {current + 1}
        </h2>
        {question.subject && (
          <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {question.subject}
          </span>
        )}
      </div>
      
      <div className="text-lg text-gray-700 leading-relaxed">
        {question.question}
      </div>
      
      {question.topic && (
        <div className="text-sm text-gray-500">
          หัวข้อ: {question.topic}
        </div>
      )}
    </div>
  );
}
