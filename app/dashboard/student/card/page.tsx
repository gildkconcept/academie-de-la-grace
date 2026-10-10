// app/dashboard/student/card/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowPathIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cardService, getVerifyUrl, MyCard } from '@/services/cardService'
import { StudentIdCard } from '@/components/StudentIdCard'
import { downloadStudentCardPdf } from '@/lib/studentCardPdf'

export default function StudentCardPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [data, setData] = useState<MyCard | null>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    const fetchCard = useCallback(async () => {
        setLoadingData(true)
        setErrorMessage(null)
        try {
            const res = await cardService.getMyCard()
            setData(res)
            const url = getVerifyUrl(res.card.verifyToken)
            const qr = await QRCode.toDataURL(url, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 600,
                color: { dark: '#000000', light: '#ffffff' },
            })
            setQrDataUrl(qr)
        } catch (error: any) {
            const status = error?.response?.status
            if (status === 503) {
                setErrorMessage("La carte étudiant n'est pas encore disponible. Réessayez bientôt.")
            } else if (status === 403) {
                setErrorMessage('La carte étudiant est réservée aux étudiants.')
            } else {
                setErrorMessage('Impossible de charger votre carte pour le moment.')
            }
        } finally {
            setLoadingData(false)
        }
    }, [])

    useEffect(() => {
        if (loading) return
        if (!user) {
            router.push('/login')
            return
        }
        if (user.role === 'superadmin') {
            router.push('/dashboard/superadmin')
            return
        }
        if (user.role === 'service_manager') {
            router.push('/dashboard/manager')
            return
        }
        fetchCard()
    }, [user, loading, router, fetchCard])

    const handleDownload = async () => {
        if (!data || !qrDataUrl) return
        setDownloading(true)
        try {
            await downloadStudentCardPdf(data, getVerifyUrl(data.card.verifyToken), qrDataUrl)
            toast.success('Carte téléchargée')
        } catch (error) {
            console.error('Erreur PDF carte:', error)
            toast.error('Impossible de générer le PDF')
        } finally {
            setDownloading(false)
        }
    }

    const handleCopy = async () => {
        if (!data) return
        try {
            await navigator.clipboard.writeText(getVerifyUrl(data.card.verifyToken))
            toast.success('Lien de vérification copié')
        } catch {
            toast.error('Copie impossible')
        }
    }

    if (loading || loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}>
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const revoked = data?.card.status === 'revoked'

    return (
        <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
            <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
            <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.94) 0%, rgba(15,45,130,0.9) 40%, rgba(10,30,100,0.92) 70%, rgba(4,12,65,0.96) 100%)' }} />

            <div className="relative z-30 max-w-3xl mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard/student" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                            🪪 Ma carte étudiant
                        </h1>
                        <p className="text-white/50 text-sm">Votre carte d&apos;identité numérique</p>
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6 text-center">
                        <ExclamationTriangleIcon className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                        <p className="text-white/80 text-sm mb-4">{errorMessage}</p>
                        <button
                            onClick={fetchCard}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Réessayer
                        </button>
                    </div>
                )}

                {data && !errorMessage && (
                    <>
                        {revoked && (
                            <div className="mb-4 bg-red-500/15 border border-red-400/30 rounded-xl p-4 text-red-200 text-sm">
                                Cette carte a été révoquée. Elle n&apos;est plus valide. Rapprochez-vous de l&apos;administration.
                            </div>
                        )}

                        <StudentIdCard card={data.card} student={data.student} qrDataUrl={qrDataUrl} />

                        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={handleDownload}
                                disabled={downloading || revoked || !qrDataUrl}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[#0b1a5c] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                style={{ background: '#e0b84a' }}
                            >
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                {downloading ? 'Génération…' : 'Télécharger en PDF'}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <ClipboardDocumentIcon className="w-5 h-5" />
                                Copier le lien de vérification
                            </button>
                            <button
                                onClick={fetchCard}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Actualiser
                            </button>
                        </div>

                        <div className="mt-6 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-white/50 text-xs leading-relaxed">
                            <p>
                                Les informations de la carte viennent de votre profil : si elles changent, appuyez sur « Actualiser ».
                                Pour ajouter ou modifier votre photo, ouvrez la section Profil de votre tableau de bord.
                            </p>
                            <p className="mt-2">
                                Le QR code permet à toute personne de vérifier que votre carte est authentique. Il ne contient aucune de vos informations personnelles.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}