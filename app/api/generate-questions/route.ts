import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `คุณเป็นผู้เชี่ยวชาญในการสร้างข้อสอบปรนัย ภาษาไทย สำหรับนักเรียน
          
กรุณาสร้างข้อสอบตามคำขอ และตอบกลับในรูปแบบ JSON ที่ถูกต้องเท่านั้น โดยไม่ต้องมีข้อความอื่นเพิ่มเติม

รูปแบบ JSON ที่ต้องการ:
{
  "questions": [
    {
      "question": "คำถาม",
      "choices": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
      "correctIndex": 0,
      "explanation": "คำอธิบาย"
    }
  ]
}

หลักเกณฑ์:
- คำถามต้องชัดเจน เข้าใจง่าย
- ตัวเลือกทั้ง 4 ต้องสมเหตุสมผล
- correctIndex เป็นดัชนี 0-3 ของคำตอบที่ถูก
- คำอธิบายต้องอธิบายเหตุผลของคำตอบ
- ใช้ภาษาไทยที่เหมาะสมกับระดับชั้น`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean up the response to ensure it's valid JSON
    let jsonString = content.trim();
    
    // Remove any markdown code blocks
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    try {
      const questionsData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        throw new Error('Invalid response structure from AI');
      }

      // Validate each question
      const validatedQuestions = questionsData.questions.map((q: any, index: number) => {
        if (!q.question || !q.choices || !Array.isArray(q.choices) || q.choices.length !== 4) {
          throw new Error(`Invalid question structure at index ${index}`);
        }
        
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
          throw new Error(`Invalid correctIndex at question ${index}`);
        }

        return {
          question: String(q.question).trim(),
          choices: q.choices.map((c: any) => String(c).trim()),
          correctIndex: Number(q.correctIndex),
          explanation: q.explanation ? String(q.explanation).trim() : ""
        };
      });

      return NextResponse.json({ questions: validatedQuestions });

    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      return NextResponse.json({ 
        error: 'Invalid JSON response from AI',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        rawContent: content.substring(0, 500) // First 500 chars for debugging
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
