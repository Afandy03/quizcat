// lib/useTheme.ts
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { auth, db } from "./firebase" // import มาจากไฟล์ที่มึงมีอยู่แล้ว
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// สร้าง object หน้าตาของ theme ไว้ใช้
interface Theme {
  bgColor: string
  textColor: string
}

// Global cache สำหรับ theme เพื่อป้องกันการโหลดซ้ำ
let globalThemeCache: Theme | null = null
let globalThemeInitialized = false

// ฟังก์ชันโหลด theme จาก localStorage (sync)
function loadThemeFromStorage(): Theme {
  if (typeof window === 'undefined') {
    return { bgColor: "#ffffff", textColor: "#000000" }
  }
  
  // ถ้ามี global cache แล้ว ใช้เลย
  if (globalThemeCache && globalThemeInitialized) {
    console.log('🚀 Using global cache:', globalThemeCache)
    return globalThemeCache
  }
  
  const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
  console.log('🔍 Guest mode:', isGuestMode)
  
  if (isGuestMode) {
    const savedTheme = localStorage.getItem('quizcat-guest-theme')
    console.log('👥 Guest theme from localStorage:', savedTheme)
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme)
        globalThemeCache = parsed
        console.log('✅ Guest theme loaded:', parsed)
        return parsed
      } catch (error) {
        console.error('❌ Error parsing guest theme:', error)
      }
    }
  } else {
    // สำหรับ user ที่ login แล้ว ลองหา cache theme
    const cachedTheme = localStorage.getItem('quizcat-user-theme-cache')
    console.log('👤 User theme cache from localStorage:', cachedTheme)
    if (cachedTheme) {
      try {
        const parsed = JSON.parse(cachedTheme)
        globalThemeCache = parsed
        console.log('✅ User theme cache loaded:', parsed)
        return parsed
      } catch (error) {
        console.error('❌ Error parsing cached theme:', error)
      }
    }
  }
  
  const defaultTheme = { bgColor: "#ffffff", textColor: "#000000" }
  globalThemeCache = defaultTheme
  console.log('⚪ Using default theme:', defaultTheme)
  return defaultTheme
}

export function useUserTheme() {
  // โหลด theme จาก localStorage หรือ global cache ทันทีเพื่อป้องกันกระพริบ
  const [theme, setTheme] = useState<Theme>(() => loadThemeFromStorage())
  // ✅ เริ่มต้นไม่ loading เพราะเรามี cache แล้ว, จะ loading เฉพาะตอนที่ต้องรอ Firebase Auth
  const [isLoading, setIsLoading] = useState(false)
  
  // ใช้ ref เพื่อป้องกันการ re-run useEffect ที่ไม่จำเป็น
  const authListenerRef = useRef<(() => void) | null>(null)
  const themeLoadedRef = useRef(globalThemeInitialized)

  // Memoized function สำหรับการอัปเดต theme
  const updateTheme = useCallback((newTheme: Theme) => {
    globalThemeCache = newTheme
    setTheme(newTheme)
  }, [])

  // อัปเดต CSS variables เมื่อ theme เปลี่ยน (ใช้ useCallback เพื่อ optimize)
  const updateCSSVariables = useCallback((themeToUpdate: Theme) => {
    // รองรับ gradient
    if (themeToUpdate.bgColor.includes('gradient')) {
      document.documentElement.style.setProperty('--background', 'transparent')
      document.body.style.background = themeToUpdate.bgColor
    } else {
      document.documentElement.style.setProperty('--background', themeToUpdate.bgColor)
      document.body.style.background = ''
    }
    document.documentElement.style.setProperty('--foreground', themeToUpdate.textColor)
  }, [])

  useEffect(() => {
    updateCSSVariables(theme)
  }, [theme, updateCSSVariables])

  useEffect(() => {
    // ถ้า theme ถูกโหลดแล้วจาก global cache ไม่ต้องทำอะไร
    if (themeLoadedRef.current && authListenerRef.current) {
      return authListenerRef.current
    }

    // ตรวจสอบ guest mode ก่อน
    const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
    
    if (isGuestMode) {
      console.log('👤 Guest mode detected')
      // สำหรับ guest ใช้ theme จาก localStorage
      const savedTheme = localStorage.getItem('quizcat-guest-theme')
      if (savedTheme) {
        try {
          const parsedTheme = JSON.parse(savedTheme)
          updateTheme(parsedTheme)
          console.log('✅ Guest theme loaded:', parsedTheme)
        } catch (error) {
          console.error('Error parsing guest theme:', error)
          updateTheme({ bgColor: "#ffffff", textColor: "#000000" })
        }
      } else {
        updateTheme({ bgColor: "#ffffff", textColor: "#000000" })
        console.log('🔧 Guest using default theme')
      }
      // ✅ ไม่ต้อง setIsLoading(false) เพราะเราเริ่มต้นเป็น false แล้ว
      globalThemeInitialized = true
      themeLoadedRef.current = true
      return
    }

    // onAuthStateChanged จะคอยฟังว่าสถานะ login เปลี่ยนไปมั้ย (login, logout)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed, user:', user?.uid || 'null')
      try {
        if (user) {
          // เช็คว่ามี cache อยู่แล้วหรือไม่
          const existingCache = localStorage.getItem('quizcat-user-theme-cache')
          if (existingCache) {
            console.log('💾 Found existing cache, using it first')
            try {
              const cachedTheme = JSON.parse(existingCache)
              updateTheme(cachedTheme)
              // ✅ ไม่ต้อง setIsLoading(false) เพราะเราไม่ได้ loading อยู่แล้ว
              globalThemeInitialized = true
              themeLoadedRef.current = true
              console.log('✅ Cache theme applied immediately')
            } catch (error) {
              console.error('❌ Error parsing existing cache:', error)
            }
          }

          // ถ้ามี user login อยู่ ยังคงดึงจาก Firestore เพื่อ sync (แต่ไม่แสดง loading)
          console.log('🔥 Fetching theme from Firestore for sync...')
          const docRef = doc(db, "users", user.uid)
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            const userData = docSnap.data()
            // เช็คว่าในข้อมูล user มี field ที่ชื่อ theme อยู่มั้ย
            if (userData.theme) {
              updateTheme(userData.theme)
              // อัปเดต cache เสมอ
              localStorage.setItem('quizcat-user-theme-cache', JSON.stringify(userData.theme))
              console.log('✅ Theme synced from Firestore:', userData.theme)
            } else {
              console.log('⚠️ No theme data in Firestore')
            }
          } else {
            console.log('⚠️ User document not found in Firestore')
          }
        } else {
          // ถ้าไม่มี user login, ก็ใช้ค่าเริ่มต้นไป
          updateTheme({ bgColor: "#ffffff", textColor: "#000000" })
          // ลบ cache เมื่อ logout
          localStorage.removeItem('quizcat-user-theme-cache')
          globalThemeCache = null
          console.log('🚪 User logged out, cleared cache')
        }
      } catch (error) {
        console.error('❌ Error loading theme:', error)
      } finally {
        // ✅ ไม่ต้อง setIsLoading(false) เพราะเราไม่ได้ loading อยู่แล้ว
        globalThemeInitialized = true
        themeLoadedRef.current = true
      }
    })

    authListenerRef.current = unsubscribe

    // Cleanup function: หยุดการทำงานของ onAuthStateChanged เมื่อ component ถูก unmount
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current()
        authListenerRef.current = null
      }
    }
  }, [updateTheme]) // ขึ้นอยู่กับ updateTheme เท่านั้น

  return { theme, isLoading } // คืนค่า theme และสถานะการโหลด
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