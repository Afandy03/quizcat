'use client'

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" 
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
         }}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-pink-300 bg-opacity-20 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute top-40 right-40 w-24 h-24 bg-yellow-300 bg-opacity-15 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-40 w-36 h-36 bg-blue-300 bg-opacity-15 rounded-full blur-xl animate-bounce delay-500"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20"></div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 text-center p-8 max-w-4xl mx-auto">
        {/* Glowing Title */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-black mb-4 bg-gradient-to-r from-white via-pink-200 to-purple-200 bg-clip-text text-transparent"
              style={{
                textShadow: '0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.3)',
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))'
              }}>
            🚧 กำลังก่อสร้าง 🚧
          </h1>
        </div>
        
        {/* Stylized Message */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="relative">
            {/* Sparkle Effects */}
            <div className="absolute -top-4 -left-4 text-yellow-300 text-2xl animate-spin">✨</div>
            <div className="absolute -top-2 -right-6 text-pink-300 text-xl animate-pulse">💫</div>
            <div className="absolute -bottom-4 -right-4 text-blue-300 text-2xl animate-bounce">⭐</div>
            <div className="absolute -bottom-2 -left-6 text-purple-300 text-xl animate-pulse delay-500">🌟</div>
            
            <p className="text-2xl md:text-3xl font-bold text-white mb-6 leading-relaxed"
               style={{
                 textShadow: '0 2px 20px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.3)',
                 letterSpacing: '0.02em'
               }}>
              ขี้เกียจเขียน ข้าวก็ไม่ได้กิน นอนก็ไม่ได้นอน 😴<br/>
              มีแพทชั่นมากกว่านี้ 🔥<br/>
              เดี๋ยวค่อยมาเขียนต่อ บายยยยย ลาก่อยย🫠
            </p>
            
            {/* Animated Progress Bar */}
            <div className="mt-8">
              <div className="text-white/80 text-sm mb-2">ความคืบหน้า</div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-pulse"
                     style={{ width: '42%' }}></div>
              </div>
              <div className="text-white/60 text-xs mt-1">42% เสร็จแล้ว... หรือเปล่า? 🤔</div>
            </div>
          </div>
        </div>
        
        {/* Loading Animation */}
        <div className="mt-8 flex justify-center items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-pink-300 rounded-full animate-bounce delay-100"></div>
          <div className="w-3 h-3 bg-purple-300 rounded-full animate-bounce delay-200"></div>
        </div>
        
        {/* Fun Status Message */}
        <div className="mt-6 text-white/70 text-lg font-medium">
          <span className="animate-pulse">⏳ กำลังสร้างสรรค์ผลงานชิ้นเอก...</span>
        </div>
      </div>
      
      {/* Floating CSS Animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.2); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.4); }
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
