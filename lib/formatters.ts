export function formatTime(seconds: number | undefined | null): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0 || seconds > 3600) {
    return "ไม่มีข้อมูล"
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  if (mins > 0) return `${mins} นาที ${secs} วินาที`
  return `${secs} วินาที`
}
