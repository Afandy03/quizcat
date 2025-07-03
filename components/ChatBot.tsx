import { useState, useEffect, useRef } from "react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  // สำหรับปรับความกว้าง
  const [width, setWidth] = useState<number | null>(null); // null = auto
  const [isResizing, setIsResizing] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // เคลียร์ chat log เมื่อโจทย์เปลี่ยน
  useEffect(() => {
    setChatLog([]);
  }, [question]);

  if (!show) return null;

  // Mouse event handlers สำหรับ resize
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (chatRef.current) {
        // คำนวณความกว้างใหม่ (ลากจากซ้าย)
        const rect = chatRef.current.getBoundingClientRect();
        let newWidth = rect.right - e.clientX;
        // จำกัดขนาดขั้นต่ำ/สูงสุด
        if (newWidth < 320) newWidth = 320;
        if (newWidth > window.innerWidth - 64) newWidth = window.innerWidth - 64;
        setWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={chatRef}
      className={`flex flex-col h-full rounded-xl shadow-lg border p-6 mt-5 text-left text-base backdrop-blur-sm transition-all duration-300 ${isExpanded ? 'fixed z-50 max-w-none' : 'relative max-w-5xl w-full mx-auto'}`}
      style={{
        ...getBackgroundStyle(theme.bgColor),
        borderColor: theme.textColor + '20',
        boxShadow: `0 10px 40px ${theme.textColor}15`,
        ...(isExpanded && width
          ? { width: width, maxWidth: '98vw', right: 16, left: 'auto', top: 16, bottom: 16, position: 'fixed', height: 'calc(100vh - 32px)' }
          : isExpanded
            ? { width: '80vw', maxWidth: '98vw', right: 16, left: 'auto', top: 16, bottom: 16, position: 'fixed', height: 'calc(100vh - 32px)' }
            : { minHeight: 500, maxHeight: '80vh', height: 'auto' }),
        cursor: isResizing ? 'ew-resize' : undefined
      }}
    >
      {/* Header + ปุ่มขยาย/ย่อ */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
            <span className="text-white text-lg">🤖</span>
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: theme.textColor }}>
              บังฟันดี้
            </p>
            <p className="text-sm" style={{ color: theme.textColor + '70' }}>
              ผู้ช่วยทำข้อสอบ
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-blue-100 mr-1"
            style={{
              backgroundColor: theme.textColor + '10',
              color: theme.textColor + '80',
            }}
            title={isExpanded ? 'ย่อหน้าต่าง' : 'ขยายหน้าต่าง'}
          >
            {isExpanded ? <span>🗕</span> : <span>🗖</span>}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-red-100"
            style={{
              backgroundColor: theme.textColor + '10',
              color: theme.textColor + '80',
            }}
          >
            ✕
          </button>
        </div>
      {/* Drag handle สำหรับปรับขนาด (เฉพาะ expanded) */}
      {isExpanded && (
        <div
          onMouseDown={() => setIsResizing(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 12,
            height: '100%',
            cursor: 'ew-resize',
            zIndex: 100,
            background: isResizing ? theme.textColor + '10' : 'transparent',
            transition: 'background 0.2s',
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
          title="ลากเพื่อปรับความกว้าง"
        >
          <div style={{ width: 4, height: 40, background: theme.textColor + '30', borderRadius: 2, margin: 'auto' }} />
        </div>
      )}
      </div>

      {/* Quick Help Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => setChatInput("ข้อนี้ถามอะไรครับ?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#3b82f6' + '15',
            border: '1px solid ' + '#3b82f6' + '30',
            color: '#3b82f6'
          }}
        >
          <span className="text-lg">💭</span>
          <span className="text-sm font-medium">ถามอะไร?</span>
        </button>
        <button
          onClick={() => setChatInput("ตัวเลือกไหนเป็นไปได้บ้าง?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#10b981' + '15',
            border: '1px solid ' + '#10b981' + '30',
            color: '#10b981'
          }}
        >
          <span className="text-lg">🔍</span>
          <span className="text-sm font-medium">ดูตัวเลือก</span>
        </button>
        <button
          onClick={() => setChatInput("คีย์เวิร์ดสำคัญในโจทย์คืออะไร?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#8b5cf6' + '15',
            border: '1px solid ' + '#8b5cf6' + '30',
            color: '#8b5cf6'
          }}
        >
          <span className="text-lg">🔑</span>
          <span className="text-sm font-medium">คีย์เวิร์ด</span>
        </button>
        <button
          onClick={() => setChatInput("ให้เริ่มต้นคิดยังไงดี?")}
          className="p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
          style={{ 
            backgroundColor: '#f59e0b' + '15',
            border: '1px solid ' + '#f59e0b' + '30',
            color: '#f59e0b'
          }}
        >
          <span className="text-lg">🚀</span>
          <span className="text-sm font-medium">เริ่มยังไง?</span>
        </button>
      </div>

      {/* Chat Log */}
      <div
        className="flex-1 overflow-y-auto rounded-lg border p-4 space-y-4 scroll-smooth chat-scroll-container"
        style={{
          backgroundColor: theme.textColor + '05',
          borderColor: theme.textColor + '15',
          boxShadow: `inset 0 0 10px ${theme.textColor}05`,
          minHeight: 180
        }}
      >
        {chatLog.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center shadow-lg">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-base font-medium mb-2" style={{ color: theme.textColor }}>
              สวัสดี! บังฟันดี้อยู่ตรงนี้
            </p>
            <p className="text-sm" style={{ color: theme.textColor + '70' }}>
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
              } mb-2`}
            >
              {!msg.startsWith("เรา:") && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-2 mt-1 flex-shrink-0 shadow-sm">
                  <span className="text-white text-xs">🤖</span>
                </div>
              )}
              <div
                className={`max-w-[80%] px-5 py-3 rounded-2xl text-[15px] shadow-md ${
                  msg.startsWith("เรา:")
                    ? "rounded-br-md"
                    : "rounded-bl-md"
                }`}
                style={{
                  backgroundColor: msg.startsWith("เรา:")
                    ? 'rgba(59, 130, 246, 0.9)'
                    : theme.textColor + '08',
                  color: msg.startsWith("เรา:")
                    ? '#ffffff'
                    : theme.textColor,
                  border: msg.startsWith("เรา:")
                    ? 'none'
                    : `1px solid ${theme.textColor}15`,
                  lineHeight: '1.5',
                  boxShadow: msg.startsWith("เรา:")
                    ? `0 2px 5px rgba(59, 130, 246, 0.2)`
                    : `0 2px 5px ${theme.textColor}10`
                }}
              >
                <div className="font-medium mb-0.5" style={{ opacity: msg.startsWith("เรา:") ? 0.95 : 0.85 }}>
                  {msg.startsWith("เรา:") ? "เรา" : "บังฟันดี้"}
                </div>
                <div style={{ whiteSpace: 'pre-line' }}>
                  {msg.replace(/^(เรา:|บังฟันดี้:)\s*/, "")}
                </div>
              </div>
              {msg.startsWith("เรา:") && (
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center ml-2 mt-1 flex-shrink-0 shadow-sm">
                  <span className="text-white text-xs">👤</span>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-2 mt-1 flex-shrink-0 shadow-sm">
              <span className="text-white text-xs">🤖</span>
            </div>
            <div
              className="px-5 py-3 rounded-2xl rounded-bl-md text-[15px] shadow-md flex items-center gap-3"
              style={{
                backgroundColor: theme.textColor + '08',
                color: theme.textColor + '90',
                border: `1px solid ${theme.textColor}15`,
                boxShadow: `0 2px 5px ${theme.textColor}10`
              }}
            >
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="font-medium">บังกำลังคิด...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!chatInput.trim() || isLoading) return;

          // Scroll to bottom
          setTimeout(() => {
            const chatContainer = document.querySelector(".chat-scroll-container");
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 100);

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
                systemPrompt: `คุณคือบังฟันดี้ พี่ติวเตอร์ที่ช่วยเด็กทำข้อสอบแบบเข้าใจ ไม่เฉลยตรงๆ แต่จะค่อยๆ พาให้คิดเอง ด้วยวิธี:\n\n1. **อธิบายโจทย์**: แตกโจทย์ให้เข้าใจ หาคำสำคัญ\n2. **ดูตัวเลือก**: เปรียบเทียบ ตัดตัวเลือกที่ไม่เกี่ยว\n3. **โยนคำถามกลับ**: เช่น \"นึกอะไรออกบ้าง?\" \"ข้อไหนตัดทิ้งได้?\"\n4. **ให้กำลังใจสั้นๆ**: เช่น \"เก่งมาก!\" \"คิดดีแล้ว!\" \"ใกล้แล้ว!\"\n\nใช้ภาษาพี่ๆ เป็นกันเอง ใช้คำว่า \"เรา\" แทน \"คุณ\" ไม่ต้องสุภาพเกิน  \nไม่พูดแบบโลกสวย ไม่ยัดเยียดความหวังดี  \nคำตอบต้องสั้น กระชับ มีจังหวะให้เด็กคิดเอง`,
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
        className={`flex gap-3 w-full pt-4`}
        style={{ marginTop: 'auto' }}
      >
        <input
          className={`flex-1 rounded-xl px-5 py-4 transition-all duration-200 focus:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-500 ${isExpanded ? 'text-lg' : 'text-base'} w-full`}
          placeholder="เช่น: ข้อนี้ถามอะไร? หรือพิมพ์คำถามของคุณที่นี่..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          style={{
            backgroundColor: theme.textColor + '08',
            borderColor: theme.textColor + '20',
            color: theme.textColor,
            border: `1px solid ${theme.textColor}20`,
            boxShadow: `0 2px 6px ${theme.textColor}08`
          }}
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isLoading}
          className={`px-6 py-4 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg flex items-center justify-center ${isExpanded ? 'text-lg' : 'text-base'} w-20`}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
            color: '#ffffff',
            minWidth: 48
          }}
          aria-label="ส่งข้อความ"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>รอสักครู่</span>
            </div>
          ) : (
            <span className="text-xl">➡️</span>
          )}
        </button>
      </form>
    </div>
  );
}
