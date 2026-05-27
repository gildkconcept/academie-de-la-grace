// app/api/students/level-history/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const startTime = Date.now()
  console.log('📜 [LEVEL-HISTORY] ========== DÉBUT RÉCUPÉRATION HISTORIQUE ==========')
  
  try {
    // 1. Vérification du token
    console.log('🔍 [LEVEL-HISTORY] Étape 1: Vérification du token...')
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      console.log('❌ [LEVEL-HISTORY] Token manquant')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      console.log('❌ [LEVEL-HISTORY] Token invalide')
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    console.log('👤 [LEVEL-HISTORY] Utilisateur:', {
      id: user.id,
      role: user.role,
      name: user.name
    })

    // Vérification des droits (seul superadmin peut voir l'historique)
    if (user.role !== 'superadmin') {
      console.log('❌ [LEVEL-HISTORY] Accès refusé - rôle:', user.role)
      return NextResponse.json({ error: 'Accès refusé. Seul le Super Admin peut consulter l\'historique.' }, { status: 403 })
    }

    // 2. Récupération des paramètres
    console.log('🔍 [LEVEL-HISTORY] Étape 2: Lecture des paramètres...')
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📊 [LEVEL-HISTORY] Paramètres:', {
      studentId: studentId || 'Tous',
      limit,
      offset
    })

    // 3. Construction de la requête
    console.log('🔍 [LEVEL-HISTORY] Étape 3: Construction de la requête...')
    let query = supabase
      .from('student_level_history')
      .select(`
        *,
        student:students(id, full_name, username, level),
        admin:users(id, name)
      `, { count: 'exact' })
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (studentId && studentId !== 'all') {
      console.log('🔍 [LEVEL-HISTORY] Filtre par étudiant:', studentId)
      query = query.eq('student_id', studentId)
    }

    // 4. Exécution de la requête
    console.log('🔍 [LEVEL-HISTORY] Étape 4: Exécution de la requête...')
    const { data: history, error, count } = await query

    if (error) {
      console.error('❌ [LEVEL-HISTORY] Erreur récupération:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ [LEVEL-HISTORY] ${history?.length || 0} enregistrement(s) récupéré(s) sur ${count || 0} total`)

    // Afficher les premiers enregistrements pour debug
    if (history && history.length > 0) {
      console.log('📋 [LEVEL-HISTORY] Dernières promotions:')
      history.slice(0, 5).forEach(record => {
        const studentName = (record.student as any)?.full_name || 'Inconnu'
        const adminName = (record.admin as any)?.name || 'Système'
        const date = new Date(record.changed_at).toLocaleString('fr-FR')
        console.log(`   - ${studentName}: ${record.old_level} → ${record.new_level} (par ${adminName}) le ${date}`)
      })
    }

    // 5. Calcul des statistiques
    console.log('🔍 [LEVEL-HISTORY] Étape 5: Calcul des statistiques...')
    
    // Récupérer toutes les promotions pour les stats (sans limite)
    const { data: allStats } = await supabase
      .from('student_level_history')
      .select('old_level, new_level')

    const promotionsByLevel = {
      from1to2: allStats?.filter(s => s.old_level === 1 && s.new_level === 2).length || 0,
      from2to3: allStats?.filter(s => s.old_level === 2 && s.new_level === 3).length || 0,
      from1to3: allStats?.filter(s => s.old_level === 1 && s.new_level === 3).length || 0,
      from2to1: allStats?.filter(s => s.old_level === 2 && s.new_level === 1).length || 0,
      from3to2: allStats?.filter(s => s.old_level === 3 && s.new_level === 2).length || 0,
      from3to1: allStats?.filter(s => s.old_level === 3 && s.new_level === 1).length || 0,
      total: allStats?.length || 0
    }

    console.log('📊 [LEVEL-HISTORY] Statistiques:', {
      total: promotionsByLevel.total,
      promotions: {
        '1→2': promotionsByLevel.from1to2,
        '2→3': promotionsByLevel.from2to3
      }
    })

    const duration = Date.now() - startTime
    console.log(`⏱️ [LEVEL-HISTORY] Durée totale: ${duration}ms`)
    console.log('🎉 [LEVEL-HISTORY] ========== FIN RÉCUPÉRATION RÉUSSIE ==========\n')

    return NextResponse.json({
      success: true,
      history: history || [],
      total: count || 0,
      stats: promotionsByLevel
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [LEVEL-HISTORY] ========== ERREUR ==========')
    console.error('❌ [LEVEL-HISTORY] Message:', error instanceof Error ? error.message : 'Erreur inconnue')
    console.error('❌ [LEVEL-HISTORY] Stack:', error instanceof Error ? error.stack : 'Pas de stack')
    console.error('❌ [LEVEL-HISTORY] Durée avant erreur:', duration, 'ms')
    console.error('❌ [LEVEL-HISTORY] ========== FIN ERREUR ==========\n')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}