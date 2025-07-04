"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import Image from "next/image"
import { useRouter } from "next/navigation"
import ThemedLayout from "@/components/ThemedLayout"
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme"
import { AnimatePresence, motion } from "framer-motion"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore"




export default function RewardsPage() {
  const router = useRouter()
  const { theme } = useUserTheme()
  const [user, setUser] = useState<any>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [userRole, setUserRole] = useState("user")
  const [rewards, setRewards] = useState<any[]>([])
  const [userClaimedRewards, setUserClaimedRewards] = useState<string[]>([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const u = auth.currentUser
        if (!u) return
  
        setUser(u)
  
        const userSnap = await getDoc(doc(db, "users", u.uid))
        const userData = userSnap.data()
        setUserPoints(userData?.points || 0)
        setUserRole(userData?.role || "user")
  
        // ดึงข้อมูลรางวัลที่ผู้ใช้เคยแลกแล้ว
        const claimsSnapshot = await getDocs(
          collection(db, "reward_claims")
        );
        
        // สร้างรายการ ID รางวัลที่ผู้ใช้นี้เคยแลกแล้ว
        const claimedRewardIds = claimsSnapshot.docs
          .filter(doc => doc.data().userId === u.uid)
          .map(doc => doc.data().rewardId);
          
        setUserClaimedRewards(claimedRewardIds);
  
        // ดึงรายการของรางวัลทั้งหมด
        const snap = await getDocs(collection(db, "rewards"))
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        // Debug: ตรวจสอบข้อมูลรางวัลที่ได้
        console.log('Fetched rewards:', items);
        items.forEach((item: any, index: number) => {
          console.log(`Reward ${index + 1}:`, {
            name: item.name,
            imageUrl: item.imageUrl,
            cost: item.cost
          });
        });
        
        setRewards(items)
      } catch (error) {
        console.error("Error fetching rewards data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleClaim = async (reward: any) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนแลกของรางวัล")
      return router.push("/login")
    }
    
    if (userPoints < reward.cost) return alert("แต้มไม่พอ!")

    const confirmClaim = window.confirm(`แลก "${reward.name}" ใช่ไหม?`)
    if (!confirmClaim) return

    await updateDoc(doc(db, "users", user.uid), {
      points: userPoints - reward.cost,
    })

    await addDoc(collection(db, "reward_claims"), {
      userId: user.uid,
      rewardId: reward.id,
      rewardName: reward.name,
      cost: reward.cost,
      claimedAt: serverTimestamp(),
      userEmail: user.email || "",
    })

    // เพิ่ม ID ของรางวัลที่แลกแล้วเข้าไปในรายการ
    setUserClaimedRewards(prev => [...prev, reward.id]);
    
    alert(`แลก "${reward.name}" เรียบร้อย!`)
    setUserPoints(userPoints - reward.cost)
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("แน่ใจว่าจะลบของรางวัลนี้?")
    if (!confirmDelete) return

    await deleteDoc(doc(db, "rewards", id))
    setRewards((prev) => prev.filter((r) => r.id !== id))
  }



  const isExpired = (reward: any) => {
    if (!reward.expiresAt) return false
    const now = new Date()
    const expiredAt = reward.expiresAt.toDate?.() || new Date(reward.expiresAt)
    return expiredAt < now
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header & Navigation */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>🎁 แลกของรางวัล</h1>
              <p style={{ color: theme.textColor + '80' }}>
                สะสมแต้มเพื่อแลกของรางวัลสุดพิเศษ
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/rewards/history")}
                className="px-4 py-2 rounded-xl transition-all"
                style={{ 
                  backgroundColor: theme.textColor + '15',
                  color: theme.textColor 
                }}
              >
                📜 ประวัติการแลก
              </button>
              <button
                onClick={() => router.push("/rewards/add")}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                ➕ เพิ่มรางวัลใหม่
              </button>
            </div>
          </div>

          {/* Points display */}
          <div 
            className="p-5 rounded-2xl shadow-md border flex items-center justify-center gap-3"
            style={{ 
              ...getBackgroundStyle(theme.bgColor), 
              borderColor: theme.textColor + '20' 
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.textColor + '15' }}
            >
              <span className="text-2xl">🪙</span>
            </div>
            <div>
              <p className="text-sm" style={{ color: theme.textColor + '70' }}>แต้มสะสมของคุณ</p>
              <p className="text-3xl font-bold" style={{ color: theme.textColor }}>
                {userPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.textColor }}></div>
            <p className="ml-3" style={{ color: theme.textColor + '80' }}>กำลังโหลดรางวัล...</p>
          </div>
        ) : rewards.length === 0 ? (
          <div 
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: theme.textColor + '10' }}
          >
            <p className="text-xl" style={{ color: theme.textColor }}>ยังไม่มีรางวัลในขณะนี้</p>
            <p className="mt-2" style={{ color: theme.textColor + '80' }}>โปรดกลับมาใหม่ภายหลัง</p>
          </div>
        ) : (
          /* Rewards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <AnimatePresence>
              {rewards.map((r, index) => {
                const expired = isExpired(r)
                const alreadyClaimed = userClaimedRewards.includes(r.id)
                const canClaim = userPoints >= r.cost && !expired && !alreadyClaimed
                
                return (
                  <motion.div 
                    key={r.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="relative rounded-2xl overflow-hidden shadow-lg border"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor), 
                      borderColor: theme.textColor + '20' 
                    }}
                  >
                    {/* Delete button */}
                    {(userRole === "admin" || r.createdByUid === user?.uid || r.createdByEmail === user?.email || r.createdBy === user?.email || r.createdBy === user?.displayName) && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="absolute top-3 right-3 p-2 rounded-full z-10 shadow-md"
                        style={{ backgroundColor: theme.textColor + '15' }}
                      >
                        <span style={{ color: theme.textColor }}>🗑️</span>
                      </button>
                    )}
                    
                    {/* Reward image */}
                    <div className="relative aspect-[4/3] w-full bg-gray-100">
                      {r.imageUrl ? (
                        <Image
                          src={r.imageUrl.trim()}
                          alt={r.name || 'Reward image'}
                          fill
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PC9zdmc+"
                          onError={(e) => {
                            console.error('Image load error for:', r.imageUrl);
                            // ใช้ fallback image เมื่อรูปโหลดไม่ได้
                            e.currentTarget.src = "https://i.pinimg.com/564x/bd/ce/45/bdce4587851a6ebe571e71f00de7743f.jpg";
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully:', r.imageUrl);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: theme.textColor + '10' }}>
                          <div className="text-center">
                            <span className="text-4xl">🎁</span>
                            <p className="mt-2 text-sm" style={{ color: theme.textColor + '50' }}>ไม่มีรูป</p>
                          </div>
                        </div>
                      )}
                      {expired && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <p className="text-white text-xl font-bold p-2 bg-red-600 bg-opacity-80 rounded-lg transform rotate-12">
                            หมดเวลา
                          </p>
                        </div>
                      )}
                      {alreadyClaimed && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-lg shadow-md">
                            ✓ แลกแล้ว
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Reward info */}
                    <div className="p-5 space-y-3">
                      <h3 className="text-xl font-bold" style={{ color: theme.textColor }}>{r.name}</h3>
                      
                      {r.description && (
                        <p style={{ color: theme.textColor + '80' }} className="text-sm">
                          {r.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center py-1">
                        <div 
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ 
                            backgroundColor: theme.textColor + '15', 
                            color: theme.textColor 
                          }}
                        >
                          🪙 {r.cost.toLocaleString()} แต้ม
                        </div>
                        
                        <div style={{ color: theme.textColor + '70' }} className="text-sm">
                          ⏳ {r.expiresAt
                            ? new Date(r.expiresAt.toDate?.() || r.expiresAt).toLocaleDateString("th-TH")
                            : "ไม่มีกำหนด"}
                        </div>
                      </div>
                      
                      {/* Action button */}
                      <button
                        disabled={!canClaim && !alreadyClaimed}
                        onClick={() => alreadyClaimed ? null : handleClaim(r)}
                        className={`w-full py-3 rounded-xl font-medium shadow-sm transition-all mt-3 ${
                          alreadyClaimed
                            ? "bg-purple-500 text-white"
                            : canClaim 
                              ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
                              : "bg-gray-400 text-white"
                        }`}
                      >
                        {alreadyClaimed ? "✓ แลกแล้ว" :
                         expired ? "⛔ หมดเวลาแลกแล้ว" : 
                         canClaim ? "✅ แลกรางวัลเลย" : "❌ แต้มไม่พอ"}
                      </button>
                      
                      {r.createdBy && (
                        <p className="text-xs text-right" style={{ color: theme.textColor + '50' }}>
                          👤 เพิ่มโดย: {r.createdBy}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
        
        {/* Back to Dashboard */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="hover:underline transition-colors"
            style={{ color: theme.textColor + '70' }}
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </div>
    </ThemedLayout>
  )
}
