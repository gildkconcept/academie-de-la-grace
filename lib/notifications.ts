// lib/notifications.ts
import { supabase } from '@/lib/supabase'
import { NotificationType } from '@/types'

interface CreateNotificationParams {
  userIds: string | string[]
  title: string
  message: string
  type: NotificationType
  link?: string
}

/**
 * Crée une ou plusieurs notifications
 */
export async function createNotification({
  userIds,
  title,
  message,
  type,
  link
}: CreateNotificationParams) {
  try {
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds]

    // Éviter les doublons : vérifier si une notification identique existe déjà aujourd'hui
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('type', type)
      .eq('title', title)
      .gte('created_at', today)
      .in('user_id', userIdArray)

    const existingUserIds = new Set(existing?.map(n => n.user_id) || [])
    const newUserIds = userIdArray.filter(id => !existingUserIds.has(id))

    if (newUserIds.length === 0) return { created: 0 }

    const notifications = newUserIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      link: link || null
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Erreur création notifications:', error)
      return { created: 0, error }
    }

    return { created: newUserIds.length }
  } catch (error) {
    console.error('Erreur:', error)
    return { created: 0, error }
  }
}

/**
 * Notifier les étudiants d'un service spécifique
 */
export async function notifyStudentsByService(
  serviceId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('service_id', serviceId)
    .is('deleted_at', null)

  if (!students || students.length === 0) return { created: 0 }

  return createNotification({
    userIds: students.map(s => s.id),
    title,
    message,
    type,
    link
  })
}

/**
 * Notifier tous les étudiants
 */
export async function notifyAllStudents(
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .is('deleted_at', null)

  if (!students || students.length === 0) return { created: 0 }

  return createNotification({
    userIds: students.map(s => s.id),
    title,
    message,
    type,
    link
  })
}

/**
 * Notifier un responsable de service
 */
export async function notifyManager(
  serviceId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  const { data: managers } = await supabase
    .from('users')
    .select('id')
    .eq('service_id', serviceId)
    .eq('role', 'service_manager')

  if (!managers || managers.length === 0) return { created: 0 }

  return createNotification({
    userIds: managers.map(m => m.id),
    title,
    message,
    type,
    link
  })
}

/**
 * Notifier le superadmin
 */
export async function notifySuperAdmin(
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'superadmin')

  if (!admins || admins.length === 0) return { created: 0 }

  return createNotification({
    userIds: admins.map(a => a.id),
    title,
    message,
    type,
    link
  })
}