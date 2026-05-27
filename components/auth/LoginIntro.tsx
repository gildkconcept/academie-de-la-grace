'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface LoginIntroProps {
  userData: {
    name: string
    role: string
    level?: number
  }
}

export const LoginIntro = ({ userData }: LoginIntroProps) => {
  const router = useRouter()
  const [step, setStep] = useState<'greeting' | 'verse' | 'complete'>('greeting')
  const [greeting, setGreeting] = useState('')
  const [verse, setVerse] = useState<{ text: string; reference: string } | null>(null)
  const [loadingVerse, setLoadingVerse] = useState(true)

  useEffect(() => {
    if (!userData || !userData.name) {
      console.error('userData is undefined, redirecting to login')
      router.push('/login')
      return
    }

    const hour = new Date().getHours()
    let greetingText = ''
    
    if (hour < 12) greetingText = 'Bonjour'
    else if (hour < 18) greetingText = 'Bon après-midi'
    else greetingText = 'Bonsoir'
    
    setGreeting(greetingText)
    
    const fetchVerse = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${API_URL}/api/verses/today`, { credentials: 'include' })
        const data = await res.json()
        if (data.verse) {
          setVerse({
            text: data.verse.verse,
            reference: data.verse.reference
          })
        } else {
          setVerse({
            text: "Si par l'offense d'un seul la mort a régné par lui seul, à plus forte raison ceux qui reçoivent l'abondance de la grâce et du don de la justice régneront-ils dans la vie par Jésus-Christ lui seul.",
            reference: "Romains 5:17"
          })
        }
      } catch (error) {
        console.error('Erreur chargement verset:', error)
        setVerse({
          text: "Si par l'offense d'un seul la mort a régné par lui seul, à plus forte raison ceux qui reçoivent l'abondance de la grâce et du don de la justice régneront-ils dans la vie par Jésus-Christ lui seul.",
          reference: "Romains 5:17"
        })
      } finally {
        setLoadingVerse(false)
      }
    }
    
    fetchVerse()
    
    // Délais plus courts pour tester
    const delay1 = 2000  // 2 secondes pour greeting
    const delay2 = 3000  // 3 secondes pour verse
    const delay3 = 4000  // 4 secondes pour complete
    
    const t1 = setTimeout(() => {
      console.log('🟢 Étape 1: passage à verse')
      setStep('verse')
    }, delay1)
    
    const t2 = setTimeout(() => {
      console.log('🟢 Étape 2: passage à complete')
      setStep('complete')
    }, delay2)
    
    const t3 = setTimeout(() => {
      console.log('🔴 REDIRECTION - Rôle:', userData?.role)
      if (userData?.role === 'superadmin') {
        console.log('👉 Redirection vers /dashboard/superadmin')
        router.push('/dashboard/superadmin')
      } else if (userData?.role === 'service_manager') {
        console.log('👉 Redirection vers /dashboard/manager')
        router.push('/dashboard/manager')
      } else {
        console.log('👉 Redirection vers /dashboard/student')
        router.push('/dashboard/student')
      }
    }, delay3)
    
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [userData, router])

  if (!userData || !userData.name) {
    return null
  }

  if (loadingVerse) {
    return null
  }

  if (!verse) {
    return null
  }

  const getRoleEmoji = () => {
    if (userData?.role === 'superadmin') return '👑'
    if (userData?.role === 'service_manager') return '⛪'
    return '📚'
  }

  const getRoleText = () => {
    if (userData?.role === 'superadmin') return 'Administrateur'
    if (userData?.role === 'service_manager') return 'Responsable de service'
    return `Niveau ${userData?.level || 1}`
  }

  const firstName = userData?.name ? userData.name.split(' ')[0] : ''

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
      >
        <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0" style={{ 
          background: 'linear-gradient(135deg, rgba(8,20,90,0.96) 0%, rgba(15,45,130,0.93) 40%, rgba(10,30,100,0.94) 70%, rgba(4,12,65,0.97) 100%)' 
        }} />
        
        <div className="hidden md:block absolute w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-[100px] -top-[100px] -right-[100px] animate-float" />
        <div className="hidden md:block absolute w-[250px] h-[250px] rounded-full bg-blue-500/8 blur-[100px] bottom-[10%] -left-[100px] animate-float-delayed" />
        <div className="hidden md:block absolute w-[200px] h-[200px] rounded-full bg-indigo-400/8 blur-[80px] top-[40%] left-[20%] animate-float-slow" />

        <div className="md:hidden absolute w-[150px] h-[150px] rounded-full bg-blue-400/10 blur-[60px] -top-[50px] -right-[50px]" />
        <div className="md:hidden absolute w-[120px] h-[120px] rounded-full bg-blue-500/8 blur-[60px] bottom-[5%] -left-[50px]" />

        <div className="relative z-10 text-center px-6 sm:px-4 max-w-2xl mx-auto w-full">
          
          {step === 'greeting' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-0"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                className="inline-block mb-3 md:mb-4"
              >
                <span className="text-4xl sm:text-5xl md:text-6xl">✨</span>
              </motion.div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-normal text-white mb-1 md:mb-2 text-center px-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {greeting} <span className="text-blue-300 block sm:inline">{firstName}</span>
              </h1>
              <p className="text-blue-200/60 text-xs sm:text-sm mt-1 md:mt-2">
                {getRoleEmoji()} {getRoleText()}
              </p>
              <div className="mt-4 md:mt-6 flex justify-center">
                <div className="w-10 md:w-12 h-0.5 bg-white/20 rounded-full" />
              </div>
            </motion.div>
          )}

          {step === 'verse' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-0"
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl sm:text-4xl md:text-5xl mb-4 md:mb-6"
              >
                📖
              </motion.div>
              <p className="text-white/90 text-base sm:text-lg md:text-xl leading-relaxed italic max-w-xs sm:max-w-sm md:max-w-md mx-auto px-2">
                “{verse.text}”
              </p>
              <p className="text-blue-300/70 text-xs sm:text-sm mt-3 md:mt-4">
                — {verse.reference}
              </p>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-0"
            >
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-blue-400/50"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-blue-400 rounded-full animate-pulse" />
                </div>
              </div>
              <p className="text-white/50 text-xs sm:text-sm mt-3 md:mt-4">Préparation de votre espace...</p>
            </motion.div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400"
            initial={{ width: '0%' }}
            animate={{ width: step === 'greeting' ? '33%' : step === 'verse' ? '66%' : '100%' }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(30px, -40px); }
            66% { transform: translate(-20px, 20px); }
          }
          @keyframes float-mobile {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(15px, -20px); }
            66% { transform: translate(-10px, 10px); }
          }
          .animate-float { animation: float 15s ease-in-out infinite; }
          .animate-float-delayed { animation: float 15s ease-in-out -5s infinite; }
          .animate-float-slow { animation: float 18s ease-in-out -10s infinite; }
          @media (max-width: 768px) {
            .animate-float { animation: float-mobile 12s ease-in-out infinite; }
            .animate-float-delayed { animation: float-mobile 12s ease-in-out -4s infinite; }
            .animate-float-slow { animation: float-mobile 14s ease-in-out -8s infinite; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}