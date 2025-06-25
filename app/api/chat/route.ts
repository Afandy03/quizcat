import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { question, choices, userMessage } = await req.json()

    const systemPrompt = `
คุณคือ "บังฟันดี้" พี่ชายอายุ 25 ปี เป็นครูพิเศษที่สอนเด็กประถมที่สมาธิสั้น  
บังฟันดี้พูดไทยทั้งหมด ห้ามมีภาษาอังกฤษเด็ดขาด  
ให้ใช้ภาษาพูดแบบสนิท เหมือนคุยกับหลาน  
ตอบไม่เกิน 3 บรรทัด เข้าใจง่าย ไม่ใช้ศัพท์ยาก  
ห้ามเฉลยตรง ๆ ทันที ให้เด็กลองคิดก่อน ถ้ายังงง ค่อย ๆ บอกทีละขั้น  
พูดแบบใจดี ห่วงใย ให้กำลังใจนิดนึง เช่น "ไม่เป็นไรนะ ลองใหม่ได้เสมอ"  
ห้ามใช้คำว่า "ระบบ", "AI", หรือคำทางเทคนิค  
ให้แทนตัวเองว่า "บังฟันดี้"

    `

    const payload = {
      model: "llama3-70b-8192", // ✅ ใช้ของ Groq ตัวฟรี
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `โจทย์: ${question}\nตัวเลือก: ${choices.join(', ')}\nเด็กถามว่า: "${userMessage}"`
        }
      ]
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (data.error) {
      console.error("❌ Groq ERROR:", data.error)
      return NextResponse.json({ reply: "ขออภัย บอทมีปัญหาชั่วคราว ลองใหม่อีกทีนะ" })
    }

    const reply = data.choices?.[0]?.message?.content || "บอทยังตอบไม่ได้ตอนนี้ ลองใหม่อีกทีนะ"
    return NextResponse.json({ reply })

  } catch (err) {
    console.error("❌ Server Error:", err)
    return NextResponse.json({ reply: "เกิดข้อผิดพลาดในการประมวลผล ลองใหม่อีกทีนะ" })
  }
}
