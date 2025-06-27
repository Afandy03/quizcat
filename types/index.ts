// types/index.ts

// ประเภทของข้อมูลคำตอบแต่ละข้อ
export interface Answer {
  id: string;
  questionText?: string; // 👈 เพิ่มบรรทัดนี้เข้าไป
  subject?: string;
  topic?: string;
  correct?: boolean;
  confidenceLevel?: string;
  score?: number;
  timeSpent?: number;
}

// ประเภทของข้อมูลสรุปแต่ละ Section (สำหรับกราฟและรายการ)
export interface SummaryData {
  section: string;
  correct: number;
  total: number;
  percent: number;
  guess: number;
  not_confident: number;
  confident: number;
}

// ประเภทของข้อมูล Insight สรุปภาพรวม
export interface Insights {
  total: number;
  avgScore: number;
  avgTime: number;
  mostTimeSpent: [string, number] | null;
  best: { topic: string; avg: number } | null;
  worst: { topic: string; avg: number } | null;
}