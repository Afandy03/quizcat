import { useState, useEffect } from "react";
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme";

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
  const { theme } = useUserTheme();

  // เคลียร์ chat log เมื่อโจทย์เปลี่ยน
  useEffect(() => {
    setChatLog([]);
  }, [question]);

  if (!show) return null;

  return (
    <div 
      className="rounded-xl shadow-lg border p-5 mt-4 text-left space-y-4 text-sm backdrop-blur-sm"
      style={{ 
        ...getBackgroundStyle(theme.bgColor),
        borderColor: theme.textColor + '20',
        boxShadow: `0 8px 32px ${theme.textColor}15`
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-xs">🤖</span>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: theme.textColor }}>
              บังฟันดี้
            </p>
            <p className="text-xs" style={{ color: theme.textColor + '70' }}>
              ผู้ช่วยทำข้อสอบ
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{ 
            backgroundColor: theme.textColor + '10',
            color: theme.textColor + '80'
          }}
        >
          ✕
        </button>
      </div>

      {/* Quick Help Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setChatInput("ข้อนี้ถามอะไรครับ?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#3b82f6' + '15',
            borderColor: '#3b82f6' + '30',
            color: '#3b82f6'
          }}
        >
          <span>💭</span>
          <span className="text-xs font-medium">ถามอะไร?</span>
        </button>
        <button
          onClick={() => setChatInput("ตัวเลือกไหนเป็นไปได้บ้าง?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#10b981' + '15',
            borderColor: '#10b981' + '30',
            color: '#10b981'
          }}
        >
          <span>🔍</span>
          <span className="text-xs font-medium">ดูตัวเลือก</span>
        </button>
        <button
          onClick={() => setChatInput("คีย์เวิร์ดสำคัญในโจทย์คืออะไร?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#8b5cf6' + '15',
            borderColor: '#8b5cf6' + '30',
            color: '#8b5cf6'
          }}
        >
          <span>🔑</span>
          <span className="text-xs font-medium">คีย์เวิร์ด</span>
        </button>
        <button
          onClick={() => setChatInput("ให้เริ่มต้นคิดยังไงดี?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#f59e0b' + '15',
            borderColor: '#f59e0b' + '30',
            color: '#f59e0b'
          }}
        >
          <span>🚀</span>
          <span className="text-xs font-medium">เริ่มยังไง?</span>
        </button>
      </div>

      {/* Chat Log */}
      <div 
        className="max-h-64 overflow-y-auto rounded-lg border p-4 space-y-3 scroll-smooth"
        style={{ 
          backgroundColor: theme.textColor + '05',
          borderColor: theme.textColor + '15'
        }}
      >
        {chatLog.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: theme.textColor }}>
              สวัสดี! บังฟันดี้อยู่ตรงนี้
            </p>
            <p className="text-xs" style={{ color: theme.textColor + '70' }}>
              ลองกดปุ่มด้านบนหรือถามคำถามได้เลย
            </p>
          </div>
        ) : (
          chatLog.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.startsWith("เรา:")
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  msg.startsWith("เรา:")
                    ? "rounded-br-md"
                    : "rounded-bl-md"
                }`}
                style={{
                  backgroundColor: msg.startsWith("เรา:")
                    ? '#3b82f6'
                    : theme.textColor + '10',
                  color: msg.startsWith("เรา:")
                    ? '#ffffff'
                    : theme.textColor,
                  border: msg.startsWith("เรา:")
                    ? 'none'
                    : `1px solid ${theme.textColor}20`
                }}
              >
                {msg.replace(/^(เรา:|บังฟันดี้:)\s*/, "")}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-md text-sm shadow-sm flex items-center gap-2"
              style={{
                backgroundColor: theme.textColor + '10',
                color: theme.textColor + '80',
                border: `1px solid ${theme.textColor}20`
              }}
            >
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>บังกำลังคิด...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
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
                systemPrompt: `คุณคือบังฟันดี้ พี่ติวเตอร์ที่ช่วยเด็กทำข้อสอบแบบเข้าใจ ไม่เฉลยตรงๆ แต่จะค่อยๆ พาให้คิดเอง ด้วยวิธี:

1. **อธิบายโจทย์**: แตกโจทย์ให้เข้าใจ หาคำสำคัญ
2. **ดูตัวเลือก**: เปรียบเทียบ ตัดตัวเลือกที่ไม่เกี่ยว
3. **โยนคำถามกลับ**: เช่น "นึกอะไรออกบ้าง?" "ข้อไหนตัดทิ้งได้?"
4. **ให้กำลังใจสั้นๆ**: เช่น "เก่งมาก!" "คิดดีแล้ว!" "ใกล้แล้ว!"

ใช้ภาษาพี่ๆ เป็นกันเอง ใช้คำว่า "เรา" แทน "คุณ" ไม่ต้องสุภาพเกิน  
ไม่พูดแบบโลกสวย ไม่ยัดเยียดความหวังดี  
คำตอบต้องสั้น กระชับ มีจังหวะให้เด็กคิดเอง`,
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
        className="flex gap-3"
      >
        <input
          className="flex-1 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น: ข้อนี้ถามอะไร? ตัวเลือกไหนน่าจะใช่?"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          style={{
            backgroundColor: theme.textColor + '08',
            borderColor: theme.textColor + '20',
            color: theme.textColor,
            border: `1px solid ${theme.textColor}20`
          }}
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isLoading}
          className="px-6 py-3 text-sm rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg"
          style={{
            backgroundColor: '#3b82f6',
            color: '#ffffff'
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>⏳</span>
            </div>
          ) : (
            <span>ส่ง 📤</span>
          )}
        </button>
      </form>
    </div>
  );
}
