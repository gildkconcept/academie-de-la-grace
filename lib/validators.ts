// lib/validators.ts
import { z } from 'zod'

// ==================== AUTH ====================

export const loginSchema = z.object({
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(50, 'Le nom d\'utilisateur est trop long')
    .regex(/^[a-zA-Z0-9À-ÿ ._'-]+$/, 'Le nom d\'utilisateur contient des caractères invalides'),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe est trop long')
})

export const registerSchema = z.object({
  fullName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long'),
  branch: z.string()
    .min(1, 'La branche est requise'),
  level: z.enum(['1', '2', '3'], {
    errorMap: () => ({ message: 'Le niveau doit être 1, 2 ou 3' })
  }),
  serviceId: z.string()
    .uuid('Le service est invalide'),
  baptized: z.union([z.boolean(), z.string()])
    .transform(val => val === true || val === 'true'),
  phone: z.string()
    .min(8, 'Le numéro de téléphone est trop court')
    .max(15, 'Le numéro de téléphone est trop long')
    .regex(/^\d+$/, 'Le numéro de téléphone ne doit contenir que des chiffres'),
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur est trop long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Le nom d\'utilisateur contient des caractères invalides'),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe est trop long'),
  maisonGrace: z.string()
    .max(100, 'La maison de grâce est trop longue')
    .optional()
    .nullable()
})

// ==================== RECOVERY ====================

export const verifyRecoverySchema = z.object({
  phone: z.string()
    .min(8, 'Numéro de téléphone invalide')
    .max(15, 'Numéro de téléphone invalide')
    .regex(/^\d+$/, 'Le numéro ne doit contenir que des chiffres'),
  fullName: z.string()
    .min(2, 'Le nom est requis'),
  branch: z.string()
    .min(1, 'La branche est requise'),
  serviceId: z.string()
    .uuid('Le service est invalide')
})

export const resetAccountSchema = z.object({
  recoveryToken: z.string()
    .min(1, 'Token manquant'),
  newUsername: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur est trop long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Le nom d\'utilisateur contient des caractères invalides'),
  newPassword: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe est trop long')
})

// ==================== PROFILE ====================

export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long'),
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur est trop long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Le nom d\'utilisateur contient des caractères invalides'),
  email: z.string()
    .email('Email invalide')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^\d*$/, 'Le numéro ne doit contenir que des chiffres')
    .optional()
    .nullable(),
  baptized: z.union([z.boolean(), z.string()])
    .optional(),
  maisonGrace: z.string()
    .max(100)
    .optional()
    .nullable()
})

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string()
    .min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe est trop long')
})

// ==================== STUDENT ====================

export const addStudentSchema = z.object({
  fullName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long'),
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Caractères invalides'),
  branch: z.string()
    .min(1, 'La branche est requise'),
  level: z.enum(['1', '2', '3']),
  baptized: z.union([z.boolean(), z.string()]),
  phone: z.string()
    .regex(/^\d*$/, 'Numéro invalide')
    .optional()
    .nullable(),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  serviceId: z.string()
    .uuid('Service invalide')
})

// ==================== CODE ====================

export const verifyCodeSchema = z.object({
  code: z.string()
    .length(6, 'Le code doit contenir 6 chiffres')
    .regex(/^\d{6}$/, 'Le code ne doit contenir que des chiffres')
})

export const generateCodeSchema = z.object({
  lat: z.number()
    .min(-90)
    .max(90)
    .optional()
    .nullable(),
  lng: z.number()
    .min(-180)
    .max(180)
    .optional()
    .nullable(),
  radius: z.number()
    .min(50)
    .max(1000)
    .optional()
    .default(200)
})

// ==================== QUIZ ====================

export const createQuizSchema = z.object({
  title: z.string()
    .min(3, 'Le titre est trop court')
    .max(200, 'Le titre est trop long'),
  description: z.string()
    .max(500)
    .optional(),
  level: z.enum(['1', '2', '3']),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  questions: z.array(z.object({
    question: z.string().min(5, 'La question est trop courte'),
    option_a: z.string().min(1, 'L\'option A est requise'),
    option_b: z.string().min(1, 'L\'option B est requise'),
    option_c: z.string().min(1, 'L\'option C est requise'),
    option_d: z.string().min(1, 'L\'option D est requise'),
    correct_answer: z.enum(['A', 'B', 'C', 'D'])
  })).min(1, 'Au moins une question est requise')
})

export const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.enum(['A', 'B', 'C', 'D', '']))
})

// ==================== NOTIFICATIONS ====================

export const createNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Au moins un destinataire requis'),
  title: z.string()
    .min(3, 'Le titre est trop court')
    .max(200, 'Le titre est trop long'),
  message: z.string()
    .min(5, 'Le message est trop court')
    .max(1000, 'Le message est trop long'),
  type: z.enum(['session', 'seance', 'quiz', 'result', 'promotion', 'absence', 'announcement']),
  link: z.string()
    .max(500)
    .optional()
    .nullable()
})

// ==================== TYPE UTILITAIRE ====================

// Extrait le type TypeScript depuis le schéma Zod
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type VerifyRecoveryInput = z.infer<typeof verifyRecoverySchema>
export type ResetAccountInput = z.infer<typeof resetAccountSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type AddStudentInput = z.infer<typeof addStudentSchema>
export type CreateQuizInput = z.infer<typeof createQuizSchema>
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>