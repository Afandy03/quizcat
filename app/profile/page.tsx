"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("offline");
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserUid(user.uid);

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setStatus(data.status || "offline");
      } else {
        await setDoc(docRef, {
          name: user.email,
          status: "online",
          points: 0,
        });
        setName(user.email || "");
        setStatus("online");
      }
    });

    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!userUid) return;

    const docRef = doc(db, "users", userUid);
    await setDoc(docRef, { name: newName }, { merge: true });
    setName(newName);
    setEditing(false);
  };

  if (!name) return <div className="p-4">กำลังโหลด...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">โปรไฟล์</h2>

      {editing ? (
        <div className="mb-4">
          <input
            className="border p-2 w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-3 py-1 mt-2"
            onClick={handleSave}
          >
            บันทึกชื่อใหม่
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <p>ยินดีต้อนรับ, <b>{name}</b></p>
          <p className="text-sm text-gray-500">สถานะ: {status}</p>
          <button
            className="text-blue-600 underline mt-2"
            onClick={() => {
              setNewName(name);
              setEditing(true);
            }}
          >
            แก้ไขชื่อ
          </button>
        </div>
      )}
    </div>
  );
}
