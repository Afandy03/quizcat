// สคริปต์ทดสอบการทำงานของระบบ Quiz
// ใช้ในการตรวจสอบว่าการเพิ่มข้อสอบและการกรองข้อสอบทำงานสอดคล้องกัน

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

// Firebase config (ใช้ค่าจาก lib/firebase.js)
const firebaseConfig = {
  // ใส่ค่าจาก firebase config ของคุณที่นี่
  // จากไฟล์ lib/firebase.js
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ฟังก์ชันทดสอบการเพิ่มข้อสอบ
export async function testAddQuestion() {
  const testQuestion = {
    question: "ทดสอบการเพิ่มข้อสอบ",
    choices: ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
    correctIndex: 0,
    subject: "คณิตศาสตร์",
    topic: "การบวก",
    grade: "ป.4",  // ใช้ string format
    difficulty: 'easy',
    explanation: "นี่คือคำอธิบาย",
    createdBy: "test@example.com",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  try {
    const docRef = await addDoc(collection(db, "questions"), testQuestion)
    console.log("✅ เพิ่มข้อสอบสำเร็จ ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อสอบ:", error)
    throw error
  }
}

// ฟังก์ชันทดสอบการโหลดข้อสอบ
export async function testLoadQuestions() {
  try {
    const qSnap = await getDocs(collection(db, 'questions'))
    const questions = qSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log("📋 จำนวนข้อสอบทั้งหมด:", questions.length)
    
    // วิเคราะห์ประเภทของ grade
    const gradeTypes = {}
    questions.forEach(q => {
      const gradeType = typeof q.grade
      const gradeValue = q.grade
      const key = `${gradeType}: ${gradeValue}`
      gradeTypes[key] = (gradeTypes[key] || 0) + 1
    })

    console.log("📊 ประเภทของ grade ที่พบ:")
    Object.entries(gradeTypes).forEach(([key, count]) => {
      console.log(`  ${key} (${count} ข้อ)`)
    })

    return questions
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการโหลดข้อสอบ:", error)
    throw error
  }
}

// ฟังก์ชันทดสอบการกรองข้อสอบ
export async function testFilterQuestions() {
  try {
    const questions = await testLoadQuestions()
    
    // ทดสอบการกรองด้วย grade
    const gradeFilters = ['ป.4', 'ป.5', 'ป.6', '4', '5', '6']
    
    console.log("🔍 ทดสอบการกรองด้วย grade:")
    
    gradeFilters.forEach(gradeFilter => {
      const filtered = questions.filter(q => {
        if (typeof q.grade === 'string') {
          if (q.grade === gradeFilter) return true
          
          const selectedNum = parseInt(gradeFilter)
          if (!isNaN(selectedNum) && q.grade.startsWith('ป.')) {
            const gradeNum = parseInt(q.grade.replace('ป.', ''))
            return gradeNum === selectedNum
          }
          
          return false
        } else {
          const selectedNum = parseInt(gradeFilter)
          return !isNaN(selectedNum) && q.grade === selectedNum
        }
      })
      
      console.log(`  กรอง "${gradeFilter}": พบ ${filtered.length} ข้อ`)
    })

    // ทดสอบการกรองด้วย subject
    const uniqueSubjects = [...new Set(questions.map(q => q.subject).filter(Boolean))]
    console.log("🏷️ วิชาที่พบ:", uniqueSubjects)
    
    uniqueSubjects.forEach(subject => {
      const filtered = questions.filter(q => q.subject === subject)
      console.log(`  วิชา "${subject}": ${filtered.length} ข้อ`)
    })

    return {
      totalQuestions: questions.length,
      subjects: uniqueSubjects,
      gradeTypes: gradeFilters.map(gf => ({
        filter: gf,
        count: questions.filter(q => {
          if (typeof q.grade === 'string') {
            if (q.grade === gf) return true
            const selectedNum = parseInt(gf)
            if (!isNaN(selectedNum) && q.grade.startsWith('ป.')) {
              const gradeNum = parseInt(q.grade.replace('ป.', ''))
              return gradeNum === selectedNum
            }
            return false
          } else {
            const selectedNum = parseInt(gf)
            return !isNaN(selectedNum) && q.grade === selectedNum
          }
        }).length
      }))
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการทดสอบกรอง:", error)
    throw error
  }
}

// ฟังก์ชันหลักสำหรับรันการทดสอบ
export async function runAllTests() {
  console.log("🚀 เริ่มทดสอบระบบ Quiz")
  
  try {
    // ทดสอบการโหลด
    console.log("\n1. ทดสอบการโหลดข้อสอบ")
    await testLoadQuestions()
    
    // ทดสอบการกรอง
    console.log("\n2. ทดสอบการกรองข้อสอบ")
    const filterResults = await testFilterQuestions()
    
    // ทดสอบการเพิ่ม (ถ้าต้องการ)
    // console.log("\n3. ทดสอบการเพิ่มข้อสอบ")
    // await testAddQuestion()
    
    console.log("\n✅ ทดสอบเสร็จสิ้น!")
    return filterResults
    
  } catch (error) {
    console.error("❌ การทดสอบล้มเหลว:", error)
    throw error
  }
}

// สำหรับใช้ใน browser console
if (typeof window !== 'undefined') {
  window.quizTest = {
    runAllTests,
    testLoadQuestions,
    testFilterQuestions,
    testAddQuestion
  }
}
