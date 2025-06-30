// scripts/testAutomation.js
// สคริปต์สำหรับทดสอบ automated testing ด้วย test user

const TEST_USER = {
  email: 'test@test.com',
  password: '123456'
}

// ฟังก์ชันช่วยสำหรับ automation
const TestUtils = {
  // Login ด้วย test user
  async loginTestUser() {
    // ตั้งค่าข้อมูล
    document.querySelector('input[type="email"]').value = TEST_USER.email
    document.querySelector('input[type="password"]').value = TEST_USER.password
    
    // กดปุ่ม login
    const loginButton = document.querySelector('button[onclick*="handleLogin"]')
    if (loginButton) {
      loginButton.click()
    }
    
    console.log('🤖 Test user login initiated')
  },

  // เช็คว่า test mode ทำงานหรือไม่
  isTestMode() {
    return localStorage.getItem('quizcat-test-mode') === 'true'
  },

  // รันการทดสอบอัตโนมัติ
  async runAutomatedTest() {
    console.log('🚀 Starting automated test...')
    
    // 1. ตรวจสอบหน้า login
    if (window.location.pathname === '/login') {
      await this.loginTestUser()
      return
    }
    
    // 2. ตรวจสอบหน้า dashboard
    if (window.location.pathname === '/dashboard') {
      console.log('✅ Test user logged in successfully')
      
      // ทดสอบไปหน้าต่าง ๆ
      setTimeout(() => {
        window.location.href = '/quiz/v2/select'
      }, 2000)
      return
    }
    
    // 3. ทดสอบหน้า quiz select
    if (window.location.pathname === '/quiz/v2/select') {
      console.log('🎯 Testing quiz selection...')
      
      // เลือกวิชาแรก
      const subjectSelect = document.querySelector('select')
      if (subjectSelect && subjectSelect.options.length > 1) {
        subjectSelect.selectedIndex = 1
        subjectSelect.dispatchEvent(new Event('change'))
      }
      
      // เริ่มทำข้อสอบ
      setTimeout(() => {
        const startButton = document.querySelector('button[onclick*="handleStart"]')
        if (startButton && !startButton.disabled) {
          startButton.click()
        }
      }, 1000)
      return
    }
    
    console.log('📍 Current page:', window.location.pathname)
  },

  // ล้างข้อมูลทดสอบ
  clearTestData() {
    localStorage.removeItem('quizcat-test-mode')
    console.log('🧹 Test data cleared')
  }
}

// เปิดใช้งานใน global scope สำหรับการใช้งานใน console
if (typeof window !== 'undefined') {
  window.TestUtils = TestUtils
}

// Export สำหรับ Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestUtils
}

console.log('🤖 Test automation utilities loaded')
console.log('Usage: TestUtils.runAutomatedTest() or window.TestUtils.runAutomatedTest()')
