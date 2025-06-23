"use client"

import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">👋 ยินดีต้อนรับสู่ QuizCat</h1>
      <p className="text-gray-600 mb-6">ระบบฝึกทำโจทย์ + แต้ม + แทคแมวสุดน่ารัก</p>

      <Link href="/login">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          ไปหน้า Login / สมัครสมาชิก
        </button>
      </Link>
    </main>
  )
}