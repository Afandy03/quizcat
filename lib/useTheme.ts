// lib/useTheme.ts
"use client"

import { useState, useEffect } from "react"
import { auth, db } from "./firebase" // import มาจากไฟล์ที่มึงมีอยู่แล้ว
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// สร้าง object หน้าตาของ theme ไว้ใช้
interface Theme {
  bgColor: string
  textColor: string
}

export function useUserTheme() {
  // ตั้งค่าเริ่มต้นเป็น ดำ/ขาว กันหน้าเว็บพังตอนโหลด
  const [theme, setTheme] = useState<Theme>({
    bgColor: "#000000",
    textColor: "#ffffff",
  })

  useEffect(() => {
    // onAuthStateChanged จะคอยฟังว่าสถานะ login เปลี่ยนไปมั้ย (login, logout)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ถ้ามี user login อยู่
        const docRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const userData = docSnap.data()
          // เช็คว่าในข้อมูล user มี field ที่ชื่อ theme อยู่มั้ย
          if (userData.theme) {
            setTheme(userData.theme) // ถ้ามี ก็เอาค่าที่เซฟไว้มาใช้
          }
        }
      } else {
        // ถ้าไม่มี user login, ก็ใช้ค่าเริ่มต้นไป
        setTheme({ bgColor: "#000000", textColor: "#ffffff" })
      }
    })

    // Cleanup function: หยุดการทำงานของ onAuthStateChanged เมื่อ component ถูก unmount
    return () => unsubscribe()
  }, []) // useEffect นี้จะทำงานแค่ครั้งเดียวตอน component โหลด

  return theme // คืนค่า theme ที่ได้ไปให้ layout
}