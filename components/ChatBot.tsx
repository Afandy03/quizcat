import { useState } from "react";

export default function ChatBot({
  show,
  onClose,
  question,
  choices,
}: {
  show: boolean;
  onClose: () => void;
  question: string;
  choices: string[];
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<string[]>([]);

  if (!show) return null;

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-md p-4 mt-4 text-left space-y-3 text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <p className="font-semibold text-blue-600">🤖 บังฟันดี้อยู่ตรงนี้ ถามได้เลย</p>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-red-500 transition"
        >
          ❌ ปิด
        </button>
      </div>

      {/* Log */}
      <div className="max-h-52 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md px-3 py-2 space-y-1">
        {chatLog.length === 0 ? (
          <p className="text-gray-400">ยังไม่มีข้อความ</p>
        ) : (
          chatLog.map((msg, i) => (
            <p
              key={i}
              className={
                msg.startsWith("คุณ:")
                  ? "text-right text-blue-700"
                  : "text-left text-gray-700"
              }
            >
              {msg}
            </p>
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!chatInput.trim()) return;

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question,
              choices,
              userMessage: chatInput,
            }),
          });

          const data = await res.json();
          setChatLog((prev) => [
            ...prev,
            `คุณ: ${chatInput}`,
            `บังฟันดี้: ${data.reply || "…"}`,
          ]);
          setChatInput("");
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="พิมพ์ถามบัง เช่น เริ่มยังไงดี?"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          ส่ง
        </button>
      </form>
    </div>
  );
}
