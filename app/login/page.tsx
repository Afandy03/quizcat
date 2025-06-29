"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // ตอนโหลดหน้า → ลองโหลด email/pass จาก localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("quizcat-email");
    const savedPass = localStorage.getItem("quizcat-pass");
    if (savedEmail && savedPass) {
      setEmail(savedEmail);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  // Auto hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
  };

  const saveLogin = () => {
    if (rememberMe) {
      localStorage.setItem("quizcat-email", email);
      localStorage.setItem("quizcat-pass", password);
    } else {
      localStorage.removeItem("quizcat-email");
      localStorage.removeItem("quizcat-pass");
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      showMessage("กรุณากรอกอีเมลและรหัสผ่าน", "error");
      return;
    }
    
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await setDoc(doc(db, "users", uid), {
        email,
        points: 0,
        role: "kid",
        createdAt: new Date(),
        theme: {
          bgColor: "#000000",
          textColor: "#ffffff",
        },
      });

      saveLogin();
      // ลบ guest session เมื่อสมัครสมาชิกสำเร็จ
      localStorage.removeItem('quizcat-guest-id');
      localStorage.removeItem('quizcat-guest-mode');
      showMessage("🎉 สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ", "success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      showMessage("❌ สมัครไม่สำเร็จ: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage("กรุณากรอกอีเมลและรหัสผ่าน", "error");
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      saveLogin();
      // ลบ guest session เมื่อ login สำเร็จ
      localStorage.removeItem('quizcat-guest-id');
      localStorage.removeItem('quizcat-guest-mode');
      showMessage("🎯 เข้าสู่ระบบสำเร็จ!", "success");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      showMessage("❌ เข้าสู่ระบบไม่สำเร็จ: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setGuestLoading(true);
    try {
      // สร้าง guest session ใน localStorage
      const guestId = 'guest_' + Date.now();
      localStorage.setItem('quizcat-guest-id', guestId);
      localStorage.setItem('quizcat-guest-mode', 'true');
      
      showMessage("🎭 เข้าสู่โหมดผู้เยี่ยมชม", "success");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      showMessage("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${
          message.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">QuizCat</h1>
          <p className="text-gray-600">เข้าสู่ระบบหรือสมัครสมาชิกใหม่</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📧 อีเมล
              </label>
              <input
                type="email"
                placeholder="กรอกอีเมลของคุณ"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔒 รหัสผ่าน
              </label>
              <input
                type="password"
                placeholder="กรอกรหัสผ่านของคุณ"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                💾 จำฉันไว้ในครั้งถัดไป
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleLogin} 
              disabled={loading || guestLoading || !email || !password}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "⏳ กำลังเข้าสู่ระบบ..." : "🚀 เข้าสู่ระบบ"}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">หรือ</span>
              </div>
            </div>
            
            <button 
              onClick={handleRegister} 
              disabled={loading || guestLoading || !email || !password}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "⏳ กำลังสมัครสมาชิก..." : "✨ สมัครสมาชิกใหม่"}
            </button>

            {/* Guest Mode Section */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ไม่อยากสมัครสมาชิก?</span>
              </div>
            </div>

            <button 
              onClick={handleGuestMode} 
              disabled={loading || guestLoading}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:from-gray-600 hover:to-gray-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {guestLoading ? "⏳ กำลังเข้าสู่ระบบ..." : "🎭 เข้าใช้แบบผู้เยี่ยมชม"}
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-500 mb-2">
              การสมัครสมาชิกแสดงว่าคุณยอมรับ{" "}
              <span className="text-blue-500 hover:underline cursor-pointer">ข้อกำหนดการใช้งาน</span>
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              💡 โหมดผู้เยี่ยมชม: ทำข้อสอบได้แต่ไม่บันทึกคะแนน
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            © 2025 QuizCat - เรียนรู้อย่างสนุก กับระบบควิซอัจฉริยะ
          </p>
        </div>
      </div>
    </div>
  );
}
