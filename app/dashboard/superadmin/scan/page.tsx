// app/dashboard/superadmin/scan/page.tsx
// Pointage des présences par scan de la carte étudiant, depuis le navigateur du téléphone.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeftIcon, ArrowPathIcon, CameraIcon, StopIcon } from '@heroicons/react/24/outline'
import { CardScanner } from '@/components/CardScanner'
import { extractCardToken } from '@/lib/cardToken'
import {
    cardScanService,
    AttendanceItem,
    AttendanceCounts,
    ScanResult,
    ScanSession,
} from '@/services/cardScanService'

const SAME_CARD_DELAY_MS = 3500 // ignore le même QR lu plusieurs fois de suite
const COOLDOWN_MS = 1400 // laisse le temps de lire le résultat avant le scan suivant
const STORAGE_KEY = 'cardScanSessionId'

const METHOD_LABEL: Record<string, string> = {
    code: 'code',
    card: 'carte',
    manual: 'manuel',
    auto_mark: 'auto',
}

const TONE: Record<string, { box: string; icon: string; title: string }> = {
    recorded: { box: 'bg-green-500/15 border-green-400/40', icon: '✅', title: 'Présence enregistrée' },
    upgraded: { box: 'bg-green-500/15 border-green-400/40', icon: '✅', title: 'Présence enregistrée' },
    already_present: { box: 'bg-amber-500/15 border-amber-400/40', icon: '🟠', title: 'Déjà pointé' },
    not_eligible: { box: 'bg-amber-500/15 border-amber-400/40', icon: '⚠️', title: 'Niveau différent' },
    revoked: { box: 'bg-red-500/15 border-red-400/40', icon: '⛔', title: 'Carte désactivée' },
    invalid_card: { box: 'bg-red-500/15 border-red-400/40', icon: '❌', title: 'Carte invalide' },
    session_closed: { box: 'bg-red-500/15 border-red-400/40', icon: '⚠️', title: 'Séance non disponible' },
    session_not_found: { box: 'bg-red-500/15 border-red-400/40', icon: '⚠️', title: 'Séance non disponible' },
    technical: { box: 'bg-red-500/15 border-red-400/40', icon: '🔧', title: 'Erreur' },
    rate_limited: { box: 'bg-red-500/15 border-red-400/40', icon: '⏳', title: 'Trop de scans' },
    network_error: { box: 'bg-red-500/15 border-red-400/40', icon: '📡', title: 'Connexion perdue' },
}

const formatTime = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const sessionLabel = (s: ScanSession) => {
    const total = s.counts.present + s.counts.late
    return `${formatTime(s.createdAt)} · ${s.level === null ? 'Tous niveaux' : `Niveau ${s.level}`} · code ${s.code} · ${total} présent${total > 1 ? 's' : ''}`
}

interface RecentScan {
    key: number
    name: string
    outcome: string
    time: string
}

