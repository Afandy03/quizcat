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
  // ตั้งค่าเริ่มต้นเป็น ขาว/ดำ กันหน้าเว็บพังตอนโหลด
  const [theme, setTheme] = useState<Theme>({
    bgColor: "#ffffff",
    textColor: "#000000",
  })

  // อัปเดต CSS variables เมื่อ theme เปลี่ยน
  useEffect(() => {
    // รองรับ gradient
    if (theme.bgColor.includes('gradient')) {
      document.documentElement.style.setProperty('--background', 'transparent')
      document.body.style.background = theme.bgColor
    } else {
      document.documentElement.style.setProperty('--background', theme.bgColor)
      document.body.style.background = ''
    }
    document.documentElement.style.setProperty('--foreground', theme.textColor)
  }, [theme])

  useEffect(() => {
    // ตรวจสอบ guest mode ก่อน
    const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
    
    if (isGuestMode) {
      // สำหรับ guest ใช้ theme จาก localStorage
      const savedTheme = localStorage.getItem('quizcat-guest-theme')
      if (savedTheme) {
        try {
          const parsedTheme = JSON.parse(savedTheme)
          setTheme(parsedTheme)
        } catch (error) {
          console.error('Error parsing guest theme:', error)
          setTheme({ bgColor: "#ffffff", textColor: "#000000" }) // default สำหรับ guest
        }
      } else {
        setTheme({ bgColor: "#ffffff", textColor: "#000000" }) // default สำหรับ guest
      }
      return
    }

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
        setTheme({ bgColor: "#ffffff", textColor: "#000000" })
      }
    })

    // Cleanup function: หยุดการทำงานของ onAuthStateChanged เมื่อ component ถูก unmount
    return () => unsubscribe()
  }, []) // useEffect นี้จะทำงานแค่ครั้งเดียวตอน component โหลด

  return theme // คืนค่า theme ที่ได้ไปให้ layout
}

// ฟังก์ชันสำหรับบันทึก theme ของ guest
export function saveGuestTheme(theme: Theme) {
  localStorage.setItem('quizcat-guest-theme', JSON.stringify(theme))
}

// ฟังก์ชัน helper สำหรับการใช้ background ที่รองรับ gradient
export function getBackgroundStyle(bgColor: string) {
  const isGradient = bgColor.includes('gradient')
  return isGradient 
    ? { background: bgColor }
    : { backgroundColor: bgColor }
}