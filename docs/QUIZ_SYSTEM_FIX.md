# คำแนะนำการตรวจสอบระบบ Quiz

## สรุปปัญหาที่พบและการแก้ไข

### ปัญหาหลัก: ความไม่สอดคล้องของข้อมูล `grade`

**ปัญหา:**
- หน้าเพิ่มข้อสอบ (`addquestion/page.tsx`) บันทึก `grade` เป็น `string` เช่น "ป.4", "ป.5", "ป.6"
- หน้าเลือกข้อสอบ (`select/page.tsx`) คาดหวัง `grade` เป็น `number` 
- ทำให้การกรองข้อสอบไม่ทำงาน เพราะเปรียบเทียบ string กับ number

**การแก้ไข:**
1. ปรับ interface ของ `Question` ให้ `grade` รองรับทั้ง `string | number`
2. ปรับฟังก์ชัน `getAvailableQuestions()` ให้รองรับทั้งสองประเภท
3. ปรับการแสดงผลใน dropdown ให้แสดงถูกต้อง

## วิธีตรวจสอบการทำงาน

### 1. ตรวจสอบผ่าน Browser Console

1. เปิดหน้าเว็บ QuizCat
2. กด F12 เพื่อเปิด Developer Tools
3. ไปที่ tab Console
4. รันคำสั่ง:

```javascript
// ตรวจสอบข้อมูลทั้งหมด
checkFirebaseData()

// ตรวจสอบการกรองเฉพาะ
// (หลังจากรัน checkFirebaseData() แล้ว)
const questions = await (await import('/lib/firebase.js')).getDocs(
  (await import('firebase/firestore')).collection(
    (await import('/lib/firebase.js')).db, 'questions'
  )
).then(snap => snap.docs.map(doc => ({id: doc.id, ...doc.data()})))

// ทดสอบการกรองด้วย grade ต่างๆ
['ป.4', 'ป.5', 'ป.6', '4', '5', '6'].forEach(grade => {
  const filtered = testFilterLogic(questions, grade)
  console.log(`กรอง "${grade}": ${filtered.length} ข้อ`)
})
```

### 2. ตรวจสอบผ่านหน้าเว็บ

1. เปิดหน้า "เพิ่มข้อสอบ" (/quiz/manage/addquestion)
2. เพิ่มข้อสอบทดสอบ:
   - วิชา: "ทดสอบ"
   - หัวข้อ: "การทดสอบ"
   - ระดับชั้น: "ป.4"
   - ตัวเลือก: กรอกข้อมูลครบ
   - บันทึก

3. เปิดหน้า "ทำข้อสอบ V2" (/quiz/v2/select)
4. ทดสอบการกรอง:
   - เลือกวิชา "ทดสอบ"
   - เลือกระดับชั้น "ป.4"
   - ดูว่าพบข้อสอบหรือไม่

### 3. ตรวจสอบใน Firebase Console

1. เปิด Firebase Console
2. ไปที่ Firestore Database
3. ดูข้อมูลใน collection "questions"
4. ตรวจสอบ field "grade" ว่าเป็น string หรือ number

## สิ่งที่ได้แก้ไข

### ไฟล์ `/app/quiz/v2/select/page.tsx`:

1. **Interface Question:**
   ```typescript
   grade: string | number  // เดิม: grade: number
   ```

2. **State declaration:**
   ```typescript
   const [grades, setGrades] = useState<(string | number)[]>([])
   ```

3. **การประมวลผล grades:**
   - รองรับทั้ง string และ number
   - แปลง "ป.X" เป็น number เพื่อเรียงลำดับ
   - เก็บค่าเดิมไว้สำหรับการกรอง

4. **ฟังก์ชัน getAvailableQuestions:**
   - ตรวจสอบทั้ง string และ number
   - รองรับการเปรียบเทียบ "ป.4" กับ "4"

5. **การแสดงผล dropdown:**
   - แสดง "ป.X" สำหรับทั้ง string และ number
   - ใช้ค่าเดิมเป็น value

## การทดสอบที่แนะนำ

1. **ทดสอบการเพิ่มข้อสอบ:**
   - เพิ่มข้อสอบใหม่ด้วย grade ที่หลากหลาย
   - ตรวจสอบว่าบันทึกลง Firebase ถูกต้อง

2. **ทดสอบการกรอง:**
   - ทดสอบกรองด้วย grade ทุกประเภท
   - ตรวจสอบว่าแสดงผลถูกต้อง

3. **ทดสอบการแสดงผล:**
   - ตรวจสอบ dropdown ว่าแสดงเป็น "ป.X"
   - ตรวจสอบว่าไม่มี "ป.NaN"

## หมายเหตุ

- ระบบจะรองรับข้อมูลเก่าที่เป็น number และข้อมูลใหม่ที่เป็น string
- การกรองจะทำงานได้ทั้งสองแบบ
- ไม่จำเป็นต้องแปลงข้อมูลเก่าในฐานข้อมูล
