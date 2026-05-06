'use client'

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />
      <div className="relative z-30 text-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-white/60 font-medium text-sm">Chargement...</p>
      </div>
    </div>
  )
}