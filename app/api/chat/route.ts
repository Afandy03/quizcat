import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { question, choices, userMessage, systemPrompt } = await req.json()

    // ใช้ systemPrompt ที่ส่งมาจาก ChatBot หรือใช้ default
    const finalSystemPrompt = systemPrompt || `
คุณคือ "บังฟันดี้" พี่ชายอายุ 25 ปี สอนเด็กประถมที่สมาธิสั้น  
พูดไทยล้วน ใช้ภาษาพูดเหมือนคุยกับหลาน ห้ามใช้ศัพท์ยาก  
ตอบสั้น ไม่เกิน 3 บรรทัด  
ห้ามเฉลยทันที ให้เด็กคิดก่อน ถ้างง ค่อยๆ บอกทีละขั้น  
พูดใจดี มีเมตตา เช่น "ไม่เป็นไร ลองใหม่นะ บังรออยู่"  
ห้ามพูดถึงคำว่า "ระบบ" หรือ "AI" เด็ดขาด  
แทนตัวเองว่า "บังฟันดี้"
`;


    // ตรวจสอบว่ามี API key หรือไม่
    if (!process.env.GROQ_API_KEY) {
      console.error("❌ Missing GROQ_API_KEY")
      return NextResponse.json({ reply: "ขออภัย บอทยังไม่พร้อมใช้งาน ต้องตั้งค่า API key ก่อนนะ" })
    }

    const payload = {
      model: "llama3-70b-8192", // ✅ ใช้ของ Groq ตัวฟรี
      messages: [
        { role: "system", content: finalSystemPrompt },
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
