# Test User & AI Automation Guide

## 🤖 Test User Account

**สำหรับ AI และ Automated Testing**

```
Email: test@test.com
Password: 123456
```

## 🚀 การใช้งาน

### 1. Login ธรรมดา
- ใส่ email และ password ตามปกติ
- ระบบจะตรวจจับอัตโนมัติและเข้าสู่ Test Mode

### 2. Quick Test Login (Development only)
- กดปุ่ม "🤖 Test Login (AI/Automation)" ในหน้า login
- ระบบจะ login อัตโนมัติและสร้าง account ถ้ายังไม่มี

## 🔧 Features ที่แตกต่าง

### Test Mode มี:
- แสดง badge "🤖 Test User Mode" ใน Dashboard และ MainMenu
- localStorage `quizcat-test-mode = 'true'`
- ข้อมูลใน Firestore มี field `isTestUser: true`
- คะแนนเริ่มต้น 1000 points
- ธีมเริ่มต้นเป็นสีน้ำเงิน

### การตรวจสอบใน Code:
```javascript
import { isTestUser, isCurrentUserTest } from '@/lib/testUser'

// ตรวจสอบจาก email
if (isTestUser(user.email)) {
  // logic สำหรับ test user
}

// ตรวจสอบ current user
if (isCurrentUserTest()) {
  // test mode logic
}
```

## 🎯 Automation Scripts

### ใน Browser Console:
```javascript
// รัน automated test
TestUtils.runAutomatedTest()

// ล้างข้อมูลทดสอบ
TestUtils.clearTestData()

// เช็ค test mode
TestUtils.isTestMode()
```

### สำหรับ External Tools:
1. เปิด `http://localhost:3003/login`
2. Execute: `window.TestUtils.runAutomatedTest()`
3. ระบบจะทำการทดสอบอัตโนมัติผ่านหน้าต่าง ๆ

## 📊 Test Data Structure

```javascript
// ข้อมูลใน Firestore สำหรับ test user
{
  email: "test@test.com",
  displayName: "AI Test User", 
  points: 1000,
  theme: {
    bgColor: "#3b82f6",
    textColor: "#ffffff"
  },
  isTestUser: true,
  createdAt: Date
}
```

## 🛡️ Security

- Test user **ใช้ได้เฉพาะใน Development** environment
- ปุ่ม Quick Login แสดงเฉพาะเมื่อ `NODE_ENV === 'development'`
- ไม่มีข้อมูลสำคัญในบัญชีนี้

## 🔄 Reset Test Environment

```javascript
// ใน Browser Console
localStorage.clear()
TestUtils.clearTestData()

// หรือ logout แล้ว login ใหม่
```

## 📝 Usage Examples

### สำหรับ Manual Testing:
1. กด "🤖 Test Login" ในหน้า login
2. ดู badge "🤖 Test User Mode" ใน UI
3. ทดสอบ features ต่าง ๆ

### สำหรับ Automated Testing:
1. เปิด browser automation tool (Selenium, Playwright, etc.)
2. Navigate ไปยัง `/login`
3. Execute `window.TestUtils.runAutomatedTest()`
4. ติดตาม console logs เพื่อดู progress

## 🎨 UI Indicators

- **Dashboard**: แสดง purple badge "🤖 Test User Mode"
- **MainMenu**: แสดง purple indicator ด้านบน
- **Console**: แสดง logs พิเศษสำหรับ test mode

---

**Happy Testing! 🧪🤖**
