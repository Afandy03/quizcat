// lib/normalizeKey.ts
export function normalizeKey(subject?: string, topic?: string): string {
  const cleanSubject = (subject || "ไม่ระบุ").trim().toLowerCase()
  const cleanTopic = (topic || "ไม่ระบุ").trim().toLowerCase()
  return `${cleanSubject} / ${cleanTopic}`
}