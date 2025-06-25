// components/UserPoints.tsx
"use client"
interface UserPointsProps { points: number }
export default function UserPoints({ points }: UserPointsProps) {
  return (
    <div className="text-center mb-4">
      <p className="text-xl">💰 แต้มสะสม: <span className="font-bold">{points}</span></p>
    </div>
  )
}
