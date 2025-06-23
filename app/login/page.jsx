"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // <<== เพิ่มตรงนี้
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter(); // <<== เพิ่มตรงนี้
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
          bgColor: "#000000",     // พื้นหลังเริ่มต้น (ดำ)
          textColor: "#ffffff"     // ตัวหนังสือเริ่มต้น (ขาว)
        }
      });

      alert("สมัครเรียบร้อย! เข้าระบบแล้วนะ");
      router.push("/dashboard"); // <<== เพิ่มตรงนี้
    } catch (err) {
      alert("สมัครไม่ผ่าน: " + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("เข้าสู่ระบบสำเร็จ!");
      router.push("/dashboard"); // <<== เพิ่มตรงนี้
    } catch (err) {
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
        className="border p-2 mb-4 w-full max-w-xs"
      />

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
