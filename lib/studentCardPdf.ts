// lib/studentCardPdf.ts
// Génération du PDF de la carte étudiant (jsPDF). La carte est dessinée à la taille réelle
// d'une carte bancaire (85,6 x 54 mm) au centre d'une page A4, prête à être imprimée.

import type { jsPDF } from 'jspdf'
import type { MyCard } from '@/services/cardService'

type RGB = [number, number, number]

const NAVY: RGB = [11, 26, 92]
const NAVY_PHOTO: RGB = [22, 40, 125]
const GOLD: RGB = [224, 184, 74]
const WHITE: RGB = [255, 255, 255]
const MUTED: RGB = [160, 176, 235]
const GREEN: RGB = [120, 220, 150]
const RED: RGB = [255, 130, 130]
const GREY_TEXT: RGB = [90, 100, 130]
const LINK_BLUE: RGB = [30, 70, 170]

export const CARD_W = 85.6
export const CARD_H = 54
export const PHOTO_ASPECT = 21 / 26

export interface CardPdfData {
  fullName: string
  serviceName: string | null
  branch: string | null
  level: number | null
  cardNumber: string
  status: 'active' | 'revoked'
  issuedAt: string
  verifyUrl: string
  qrDataUrl: string
  photoDataUrl: string | null // déjà recadrée au format de la photo, ou null
  logoDataUrl: string | null
}

// ---------------------------------------------------------------------------
// Chargement d'images (navigateur uniquement)
// ---------------------------------------------------------------------------
export async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Recadre l'image au format voulu (comme "object-fit: cover") pour ne jamais la déformer.
export function cropToAspectDataUrl(dataUrl: string, aspect: number, outWidth = 420): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const outHeight = Math.round(outWidth / aspect)
        const canvas = document.createElement('canvas')
        canvas.width = outWidth
        canvas.height = outHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        const srcAspect = img.width / img.height
        let sw = img.width
        let sh = img.height
        if (srcAspect > aspect) sw = img.height * aspect
        else sh = img.width / aspect
        const sx = (img.width - sw) / 2
        const sy = (img.height - sh) / 2
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outWidth, outHeight)
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

// ---------------------------------------------------------------------------
// Dessin (aucune API du navigateur : testable hors navigateur)
// ---------------------------------------------------------------------------
function fill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }
function ink(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }

