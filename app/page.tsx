'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">AG</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">Académie de la Grâce</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Inscription
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              Plateforme éducative chrétienne
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Formez-vous à la
              <span className="gradient-text block mt-2">Grâce de Dieu</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
              Une plateforme complète pour suivre votre formation biblique, gérer vos présences et progresser dans la connaissance de Dieu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-lg"
              >
                Commencer maintenant
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-lg"
              >
                Déjà inscrit ? Se connecter
              </Link>
            </div>
          </div>

    
        </div>
      </section>


     

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">AG</span>
                </div>
                <span className="ml-3 text-lg font-bold text-gray-900 dark:text-white">Académie de la Grâce</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Former des disciples, équiper les croyants, glorifier Dieu.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Liens rapides</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/login" className="hover:text-indigo-600 transition-colors">Connexion</Link></li>
                <li><Link href="/register" className="hover:text-indigo-600 transition-colors">Inscription</Link></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Nos services</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Formation biblique</li>
                <li>Suivi de progression</li>
                <li>Certificats</li>
                <li>Communauté</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Email: contact@academiegrace.com</li>
                <li>Tél: +225 XX XX XX XX</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} Académie de la Grâce. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .dark .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 1px);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  )
}