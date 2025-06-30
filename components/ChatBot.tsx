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
  const [isLoading, setIsLoading] = useState(false);

  if (!show) return null;

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-md p-4 mt-4 text-left space-y-3 text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <p className="font-semibold text-blue-600">🤖 บังฟันดี้ช่วยทำข้อสอบ</p>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-red-500 transition"
        >
          ❌ ปิด
        </button>
      </div>

      {/* Quick Help Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setChatInput("ข้อนี้ถามอะไรครับ?")}
          className="text-xs p-2 bg-blue-50 hover:bg-blue-100 rounded border text-blue-700 transition-colors"
        >
          💭 ถามอะไร?
        </button>
        <button
          onClick={() => setChatInput("ตัวเลือกไหนเป็นไปได้บ้าง?")}
          className="text-xs p-2 bg-green-50 hover:bg-green-100 rounded border text-green-700 transition-colors"
        >
          🔍 ดูตัวเลือก
        </button>
        <button
          onClick={() => setChatInput("คีย์เวิร์ดสำคัญในโจทย์คืออะไร?")}
          className="text-xs p-2 bg-purple-50 hover:bg-purple-100 rounded border text-purple-700 transition-colors"
        >
          🔑 คีย์เวิร์ด
        </button>
        <button
          onClick={() => setChatInput("ให้เริ่มต้นคิดยังไงดี?")}
          className="text-xs p-2 bg-orange-50 hover:bg-orange-100 rounded border text-orange-700 transition-colors"
        >
          🚀 เริ่มยังไง?
        </button>
      </div>

      {/* Log */}
      <div className="max-h-48 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md px-3 py-2 space-y-2">
        {chatLog.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-xs mb-2">👋 สวัสดี! บังอยู่ตรงนี้</p>
            <p className="text-gray-500 text-xs">ลองกดปุ่มด้านบนหรือถามคำถามได้เลย</p>
          </div>
        ) : (
          chatLog.map((msg, i) => (
            <div
              key={i}
              className={`${
                msg.startsWith("เรา:")
                  ? "text-right"
                  : "text-left"
              }`}
            >
              <p
                className={`inline-block px-3 py-2 rounded-lg text-xs max-w-[85%] ${
                  msg.startsWith("เรา:")
                    ? "bg-blue-500 text-white"
                    : "bg-white border text-gray-700"
                }`}
              >
                {msg.replace(/^(เรา:|บังฟันดี้:)\s*/, "")}
              </p>
            </div>
          ))
        )}
        {isLoading && (
          <div className="text-left">
            <p className="inline-block px-3 py-2 rounded-lg text-xs bg-gray-200 text-gray-600">
              <span className="animate-pulse">บังกำลังคิด...</span>
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!chatInput.trim() || isLoading) return;

          const currentInput = chatInput;
          setChatInput("");
          setIsLoading(true);

          // เพิ่มข้อความของเรา
          setChatLog((prev) => [...prev, `เรา: ${currentInput}`]);

          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt: `คุณคือบังฟันดี้ พี่ติวเตอร์ที่ช่วยเด็กทำข้อสอบแบบเข้าใจ ไม่บอกคำตอบตรงๆ แต่จะค่อยๆ พาให้คิดเอง โดยใช้วิธี:

1. **อธิบายโจทย์**: ช่วยแตกโจทย์ให้เข้าใจ หาคีย์เวิร์ดสำคัญ
2. **ชวนดูตัวเลือก**: ให้ดูแต่ละข้อแล้วเปรียบเทียบ ตัดทิ้งที่เป็นไปไม่ได้
3. **โยนคำถามกลับ**: ถาม "นึกอะไรออกบ้าง?" "ข้อไหนดูแปลกๆ?" 
4. **ให้กำลังใจ**: "เก่งมาก!", "คิดได้ดีแล้ว!", "ลองใหม่ดู!"

พูดเหมือนพี่ๆ ใช้ "เรา" แทน "คุณ" ไม่เป็นทางการ ไม่ใช้ "หัวอกนะลูก" ตอบสั้นๆ แต่กระชับ`,
                question,
                choices,
                userMessage: currentInput,
              }),
            });

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            setChatLog((prev) => [
              ...prev,
              `บังฟันดี้: ${data.reply || "ขอโทษนะ ได้ข้อมูลไม่ครบ"}`,
            ]);
          } catch (error) {
            console.error('Chat error:', error);
            setChatLog((prev) => [
              ...prev,
              `บังฟันดี้: ขออภัย บอทมีปัญหาชั่วคราว ลองใหม่อีกทีนะ 🙏`,
            ]);
          } finally {
            setIsLoading(false);
          }
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น: ข้อนี้ถามอะไร? ตัวเลือกไหนน่าจะใช่?"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isLoading}
          className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "⏳" : "ส่ง"}
        </button>
      </form>
    </div>
  );
}
