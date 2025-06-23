"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const uid = user.uid;
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        alert("ไม่เจอข้อมูลผู้ใช้");
      }
    });

    return () => unsub();
  }, []);

  if (!userData) return <p className="p-6">กำลังโหลด...</p>;

  return (
    <main className="p-6 text-center">
      <h1 className="text-2xl font-bold">ยินดีต้อนรับ, {userData.email}</h1>
      <p className="text-lg mt-2">💰 แต้มสะสม: {userData.points}</p>

      <div className="flex flex-col items-center space-y-4 mt-6">
        <Link href="/add-question">
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            ➕ เพิ่มข้อสอบใหม่
          </button>
        </Link>

        <Link href="/quiz">
          <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
            🚀 เริ่มทำข้อสอบ
          </button>
        </Link>

        <Link href="/settings">
          <button className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">
            ⚙️ ตั้งค่า
          </button>
        </Link>
      </div>
    </main>
  );
}
