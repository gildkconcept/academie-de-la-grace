// app/api/admin/features/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  try {
    // Vérification de l'authentification
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Appel REST direct à Supabase
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/feature_flags?select=*`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      }
    )
    
    if (!response.ok) {
      console.error('Erreur API Supabase:', response.status)
      return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
    }
    
    const data = await response.json()
    
    // Enrichir avec les métadonnées
    const enrichedFeatures = data.map((f: any) => ({
      ...f,
      label: getFeatureLabel(f.name),
      description: getFeatureDescription(f.name),
      estimated_queries: getEstimatedQueries(f.name),
      impact: getImpactLevel(f.name)
    }))
    
    return NextResponse.json(enrichedFeatures)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Mettre à jour plusieurs fonctionnalités
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { updates } = await request.json()
    
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    // Mettre à jour chaque fonctionnalité via l'API REST
    const results = []
    for (const update of updates) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/feature_flags?name=eq.${update.name}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            enabled: update.enabled,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
        }
      )
      results.push({ name: update.name, ok: res.ok })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function getFeatureLabel(name: string): string {
  const labels: Record<string, string> = {
    'chat': '💬 Chat',
    'live_status': '🟢 Statut en ligne',
    'notifications': '🔔 Notifications',
    'quiz': '📝 Quiz',
    'badges': '🏅 Badges',
    'ranking': '🏆 Classement',
    'daily_verse': '📖 Verset du jour',
    'attendance_code': '🔑 Code présence',
    'profile_photo': '📸 Photo de profil'
  }
  return labels[name] || name
}

function getFeatureDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'chat': 'Messagerie instantanée entre étudiants',
    'live_status': 'Statut en ligne et heartbeat',
    'notifications': 'Notifications en temps réel',
    'quiz': 'Quiz bibliques',
    'badges': 'Système de badges et récompenses',
    'ranking': 'Classement des étudiants',
    'daily_verse': 'Verset du jour',
    'attendance_code': 'Code de présence par géolocalisation',
    'profile_photo': 'Photo de profil'
  }
  return descriptions[name] || ''
}

function getEstimatedQueries(name: string): number {
  const queries: Record<string, number> = {
    'chat': 720,
    'live_status': 30,
    'notifications': 60,
    'ranking': 12,
    'quiz': 15,
    'badges': 3,
    'daily_verse': 10,
    'attendance_code': 2,
    'profile_photo': 1
  }
  return queries[name] || 0
}

function getImpactLevel(name: string): 'high' | 'medium' | 'low' {
  const impacts: Record<string, 'high' | 'medium' | 'low'> = {
    'chat': 'high',
    'live_status': 'medium',
    'notifications': 'medium',
    'ranking': 'medium',
    'quiz': 'low',
    'badges': 'low',
    'daily_verse': 'low',
    'attendance_code': 'low',
    'profile_photo': 'low'
  }
  return impacts[name] || 'low'
}