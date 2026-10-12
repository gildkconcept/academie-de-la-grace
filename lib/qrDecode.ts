// lib/qrDecode.ts
// Lecture d'un QR code dans une image de caméra, et messages d'erreur de caméra en français.

export interface FrameData {
  data: Uint8ClampedArray
  width: number
  height: number
}

// Bibliothèque de lecture (jsQR) : chargée seulement quand le scanner est ouvert
let jsQRPromise: Promise<(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string } | null> | null = null

function loadJsQR() {
  if (!jsQRPromise) {
    jsQRPromise = import('jsqr').then((mod: any) => (mod.default || mod) as any)
  }
  return jsQRPromise
}

export async function preloadQrDecoder(): Promise<void> {
  await loadJsQR()
}

export async function decodeFrame(frame: FrameData): Promise<string | null> {
  const jsQR = await loadJsQR()
  const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })
  return result ? result.data : null
}

export function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name || ''
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'La caméra ne fonctionne que sur une connexion sécurisée (HTTPS).'
  }
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "Accès à la caméra refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez."
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucune caméra détectée sur cet appareil.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return "La caméra de l'appareil ne convient pas. Essayez avec un autre navigateur."
    case 'SecurityError':
      return "Le navigateur bloque l'accès à la caméra pour des raisons de sécurité."
    default:
      return 'Impossible de démarrer la caméra.'
  }
}