// Réduit la taille de police pour que le texte tienne dans la largeur, puis tronque si besoin
function fitText(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize: number): string {
  let size = startSize
  doc.setFontSize(size)
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.25
    doc.setFontSize(size)
  }
  if (doc.getTextWidth(text) <= maxWidth) return text
  let t = text
  while (t.length > 1 && doc.getTextWidth(t + '...') > maxWidth) t = t.slice(0, -1)
  return t.trimEnd() + '...'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export function drawStudentCard(doc: jsPDF, x0: number, y0: number, d: CardPdfData): void {
  const W = CARD_W
  const H = CARD_H

  // Fond de la carte
  fill(doc, NAVY)
  doc.roundedRect(x0, y0, W, H, 3, 3, 'F')

  // Filet doré sous l'en-tête
  fill(doc, GOLD)
  doc.rect(x0 + 4, y0 + 11.2, W - 8, 0.35, 'F')

  // Emblème (logo si disponible, sinon médaillon "AG")
  if (d.logoDataUrl) {
    try {
      doc.addImage(d.logoDataUrl, 'PNG', x0 + 3.6, y0 + 1.8, 8, 8)
    } catch {
      /* logo illisible : on ignore */
    }
  } else {
    fill(doc, GOLD)
    doc.circle(x0 + 7.4, y0 + 5.6, 3.4, 'F')
    ink(doc, NAVY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.text('AG', x0 + 7.4, y0 + 6.6, { align: 'center' })
  }

  // Titres
  ink(doc, GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('ACADÉMIE DE LA GRÂCE', x0 + 13.5, y0 + 5.2)
  ink(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.2)
  doc.text("Carte d'étudiant · MEGA", x0 + 13.5, y0 + 8.6)

  // Photo
  const px = x0 + 5
  const py = y0 + 15
  const pw = 21
  const ph = 26
  let photoDrawn = false
  if (d.photoDataUrl) {
    try {
      doc.addImage(d.photoDataUrl, 'JPEG', px, py, pw, ph)
      photoDrawn = true
    } catch {
      /* image illisible : on bascule sur l'avatar */
    }
  }
  if (!photoDrawn) {
    fill(doc, NAVY_PHOTO)
    doc.roundedRect(px, py, pw, ph, 1.5, 1.5, 'F')
    fill(doc, MUTED)
    doc.circle(px + pw / 2, py + 10.5, 4.2, 'F')
    doc.roundedRect(px + 3.5, py + 15.5, pw - 7, 10, 5, 5, 'F')
    ink(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(3.6)
    doc.text('Photo non renseignée', px + pw / 2, py + ph + 2.6, { align: 'center' })
  }
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2])
  doc.setLineWidth(0.5)
  // Photo rectangulaire : cadre à angles droits (sinon les coins de l'image dépassent du cadre arrondi)
  if (photoDrawn) doc.rect(px, py, pw, ph, 'S')
  else doc.roundedRect(px, py, pw, ph, 1.5, 1.5, 'S')

  // Informations
  const tx = x0 + 30
  const row = (i: number, label: string, value: string, maxW: number, color: RGB = WHITE, startSize = 8.5) => {
    const labelY = y0 + 15.3 + i * 7.5
    ink(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(4.3)
    doc.text(label, tx, labelY)
    doc.setFont('helvetica', 'bold')
    ink(doc, color)
    const shown = fitText(doc, value, maxW, startSize, 5)
    doc.text(shown, tx, labelY + 3.6)
  }
  row(0, 'NOM ET PRÉNOMS', d.fullName || '-', 50.5, WHITE, 9)
  row(1, 'SERVICE', d.serviceName || '-', 50.5)
  row(2, 'BRANCHE', d.branch || '-', 27)
  row(3, 'NIVEAU', d.level ? `Niveau ${d.level}` : '-', 14)
  row(4, 'N° ÉTUDIANT', d.cardNumber, 27, GOLD, 8.5)

  // Statut (à droite du niveau)
  const stX = x0 + 46
  const stY = y0 + 15.3 + 3 * 7.5
  ink(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.3)
  doc.text('STATUT', stX, stY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  ink(doc, d.status === 'active' ? GREEN : RED)
  doc.text(d.status === 'active' ? 'Active' : 'Révoquée', stX, stY + 3.6)

  // QR code
  fill(doc, WHITE)
  doc.roundedRect(x0 + 60, y0 + 29, 21.6, 21.6, 1.5, 1.5, 'F')
  doc.addImage(d.qrDataUrl, 'PNG', x0 + 61.3, y0 + 30.3, 19, 19)
  ink(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(3.6)
  doc.text('Scanner pour vérifier', x0 + 70.8, y0 + 52.7, { align: 'center' })
}

// Page A4 complète : titre, carte à taille réelle, instructions de vérification
export function drawCardPage(doc: jsPDF, d: CardPdfData, generatedAt: Date = new Date()): void {
  const pageW = 210
  const x0 = (pageW - CARD_W) / 2
  const y0 = 48

  ink(doc, NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text("Carte d'étudiant numérique", pageW / 2, 24, { align: 'center' })
  ink(doc, GREY_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text('Académie de la Grâce — MEGA', pageW / 2, 31, { align: 'center' })

  fill(doc, GOLD)
  doc.rect(pageW / 2 - 12, 35, 24, 0.7, 'F')

  drawStudentCard(doc, x0, y0, d)

  let y = y0 + CARD_H + 16
  ink(doc, NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text("Vérifier l'authenticité de cette carte", pageW / 2, y, { align: 'center' })

  y += 7
  ink(doc, GREY_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const intro = doc.splitTextToSize(
    'Scannez le QR code de la carte avec un téléphone, ou ouvrez le lien ci-dessous, pour confirmer que la carte est valide.',
    140
  )
  doc.text(intro, pageW / 2, y, { align: 'center' })
  y += intro.length * 4.6 + 2

  ink(doc, LINK_BLUE)
  doc.setFontSize(8.5)
  const urlLines = doc.splitTextToSize(d.verifyUrl, 150)
  doc.text(urlLines, pageW / 2, y, { align: 'center' })
  y += urlLines.length * 4 + 8

  ink(doc, GREY_TEXT)
  doc.setFontSize(8.5)
  const issued = formatDate(d.issuedAt)
  const meta = `Carte n° ${d.cardNumber}${issued ? ` · émise le ${issued}` : ''} · document généré le ${formatDate(generatedAt.toISOString())}`
  doc.text(meta, pageW / 2, y, { align: 'center' })

  y += 12
  doc.setFontSize(8)
  const note = doc.splitTextToSize(
    "Cette carte reste la propriété de l'Académie de la Grâce. En cas de perte ou de vol, prévenez l'administration afin qu'elle soit révoquée. Une carte révoquée est signalée comme non valide lors de la vérification.",
    140
  )
  doc.text(note, pageW / 2, y, { align: 'center' })
}

// ---------------------------------------------------------------------------
// Téléchargement (navigateur uniquement)
// ---------------------------------------------------------------------------
export async function downloadStudentCardPdf(myCard: MyCard, verifyUrl: string, qrDataUrl: string): Promise<void> {
  // jsPDF est chargé uniquement au clic : il n'alourdit pas le reste de l'application
  const { jsPDF } = await import('jspdf')

  const rawPhoto = myCard.student.profileImageUrl
    ? await loadImageAsDataUrl(myCard.student.profileImageUrl)
    : null
  const photoDataUrl = rawPhoto ? await cropToAspectDataUrl(rawPhoto, PHOTO_ASPECT) : null
  const logoDataUrl = await loadImageAsDataUrl('/logo-academie.png') // facultatif

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.setProperties({
    title: `Carte étudiant ${myCard.card.cardNumber}`,
    author: 'Académie de la Grâce',
    subject: "Carte d'identité numérique",
  })

  drawCardPage(doc, {
    fullName: myCard.student.fullName,
    serviceName: myCard.student.serviceName,
    branch: myCard.student.branch,
    level: myCard.student.level,
    cardNumber: myCard.card.cardNumber,
    status: myCard.card.status,
    issuedAt: myCard.card.issuedAt,
    verifyUrl,
    qrDataUrl,
    photoDataUrl,
    logoDataUrl,
  })

  doc.save(`carte-etudiant-${myCard.card.cardNumber}.pdf`)
}