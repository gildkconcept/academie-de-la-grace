// components/CardScanner.tsx
// Scanner de QR code avec la caméra du téléphone (navigateur, HTTPS requis).
// - caméra arrière si disponible, autorisation demandée explicitement ;
// - détecteur natif du navigateur (BarcodeDetector) quand il existe, sinon jsQR ;
// - messages d'erreur clairs (autorisation, caméra absente ou occupée, HTTPS).
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraErrorMessage, decodeFrame, preloadQrDecoder } from '@/lib/qrDecode'

interface CardScannerProps {
  active: boolean
  paused?: boolean
  onDetected: (raw: string) => void
}

const MAX_WIDTH = 720 // les images sont réduites avant lecture : plus rapide, sans perte de fiabilité
const MIN_DELAY_MS = 140

export function CardScanner({ active, paused = false, onDetected }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const pausedRef = useRef(paused)
  const onDetectedRef = useRef(onDetected)
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const stop = useCallback(() => {
    runningRef.current = false
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (!active) {
      stop()
      setStatus('idle')
      return
    }

    let cancelled = false
    runningRef.current = true
    setErrorMessage(null)
    setStatus('starting')

    const start = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error('unsupported'), { name: window.isSecureContext ? 'NotFoundError' : 'SecurityError' })
        }

        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
        } catch (error: any) {
          if (error?.name !== 'OverconstrainedError' && error?.name !== 'ConstraintNotSatisfiedError') throw error
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play()
        if (cancelled) return

        // Détecteur natif si disponible (rapide, optimisé par le téléphone)
        let detector: { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } | null = null
        const NativeDetector = (window as any).BarcodeDetector
        if (NativeDetector) {
          try {
            const formats: string[] | undefined = await NativeDetector.getSupportedFormats?.()
            if (!formats || formats.includes('qr_code')) detector = new NativeDetector({ formats: ['qr_code'] })
          } catch {
            detector = null
          }
        }
        if (!detector) await preloadQrDecoder()
        if (cancelled) return

        setStatus('scanning')

        const tick = async () => {
          if (!runningRef.current) return
          const started = Date.now()
          try {
            if (!pausedRef.current && video.readyState >= 2 && video.videoWidth > 0) {
              let raw: string | null = null

              if (detector) {
                try {
                  const found = await detector.detect(video)
                  raw = found?.[0]?.rawValue || null
                } catch {
                  detector = null // le détecteur natif a échoué : on passe à jsQR
                  await preloadQrDecoder()
                }
              }

              if (!detector && !raw) {
                const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
                const width = Math.round(video.videoWidth * scale)
                const height = Math.round(video.videoHeight * scale)
                const canvas = canvasRef.current || (canvasRef.current = document.createElement('canvas'))
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d', { willReadFrequently: true })
                if (ctx) {
                  ctx.drawImage(video, 0, 0, width, height)
                  const image = ctx.getImageData(0, 0, width, height)
                  raw = await decodeFrame({ data: image.data, width, height })
                }
              }

              if (raw && runningRef.current) onDetectedRef.current(raw)
            }
          } catch (error) {
            console.error('Erreur de lecture du QR code:', error)
          }
          if (runningRef.current) {
            const wait = Math.max(0, MIN_DELAY_MS - (Date.now() - started))
            timerRef.current = window.setTimeout(tick, wait)
          }
        }
        tick()
      } catch (error) {
        if (cancelled) return
        stop()
        setErrorMessage(cameraErrorMessage(error))
        setStatus('error')
      }
    }

    start()

    return () => {
      cancelled = true
      stop()
    }
  }, [active, attempt, stop])

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '4 / 3' }}>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

      {status === 'scanning' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-2xl"
            style={{ width: '62%', aspectRatio: '1 / 1', border: '3px solid rgba(224,184,74,0.9)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}
          />
        </div>
      )}

      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-6 text-center">
          La caméra est arrêtée. Appuyez sur « Démarrer le scanner ».
        </div>
      )}

      {status === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm px-6 text-center gap-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Démarrage de la caméra… autorisez l&apos;accès si le navigateur le demande.
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3 bg-black/80">
          <p className="text-red-200 text-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/15 hover:bg-white/25 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {status === 'scanning' && paused && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 text-white text-xs">
          Traitement…
        </div>
      )}
    </div>
  )
}