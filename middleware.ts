// middleware.ts - Section corrigée
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Routes accessibles sans connexion
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-credentials',
  '/reset-account'
]

// Routes accessibles uniquement par rôle
const roleRoutes: Record<string, string[]> = {
  student: ['/dashboard/student'],
  service_manager: ['/dashboard/manager'],
  superadmin: ['/dashboard/superadmin']
}

// API routes publiques (accessibles sans token)
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/check-username',
  '/api/auth/verify-recovery',
  '/api/auth/reset-account',
  '/api/auth/logout'  // ← AJOUTÉ : pour permettre le logout sans token
]

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // === 1. Routes API publiques ===
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // === 2. Routes pages publiques ===
  const isPublicPage = publicRoutes.some(route => 
    pathname === route || pathname === route + '/' || pathname.startsWith(route + '?')
  )
  
  if (isPublicPage) {
    // ✅ Si pas de token, laisser passer
    if (!token) {
      return NextResponse.next()
    }
    
    // Si déjà connecté ET qu'on est sur la page d'accueil, rediriger vers dashboard
    if (pathname === '/' || pathname === '/?') {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
        const { payload } = await jwtVerify(token, secret)
        const role = payload.role as string
        
        if (role === 'superadmin') return NextResponse.redirect(new URL('/dashboard/superadmin', request.url))
        if (role === 'service_manager') return NextResponse.redirect(new URL('/dashboard/manager', request.url))
        return NextResponse.redirect(new URL('/dashboard/student', request.url))
      } catch (error) {
        // Token invalide, laisser passer
        return NextResponse.next()
      }
    }
    
    // Pour login/register/etc : toujours laisser passer
    return NextResponse.next()
  }

  // === 3. Routes protégées ===
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // === 4. Vérifier le token et les rôles ===
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    const role = payload.role as string

    // Vérifier l'accès aux dashboards
    if (pathname.startsWith('/dashboard/')) {
      const allowedRoutes = roleRoutes[role] || []
      const hasAccess = allowedRoutes.some(route => pathname.startsWith(route))
      
      if (!hasAccess) {
        if (role === 'superadmin') return NextResponse.redirect(new URL('/dashboard/superadmin', request.url))
        if (role === 'service_manager') return NextResponse.redirect(new URL('/dashboard/manager', request.url))
        return NextResponse.redirect(new URL('/dashboard/student', request.url))
      }
    }

    return NextResponse.next()
  } catch (error) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}