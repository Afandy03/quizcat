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
      alert("สมัครเรียบร้อย! เข้าระบบแล้วนะ");
      router.push("/dashboard");
    } catch (err: any) {
      alert("สมัครไม่ผ่าน: " + err.message)
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      saveLogin();
      alert("เข้าสู่ระบบสำเร็จ!");
      router.push("/dashboard");
    } catch (err: any) {
      alert("เข้าสู่ระบบไม่ผ่าน: " + err.message);
    }
  };

  return (
    <main className="p-6 flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">เข้าสู่ระบบ / สมัครสมาชิก</h2>

      <input
        type="email"
        placeholder="อีเมล"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-2 w-full max-w-xs"
      />

      <input
        type="password"
        placeholder="รหัสผ่าน"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 mb-2 w-full max-w-xs"
      />

      <label className="mb-4 text-sm">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="mr-2"
        />
        จำฉันไว้ด้วย (จำอีเมลกับรหัสผ่าน)
      </label>

      <div className="flex space-x-4">
        <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">
          เข้าสู่ระบบ
        </button>
        <button onClick={handleRegister} className="bg-green-500 text-white px-4 py-2 rounded">
          สมัคร
        </button>
      </div>
    </main>
  );
}