export default function CardScanPage() {
    const { user, loading } = useAuth()
    const router = useRouter()

    const [sessions, setSessions] = useState<ScanSession[]>([])
    const [loadingSessions, setLoadingSessions] = useState(true)
    const [sessionId, setSessionId] = useState('')
    const [scannerOn, setScannerOn] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<ScanResult | null>(null)
    const [recent, setRecent] = useState<RecentScan[]>([])
    const [items, setItems] = useState<AttendanceItem[]>([])
    const [counts, setCounts] = useState<AttendanceCounts | null>(null)
    const [manualText, setManualText] = useState('')
    const [missing, setMissing] = useState<number | null>(null)
    const [generating, setGenerating] = useState(false)

    const busyRef = useRef(false)
    const lastReadRef = useRef<{ raw: string; at: number }>({ raw: '', at: 0 })
    const cooldownUntilRef = useRef(0)
    const sessionIdRef = useRef('')
    const recentKey = useRef(0)

    useEffect(() => {
        sessionIdRef.current = sessionId
    }, [sessionId])

    // ---------- Chargement ----------
    const loadSessions = useCallback(async () => {
        setLoadingSessions(true)
        try {
            const list = await cardScanService.listSessions()
            setSessions(list)
            setSessionId((current) => {
                if (current && list.some((s) => s.id === current)) return current
                let saved = ''
                try {
                    saved = sessionStorage.getItem(STORAGE_KEY) || ''
                } catch {
                    saved = ''
                }
                if (saved && list.some((s) => s.id === saved)) return saved
                return list.length === 1 ? list[0].id : ''
            })
        } catch (error) {
            console.error('Erreur chargement séances:', error)
            toast.error('Impossible de charger les séances du jour')
        } finally {
            setLoadingSessions(false)
        }
    }, [])

    const loadAttendance = useCallback(async (id: string) => {
        if (!id) return
        try {
            const data = await cardScanService.getAttendance(id)
            if (sessionIdRef.current !== id) return
            setItems(data.items)
            setCounts(data.counts)
        } catch (error) {
            console.error('Erreur chargement présents:', error)
        }
    }, [])

    const loadMissing = useCallback(async () => {
        try {
            const data = await cardScanService.getMissingCards()
            setMissing(data.missing)
        } catch {
            setMissing(null)
        }
    }, [])

    useEffect(() => {
        if (loading) return
        if (!user) {
            router.push('/login')
            return
        }
        if (user.role === 'service_manager') {
            router.push('/dashboard/manager')
            return
        }
        if (user.role !== 'superadmin') {
            router.push('/dashboard/student')
            return
        }
        loadSessions()
        loadMissing()
    }, [user, loading, router, loadSessions, loadMissing])

    useEffect(() => {
        try {
            if (sessionId) sessionStorage.setItem(STORAGE_KEY, sessionId)
        } catch {
            /* stockage indisponible : sans importance */
        }
        setItems([])
        setCounts(null)
        setResult(null)
        if (!sessionId) return
        loadAttendance(sessionId)
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') loadAttendance(sessionId)
        }, 8000)
        return () => window.clearInterval(timer)
    }, [sessionId, loadAttendance])

    // ---------- Traitement d'un scan ----------
    const submitToken = useCallback(
        async (token: string) => {
            const id = sessionIdRef.current
            if (!id) {
                setResult({ ok: false, outcome: 'session_not_found', message: 'Aucune séance active sélectionnée' })
                return
            }
            busyRef.current = true
            setProcessing(true)
            const res = await cardScanService.scan(id, token)
            setResult(res)

            // Si l'enregistrement a échoué pour une raison technique, on autorise un nouvel essai immédiat
            if (res.outcome === 'technical' || res.outcome === 'network_error' || res.outcome === 'rate_limited') {
                lastReadRef.current = { raw: '', at: 0 }
            }

            recentKey.current += 1
            setRecent((list) =>
                [
                    {
                        key: recentKey.current,
                        name: res.student?.fullName || (res.card?.cardNumber ? `Carte ${res.card.cardNumber}` : 'Carte inconnue'),
                        outcome: res.outcome,
                        time: formatTime(new Date().toISOString()),
                    },
                    ...list,
                ].slice(0, 8)
            )

            try {
                if (res.ok) navigator.vibrate?.(80)
                else navigator.vibrate?.([120, 60, 120])
            } catch {
                /* vibration non disponible */
            }

            cooldownUntilRef.current = Date.now() + COOLDOWN_MS
            busyRef.current = false
            setProcessing(false)
            if (res.ok || res.outcome === 'already_present') loadAttendance(id)
        },
        [loadAttendance]
    )

    const handleDetected = useCallback(
        (raw: string) => {
            if (busyRef.current || Date.now() < cooldownUntilRef.current) return
            const now = Date.now()
            if (raw === lastReadRef.current.raw && now - lastReadRef.current.at < SAME_CARD_DELAY_MS) return
            lastReadRef.current = { raw, at: now }

            const token = extractCardToken(raw)
            if (!token) {
                setResult({
                    ok: false,
                    outcome: 'invalid_card',
                    message: "Ce QR code n'est pas une carte de l'Académie",
                })
                cooldownUntilRef.current = now + COOLDOWN_MS
                return
            }
            submitToken(token)
        },
        [submitToken]
    )

    const handleManual = () => {
        const token = extractCardToken(manualText)
        if (!token) {
            setResult({ ok: false, outcome: 'invalid_card', message: "Ce lien n'est pas une carte de l'Académie" })
            return
        }
        if (busyRef.current) return
        submitToken(token)
        setManualText('')
    }

    const handleGenerateMissing = async () => {
        setGenerating(true)
        try {
            const res = await cardScanService.generateMissingCards()
            toast.success(`${res.created} carte${res.created > 1 ? 's' : ''} créée${res.created > 1 ? 's' : ''}`)
            await loadMissing()
        } catch {
            toast.error('Impossible de créer les cartes pour le moment')
        } finally {
            setGenerating(false)
        }
    }

    // ---------- Affichage ----------
    if (loading || !user || user.role !== 'superadmin') {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}>
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const tone = result ? TONE[result.outcome] || TONE.technical : null
    const totalPresent = counts ? counts.present + counts.late : 0

    return (
        <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
            <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
            <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.94) 0%, rgba(15,45,130,0.9) 40%, rgba(10,30,100,0.92) 70%, rgba(4,12,65,0.96) 100%)' }} />

            <div className="relative z-30 max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-16">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/dashboard/superadmin" className="p-2 hover:bg-white/10 rounded-lg transition-colors" aria-label="Retour">
                        <ArrowLeftIcon className="w-5 h-5 text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                            📷 Pointage par carte
                        </h1>
                        <p className="text-white/50 text-xs sm:text-sm">Scannez la carte étudiant avec la caméra du téléphone</p>
                    </div>
                </div>

                {/* Séance */}
                <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="scan-session" className="text-white/70 text-sm">Séance</label>
                        <button
                            type="button"
                            onClick={loadSessions}
                            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
                            aria-label="Actualiser les séances"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {sessions.length === 0 && !loadingSessions ? (
                        <p className="text-white/60 text-sm">
                            Aucune séance aujourd&apos;hui. Générez d&apos;abord un code de présence depuis le{' '}
                            <Link href="/dashboard/superadmin" className="underline text-white/80">tableau de bord</Link> : la même séance sert aussi au pointage par carte.
                        </p>
                    ) : (
                        <select
                            id="scan-session"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            className="w-full p-2.5 rounded-lg bg-white text-gray-900 text-sm"
                        >
                            <option value="">— Choisir la séance —</option>
                            {sessions.map((s) => (
                                <option key={s.id} value={s.id}>{sessionLabel(s)}</option>
                            ))}
                        </select>
                    )}

                    {counts && (
                        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                            {[
                                { label: 'Présents', value: totalPresent, color: 'text-green-300' },
                                { label: 'Par code', value: counts.byMethod.code || 0, color: 'text-blue-300' },
                                { label: 'Par carte', value: counts.byMethod.card || 0, color: 'text-yellow-300' },
                                { label: 'Manuel', value: counts.byMethod.manual || 0, color: 'text-purple-300' },
                            ].map((c) => (
                                <div key={c.label} className="bg-white/[0.05] rounded-lg py-2">
                                    <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
                                    <div className="text-white/50 text-[10px] sm:text-xs">{c.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Scanner */}
                <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4 mb-3">
                    <CardScanner active={scannerOn} paused={processing} onDetected={handleDetected} />
                    <div className="mt-3 flex gap-2">
                        {!scannerOn ? (
                            <button
                                type="button"
                                onClick={() => setScannerOn(true)}
                                disabled={!sessionId}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-[#0b1a5c] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#e0b84a' }}
                            >
                                <CameraIcon className="w-5 h-5" />
                                Démarrer le scanner
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setScannerOn(false)}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white bg-red-500/30 hover:bg-red-500/40 transition-colors"
                            >
                                <StopIcon className="w-5 h-5" />
                                Arrêter le scanner
                            </button>
                        )}
                    </div>
                    {!sessionId && <p className="text-white/50 text-xs mt-2">Choisissez d&apos;abord une séance.</p>}
                </div>

                {/* Résultat du dernier scan */}
                {result && tone && (
                    <div className={`rounded-xl border p-4 mb-3 ${tone.box}`} role="status" aria-live="polite">
                        <div className="flex items-start gap-3">
                            {result.student?.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={result.student.photoUrl} alt="" referrerPolicy="no-referrer" className="w-16 h-20 rounded-lg object-cover flex-shrink-0" style={{ border: '2px solid #e0b84a' }} />
                            ) : (
                                <div className="text-4xl flex-shrink-0">{tone.icon}</div>
                            )}
                            <div className="min-w-0">
                                <p className="text-white font-semibold">{tone.icon} {tone.title}</p>
                                <p className="text-white/80 text-sm">{result.message}</p>
                                {result.student && (
                                    <div className="mt-1 text-white text-sm">
                                        <p className="font-medium text-base">{result.student.fullName}</p>
                                        <p className="text-white/60 text-xs">
                                            {[result.student.serviceName, result.student.branch, result.student.level ? `Niveau ${result.student.level}` : null, result.student.cardNumber]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                )}
                                {result.outcome === 'already_present' && result.previous && (
                                    <p className="text-white/60 text-xs mt-1">
                                        Pointé {result.previous.method ? `par ${METHOD_LABEL[result.previous.method] || result.previous.method}` : ''}
                                        {result.previous.at ? ` à ${formatTime(result.previous.at)}` : ''}
                                    </p>
                                )}
                                {result.outcome === 'upgraded' && (
                                    <p className="text-white/60 text-xs mt-1">Remplace une absence enregistrée automatiquement.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Saisie manuelle */}
                <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4 mb-3">
                    <label htmlFor="scan-manual" className="text-white/70 text-sm">Coller le lien d&apos;une carte (si le scan est impossible)</label>
                    <div className="flex gap-2 mt-2">
                        <input
                            id="scan-manual"
                            value={manualText}
                            onChange={(e) => setManualText(e.target.value)}
                            placeholder="https://…/verify/…"
                            className="flex-1 min-w-0 p-2.5 rounded-lg bg-white text-gray-900 text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleManual}
                            disabled={!sessionId || !manualText.trim() || processing}
                            className="px-4 rounded-lg text-sm font-semibold text-[#0b1a5c] disabled:opacity-50"
                            style={{ background: '#e0b84a' }}
                        >
                            Valider
                        </button>
                    </div>
                </div>

                {/* Derniers scans de cet appareil */}
                {recent.length > 0 && (
                    <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4 mb-3">
                        <h2 className="text-white/80 text-sm mb-2">Derniers scans</h2>
                        <ul className="space-y-1">
                            {recent.map((r) => (
                                <li key={r.key} className="flex items-center justify-between text-sm">
                                    <span className="text-white/80 truncate">{(TONE[r.outcome] || TONE.technical).icon} {r.name}</span>
                                    <span className="text-white/40 text-xs ml-2">{r.time}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Liste des présents (code + carte + manuel) */}
                {sessionId && (
                    <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4 mb-3">
                        <h2 className="text-white/80 text-sm mb-2">Présents de la séance ({totalPresent})</h2>
                        {items.length === 0 ? (
                            <p className="text-white/40 text-sm">Aucun présent pour le moment.</p>
                        ) : (
                            <ul className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto">
                                {items.map((it, i) => (
                                    <li key={`${it.studentId}-${i}`} className="flex items-center gap-3 py-2">
                                        {it.photoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={it.photoUrl} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm flex-shrink-0">
                                                {it.fullName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white text-sm truncate">{it.fullName}</p>
                                            <p className="text-white/40 text-xs truncate">{[it.serviceName, it.branch].filter(Boolean).join(' · ')}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-white/70 text-xs">{formatTime(it.scannedAt)}</p>
                                            <p className="text-white/40 text-[10px]">
                                                {it.method ? METHOD_LABEL[it.method] || it.method : ''}{it.status === 'late' ? ' · retard' : ''}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Cartes manquantes */}
                {missing !== null && missing > 0 && (
                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 sm:p-4 mb-3">
                        <p className="text-amber-100 text-sm">
                            {missing} étudiant{missing > 1 ? 's' : ''} actif{missing > 1 ? 's' : ''} n&apos;{missing > 1 ? 'ont' : 'a'} pas encore de carte (elle est créée à la première ouverture par l&apos;étudiant).
                            Créez-les maintenant pour pouvoir les scanner.
                        </p>
                        <button
                            type="button"
                            onClick={handleGenerateMissing}
                            disabled={generating}
                            className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#0b1a5c] disabled:opacity-50"
                            style={{ background: '#e0b84a' }}
                        >
                            {generating ? 'Création…' : 'Créer les cartes manquantes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}