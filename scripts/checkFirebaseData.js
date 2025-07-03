// สคริปต์ตรวจสอบข้อมูล Firebase - ใช้ในเบราว์เซอร์
// วิธีใช้: เปิด Console ใน Chrome/Firefox แล้วรันคำสั่ง

console.log("🔍 เริ่มตรวจสอบข้อมูล Firebase");

// ฟังก์ชันตรวจสอบข้อมูลในฐานข้อมูล
async function checkFirebaseData() {
  try {
    // ใช้ Firebase ที่โหลดไว้ในหน้าเว็บ
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('/lib/firebase.js');
    
    console.log("📡 กำลังดึงข้อมูลจาก Firebase...");
    
    const qSnap = await getDocs(collection(db, 'questions'));
    const questions = qSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log("📋 พบข้อสอบทั้งหมด:", questions.length, "ข้อ");
    
    // วิเคราะห์ประเภทของ grade
    const gradeAnalysis = {};
    questions.forEach(q => {
      const type = typeof q.grade;
      const value = q.grade;
      const key = `${type}: ${value}`;
      gradeAnalysis[key] = (gradeAnalysis[key] || 0) + 1;
    });
    
    console.log("📊 วิเคราะห์ field 'grade':");
    console.table(gradeAnalysis);
    
    // วิเคราะห์ subjects
    const subjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
    console.log("📚 วิชาที่พบ:", subjects);
    
    // วิเคราะห์ topics
    const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))];
    console.log("📖 หัวข้อที่พบ:", topics);
    
    // วิเคราะห์ difficulties
    const difficulties = [...new Set(questions.map(q => q.difficulty).filter(Boolean))];
    console.log("⭐ ระดับความยากที่พบ:", difficulties);
    
    // ทดสอบการกรอง
    console.log("\n🔍 ทดสอบการกรอง:");
    
    const testGrades = ['ป.4', 'ป.5', 'ป.6', '4', '5', '6'];
    testGrades.forEach(testGrade => {
      const filtered = questions.filter(q => {
        if (typeof q.grade === 'string') {
          if (q.grade === testGrade) return true;
          
          const selectedNum = parseInt(testGrade);
          if (!isNaN(selectedNum) && q.grade.startsWith('ป.')) {
            const gradeNum = parseInt(q.grade.replace('ป.', ''));
            return gradeNum === selectedNum;
          }
          
          return false;
        } else {
          const selectedNum = parseInt(testGrade);
          return !isNaN(selectedNum) && q.grade === selectedNum;
        }
      });
      
      console.log(`  กรอง "${testGrade}": ${filtered.length} ข้อ`);
    });
    
    // ตัวอย่างข้อสอบบางส่วน
    console.log("\n📋 ตัวอย่างข้อสอบ 3 ข้อแรก:");
    questions.slice(0, 3).forEach((q, i) => {
      console.log(`${i+1}. ${q.question}`);
      console.log(`   วิชา: ${q.subject}, หัวข้อ: ${q.topic}, ระดับ: ${q.grade} (${typeof q.grade})`);
    });
    
    return {
      totalQuestions: questions.length,
      gradeAnalysis,
      subjects,
      topics,
      difficulties,
      sampleQuestions: questions.slice(0, 3)
    };
    
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error);
    throw error;
  }
}

// ฟังก์ชันสำหรับทดสอบการกรอง
function testFilterLogic(questions, selectedGrade) {
  return questions.filter(q => {
    if (typeof q.grade === 'string') {
      if (q.grade === selectedGrade) return true;
      
      const selectedNum = parseInt(selectedGrade);
      if (!isNaN(selectedNum) && q.grade.startsWith('ป.')) {
        const gradeNum = parseInt(q.grade.replace('ป.', ''));
        return gradeNum === selectedNum;
      }
      
      return false;
    } else {
      const selectedNum = parseInt(selectedGrade);
      return !isNaN(selectedNum) && q.grade === selectedNum;
    }
  });
}

// เตรียมฟังก์ชันไว้ใช้ใน console
window.checkFirebaseData = checkFirebaseData;
window.testFilterLogic = testFilterLogic;

console.log("✅ พร้อมใช้งาน! ใช้คำสั่งต่อไปนี้:");
console.log("  checkFirebaseData() - ตรวจสอบข้อมูลทั้งหมด");
console.log("  testFilterLogic(questions, 'ป.4') - ทดสอบการกรอง");
