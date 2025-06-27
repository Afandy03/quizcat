// components/SummaryChart.tsx
"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts"
import { SummaryData } from "@/types" // 👈 1. Import 'SummaryData' จากไฟล์กลาง

// 2. กำหนดให้ props 'data' ใช้ Type 'SummaryData[]' ที่เรา import มา
interface SummaryChartProps {
  data: SummaryData[]
}

export default function SummaryChart({ data }: SummaryChartProps) {
  // ส่วน JSX ด้านล่างนี้ดีอยู่แล้ว ไม่ต้องแก้ไขครับ
  return (
    <div className="bg-white p-4 rounded shadow border">
      <h2 className="text-lg font-semibold mb-2">📈 เปรียบเทียบเปอร์เซ็นต์ความเข้าใจ</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="section" fontSize={10} interval={0} angle={-25} dy={20} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="percent" fill="#8884d8">
            <LabelList dataKey="percent" position="top" formatter={(value) => `${value}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}