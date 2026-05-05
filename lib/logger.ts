// lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
}

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction

// Couleurs pour la console (développement uniquement)
const colors = {
  info: '\x1b[36m',   // Cyan
  warn: '\x1b[33m',   // Jaune
  error: '\x1b[31m',  // Rouge
  debug: '\x1b[35m',  // Magenta
  reset: '\x1b[0m',   // Reset
  dim: '\x1b[2m'      // Gris
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toLocaleTimeString('fr-FR')
  
  if (isDevelopment) {
    return `${colors.dim}[${timestamp}]${colors.reset} ${colors[level]}[${level.toUpperCase()}]${colors.reset} ${message}`
  }
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`
}

function log(level: LogLevel, message: string, data?: any) {
  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString()
  }

  // En développement : affiche tout dans la console
  if (isDevelopment) {
    const formatted = formatMessage(level, message)
    
    switch (level) {
      case 'info':
        console.log(formatted, data || '')
        break
      case 'warn':
        console.warn(formatted, data || '')
        break
      case 'error':
        console.error(formatted, data || '')
        break
      case 'debug':
        console.debug(formatted, data || '')
        break
    }
  }

  // En production : n'affiche que les erreurs dans la console
  if (isProduction && level === 'error') {
    console.error(formatMessage(level, message), data || '')
  }

  // TODO : Envoyer à Sentry en production pour les erreurs
  // if (isProduction && level === 'error') {
  //   Sentry.captureException(new Error(message), { extra: data })
  // }

  return entry
}

export const logger = {
  /**
   * Pour les actions normales (connexion réussie, création de compte...)
   * Affiché uniquement en développement
   */
  info: (message: string, data?: any) => {
    return log('info', message, data)
  },

  /**
   * Pour les problèmes potentiels (tentative échouée, champ manquant...)
   * Affiché en développement, ignoré en production
   */
  warn: (message: string, data?: any) => {
    return log('warn', message, data)
  },

  /**
   * Pour les erreurs graves (échec API, crash...)
   * Affiché en développement ET en production
   */
  error: (message: string, error?: any) => {
    return log('error', message, error)
  },

  /**
   * Pour les informations de debug détaillées
   * Affiché uniquement en développement
   */
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      return log('debug', message, data)
    }
    return null
  },

  /**
   * Pour logger le début d'une opération
   * Ex: logger.start('Tentative de connexion', { username })
   */
  start: (operation: string, data?: any) => {
    return log('info', `▶️ DÉBUT - ${operation}`, data)
  },

  /**
   * Pour logger la fin réussie d'une opération
   * Ex: logger.success('Connexion réussie', { userId })
   */
  success: (operation: string, data?: any) => {
    return log('info', `✅ SUCCÈS - ${operation}`, data)
  },

  /**
   * Pour logger l'échec d'une opération
   * Ex: logger.fail('Connexion échouée', { username, reason: 'Mot de passe incorrect' })
   */
  fail: (operation: string, error?: any) => {
    return log('warn', `❌ ÉCHEC - ${operation}`, error)
  }
}