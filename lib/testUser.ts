// lib/testUser.ts
export const TEST_USER_EMAIL = 'test@test.com'
export const TEST_USER_PASSWORD = '123456'

export function isTestUser(email?: string | null): boolean {
  return email === TEST_USER_EMAIL
}

export function isCurrentUserTest(): boolean {
  // ตรวจสอบจาก localStorage หรือ auth context
  const testMode = localStorage.getItem('quizcat-test-mode')
  return testMode === 'true'
}

export function setTestMode(isTest: boolean) {
  if (isTest) {
    localStorage.setItem('quizcat-test-mode', 'true')
    console.log('🤖 Test mode activated for AI/automation')
  } else {
    localStorage.removeItem('quizcat-test-mode')
  }
}

// สำหรับ AI/automation ใช้ในการสร้างข้อมูลทดสอบ
export function generateTestData() {
  return {
    userId: 'test_user_ai',
    email: TEST_USER_EMAIL,
    displayName: 'AI Test User',
    points: 1000,
    theme: {
      bgColor: '#3b82f6',
      textColor: '#ffffff'
    }
  }
}

// ตรวจสอบว่าอยู่ใน test environment หรือไม่
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         typeof window !== 'undefined' && window.location.hostname === 'localhost'
}
