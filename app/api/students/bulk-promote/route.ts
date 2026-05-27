// app/api/students/bulk-promote/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { createNotification } from '@/lib/notifications'

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('🚀 [BULK-PROMOTE] ========== DÉBUT PROMOTION EN MASSE ==========')
  
  try {
    // 1. Vérification du token
    console.log('🔍 [BULK-PROMOTE] Étape 1: Vérification du token...')
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      console.log('❌ [BULK-PROMOTE] Token manquant')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const currentUser = verifyToken(token)
    if (!currentUser) {
      console.log('❌ [BULK-PROMOTE] Token invalide')
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    console.log('👤 [BULK-PROMOTE] Utilisateur:', {
      id: currentUser.id,
      role: currentUser.role,
      name: currentUser.name
    })

    // Vérification des droits (seul superadmin)
    if (currentUser.role !== 'superadmin') {
      console.log('❌ [BULK-PROMOTE] Accès refusé - rôle:', currentUser.role)
      return NextResponse.json({ error: 'Accès refusé. Seul le Super Admin peut promouvoir des étudiants.' }, { status: 403 })
    }

    // 2. Récupération des paramètres
    console.log('🔍 [BULK-PROMOTE] Étape 2: Lecture des paramètres...')
    const body = await request.json()
    console.log('📦 [BULK-PROMOTE] Body reçu:', JSON.stringify(body, null, 2))
    
    const { 
      studentIds,        // Tableau d'IDs pour sélection multiple
      currentLevel,      // Ou filtrer par niveau actuel
      targetLevel,       // Niveau cible (1,2,3)
      branch,            // Optionnel : filtrer par branche
      serviceId,         // Optionnel : filtrer par service
      reason 
    } = body

    // Validation du niveau cible
    if (!targetLevel || targetLevel < 1 || targetLevel > 3) {
      console.log('❌ [BULK-PROMOTE] Niveau cible invalide:', targetLevel)
      return NextResponse.json({ error: 'Niveau cible invalide (doit être 1, 2 ou 3)' }, { status: 400 })
    }

    console.log('🎯 [BULK-PROMOTE] Niveau cible:', targetLevel)

    // 3. Construction de la requête pour récupérer les étudiants
    console.log('🔍 [BULK-PROMOTE] Étape 3: Construction de la requête...')
    let query = supabase
      .from('students')
      .select('id, full_name, level, service_id, email, branch')
      .is('deleted_at', null)

    if (studentIds && studentIds.length > 0) {
      // Promotion par sélection multiple
      console.log('📋 [BULK-PROMOTE] Mode: Sélection multiple -', studentIds.length, 'étudiants')
      query = query.in('id', studentIds)
    } else if (currentLevel) {
      // Promotion par niveau actuel
      console.log('📋 [BULK-PROMOTE] Mode: Par niveau actuel - Niveau', currentLevel)
      query = query.eq('level', currentLevel)
    } else {
      console.log('❌ [BULK-PROMOTE] Aucun critère de sélection fourni')
      return NextResponse.json({ error: 'Spécifiez studentIds ou currentLevel' }, { status: 400 })
    }

    // Filtres optionnels
    if (branch && branch !== 'all') {
      console.log('🔍 [BULK-PROMOTE] Filtre branche:', branch)
      query = query.eq('branch', branch)
    }
    if (serviceId && serviceId !== 'all') {
      console.log('🔍 [BULK-PROMOTE] Filtre service:', serviceId)
      query = query.eq('service_id', serviceId)
    }

    // 4. Exécution de la requête
    console.log('🔍 [BULK-PROMOTE] Étape 4: Récupération des étudiants...')
    const { data: students, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ [BULK-PROMOTE] Erreur récupération étudiants:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!students || students.length === 0) {
      console.log('⚠️ [BULK-PROMOTE] Aucun étudiant trouvé')
      return NextResponse.json({ error: 'Aucun étudiant trouvé' }, { status: 404 })
    }

    console.log(`📊 [BULK-PROMOTE] ${students.length} étudiant(s) trouvé(s)`)

    // 5. Filtrer les étudiants qui ont déjà le bon niveau
    const studentsToPromote = students.filter(s => s.level !== targetLevel)
    const alreadyTargetLevel = students.filter(s => s.level === targetLevel)

    console.log(`📊 [BULK-PROMOTE] À promouvoir: ${studentsToPromote.length}, déjà au niveau ${targetLevel}: ${alreadyTargetLevel.length}`)

    if (studentsToPromote.length === 0) {
      console.log('✅ [BULK-PROMOTE] Tous les étudiants sont déjà au niveau cible')
      return NextResponse.json({
        success: true,
        message: 'Tous les étudiants sont déjà au niveau cible',
        promotedCount: 0,
        alreadyCount: alreadyTargetLevel.length
      })
    }

    // Afficher la liste des étudiants à promouvoir
    console.log('📋 [BULK-PROMOTE] Étudiants à promouvoir:')
    studentsToPromote.forEach(s => {
      console.log(`   - ${s.full_name} (Niveau ${s.level} → ${targetLevel})`)
    })

    // 6. Mise à jour des niveaux
    console.log('🔍 [BULK-PROMOTE] Étape 5: Mise à jour des niveaux...')
    const { error: updateError } = await supabase
      .from('students')
      .update({ level: targetLevel, updated_at: new Date().toISOString() })
      .in('id', studentsToPromote.map(s => s.id))

    if (updateError) {
      console.error('❌ [BULK-PROMOTE] Erreur mise à jour:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    console.log('✅ [BULK-PROMOTE] Mise à jour réussie')

    // 7. Enregistrement de l'historique
    console.log('🔍 [BULK-PROMOTE] Étape 6: Enregistrement de l\'historique...')
    const historyRecords = studentsToPromote.map(student => ({
      student_id: student.id,
      old_level: student.level,
      new_level: targetLevel,
      changed_by: currentUser.id,
      reason: reason || `Promotion en masse par ${currentUser.name || currentUser.username}`
    }))

    const { error: historyError } = await supabase
      .from('student_level_history')
      .insert(historyRecords)

    if (historyError) {
      console.error('⚠️ [BULK-PROMOTE] Erreur historique (non bloquante):', historyError)
    } else {
      console.log(`✅ [BULK-PROMOTE] ${historyRecords.length} enregistrement(s) d'historique ajouté(s)`)
    }

    // 8. Envoi des notifications
    console.log('🔍 [BULK-PROMOTE] Étape 7: Envoi des notifications...')
    let notificationCount = 0
    for (const student of studentsToPromote) {
      try {
        await createNotification({
          userIds: student.id,
          title: '🎉 Félicitations ! Promotion académique',
          message: `Vous êtes passé(e) du Niveau ${student.level} au Niveau ${targetLevel}. Continuez vos efforts !`,
          type: 'promotion',
          link: '/dashboard/student'
        })
        notificationCount++
      } catch (notifError) {
        console.error(`⚠️ [BULK-PROMOTE] Erreur notification pour ${student.full_name}:`, notifError)
      }
    }
    console.log(`✅ [BULK-PROMOTE] ${notificationCount} notification(s) envoyée(s)`)

    // 9. Recalcul du classement (optionnel)
    console.log('🔍 [BULK-PROMOTE] Étape 8: Recalcul du classement...')
    try {
      await supabase.rpc('calculate_fair_ranking')
      console.log('✅ [BULK-PROMOTE] Classement recalculé')
    } catch (rpcError) {
      console.log('⚠️ [BULK-PROMOTE] calculate_fair_ranking non disponible')
    }

    const duration = Date.now() - startTime
    console.log(`⏱️ [BULK-PROMOTE] Durée totale: ${duration}ms`)
    console.log(`🎉 [BULK-PROMOTE] ${studentsToPromote.length} étudiant(s) promu(s) au niveau ${targetLevel}`)
    console.log('🎉 [BULK-PROMOTE] ========== FIN PROMOTION RÉUSSIE ==========\n')

    return NextResponse.json({
      success: true,
      message: `${studentsToPromote.length} étudiant(s) promu(s) au niveau ${targetLevel}`,
      promotedCount: studentsToPromote.length,
      alreadyCount: alreadyTargetLevel.length,
      students: studentsToPromote.map(s => ({
        id: s.id,
        name: s.full_name,
        oldLevel: s.level,
        newLevel: targetLevel
      }))
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [BULK-PROMOTE] ========== ERREUR ==========')
    console.error('❌ [BULK-PROMOTE] Message:', error instanceof Error ? error.message : 'Erreur inconnue')
    console.error('❌ [BULK-PROMOTE] Stack:', error instanceof Error ? error.stack : 'Pas de stack')
    console.error('❌ [BULK-PROMOTE] Durée avant erreur:', duration, 'ms')
    console.error('❌ [BULK-PROMOTE] ========== FIN ERREUR ==========\n')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}