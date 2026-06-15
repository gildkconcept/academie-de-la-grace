'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { verseService } from '@/services/verseService'

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

    useEffect(() => {
        if (!userData || !userData.name) {
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
                const data = await verseService.getToday()
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
                setVerse({
                    text: "Si par l'offense d'un seul la mort a régné par lui seul, à plus forte raison ceux qui reçoivent l'abondance de la grâce et du don de la justice régneront-ils dans la vie par Jésus-Christ lui seul.",
                    reference: "Romains 5:17"
                })
            }
        }
        fetchVerse()

        const delay1 = 2000
        const delay2 = 4000
        const delay3 = 5500

        const t1 = setTimeout(() => setStep('verse'), delay1)
        const t2 = setTimeout(() => setStep('complete'), delay2)
        const t3 = setTimeout(() => {
            if (userData?.role === 'superadmin') {
                router.push('/dashboard/superadmin')
            } else if (userData?.role === 'service_manager') {
                router.push('/dashboard/manager')
            } else {
                router.push('/dashboard/student')
            }
        }, delay3)

        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
        }
    }, [userData, router])

    if (!userData || !userData.name || !verse) return null

    const firstName = userData.name.split(' ')[0]
    const getRoleText = () => {
        if (userData.role === 'superadmin') return 'Administrateur'
        if (userData.role === 'service_manager') return 'Responsable de service'
        return `Niveau ${userData.level || 1}`
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
            >
                <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: "url('/ok.png')" }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.96) 0%, rgba(15,45,130,0.93) 40%, rgba(10,30,100,0.94) 70%, rgba(4,12,65,0.97) 100%)' }} />

                <div className="relative z-10 text-center px-6 max-w-2xl mx-auto w-full">
                    {step === 'greeting' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="inline-block mb-4"
                            >
                                <span className="text-5xl">✨</span>
                            </motion.div>
                            <h1 className="text-3xl md:text-5xl font-normal text-white text-center">
                                {greeting} <span className="text-blue-300">{firstName}</span>
                            </h1>
                            <p className="text-blue-200/60 text-sm mt-2">{getRoleText()}</p>
                        </motion.div>
                    )}

                    {step === 'verse' && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <div className="text-4xl mb-4">📖</div>
                            <p className="text-white/90 text-lg md:text-xl leading-relaxed italic max-w-md mx-auto">
                                “{verse.text}”
                            </p>
                            <p className="text-blue-300/70 text-sm mt-4">— {verse.reference}</p>
                        </motion.div>
                    )}

                    {step === 'complete' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <div className="relative w-16 h-16 mx-auto">
                                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-blue-400/50"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <p className="text-white/50 text-sm mt-4">Préparation de votre espace...</p>
                        </motion.div>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400"
                        initial={{ width: '0%' }}
                        animate={{ width: step === 'greeting' ? '33%' : step === 'verse' ? '66%' : '100%' }}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    )
}