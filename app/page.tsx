'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
      
      {/* Image de fond */}
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      
      {/* Overlay gradient */}
      <div className="fixed inset-0 z-10" style={{ 
        background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' 
      }} />
      
      {/* Orbs décoratifs */}
      <div className="fixed w-[380px] h-[380px] rounded-full bg-blue-400/20 blur-[80px] -top-[60px] -left-[60px] z-20 pointer-events-none animate-float" />
      <div className="fixed w-[320px] h-[320px] rounded-full bg-blue-600/15 blur-[80px] top-[20%] -right-[50px] z-20 pointer-events-none animate-float-delayed" />
      <div className="fixed w-[280px] h-[280px] rounded-full bg-blue-300/12 blur-[80px] bottom-[20%] left-[8%] z-20 pointer-events-none animate-float-slow" />

      {/* Contenu principal */}
      <div className="relative z-30">
        
        {/* ========== NAVBAR ========== */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-[rgba(5,15,70,0.7)] backdrop-blur-2xl shadow-lg' : 'bg-[rgba(5,15,70,0.45)] backdrop-blur-2xl'
        } border-b border-white/10`}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-[#1a3a8f]" style={{ fontFamily: "'Playfair Display', serif" }}>
                AG
              </div>
              <span className="text-white font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px' }}>
                Académie de la Grâce
              </span>
            </div>
            <div className="hidden md:flex gap-6">
              <span className="text-[13px] text-blue-200/85 cursor-pointer hover:text-white transition-colors">Formation</span>
              <span className="text-[13px] text-blue-200/85 cursor-pointer hover:text-white transition-colors">Présences</span>
              <span className="text-[13px] text-blue-200/85 cursor-pointer hover:text-white transition-colors">À propos</span>
            </div>
            <div className="flex gap-2">
              <Link href="/login" className="bg-transparent text-white/90 border border-white/30 px-4 py-1.5 rounded-md text-xs hover:bg-white/10 transition-colors" style={{ fontFamily: "'Crimson Text', serif" }}>
                Connexion
              </Link>
              <Link href="/register" className="bg-white text-[#1a3a8f] px-4 py-1.5 rounded-md text-xs font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all" style={{ fontFamily: "'Crimson Text', serif" }}>
                Inscription
              </Link>
            </div>
          </div>
        </nav>

        {/* ========== HERO ========== */}
        <section className="pt-32 pb-20 px-6 flex items-center justify-center text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] text-[300px] text-white/[0.03] pointer-events-none select-none font-serif leading-none">✝</div>
          
          <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-10 sm:p-12 max-w-2xl w-full shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)] animate-fadeUp">
            <div className="inline-block bg-white/10 border border-white/20 text-blue-200/90 text-[9px] tracking-[0.14em] uppercase px-3 py-1 rounded-full mb-5">
              Mission Évangélique Grâce Abondante · MEGA
            </div>
            <h1 className="text-4xl sm:text-5xl font-normal leading-tight text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Former pour<br /><em className="italic text-[#a8caff]">impacter</em> le monde
            </h1>
            <div className="w-9 h-0.5 bg-white/25 rounded mx-auto my-4" />
            <p className="text-blue-200/80 text-base leading-relaxed max-w-md mx-auto mb-8">
              Une plateforme complète pour suivre votre formation biblique, gérer vos présences et progresser dans la connaissance de Dieu.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/register" className="bg-white text-[#1a3a8f] px-6 py-3 rounded-lg text-sm font-bold shadow-[0_4px_20px_rgba(255,255,255,0.22)] hover:shadow-xl hover:-translate-y-0.5 transition-all" style={{ fontFamily: "'Crimson Text', serif" }}>
                Commencer maintenant
              </Link>
              <Link href="/login" className="bg-white/10 text-white border border-white/30 px-6 py-3 rounded-lg text-sm backdrop-blur-lg hover:bg-white/20 transition-colors" style={{ fontFamily: "'Crimson Text', serif" }}>
                Se connecter
              </Link>
            </div>
            <p className="text-blue-300/60 text-[11px] italic mt-5 tracking-[0.05em]">
              « Allez, faites de toutes les nations des disciples » — Matthieu 28:19
            </p>
          </div>
        </section>

        {/* ========== STATS ========== */}
        <div className="px-6 pb-10">
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.13] rounded-2xl p-6 text-center">
              <span className="block text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>+200</span>
              <span className="block text-blue-300/80 text-xs mt-1 tracking-[0.05em]">Ouvriers formés</span>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.13] rounded-2xl p-6 text-center">
              <span className="block text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>12</span>
              <span className="block text-blue-300/80 text-xs mt-1 tracking-[0.05em]">Modules actifs</span>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.13] rounded-2xl p-6 text-center">
              <span className="block text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>98%</span>
              <span className="block text-blue-300/80 text-xs mt-1 tracking-[0.05em]">Satisfaction</span>
            </div>
          </div>
        </div>

        {/* ========== FEATURES ========== */}
        <section className="px-6 py-10">
          <h2 className="text-2xl sm:text-3xl font-normal text-white text-center mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-blue-200/75 text-sm text-center mb-8">Une suite complète d'outils pour les ouvriers de MEGA</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: '📖', title: 'Formation biblique', desc: 'Accédez aux cours et progressez module par module.' },
              { icon: '📅', title: 'Suivi des présences', desc: 'Gestion automatisée pour chaque session et réunion.' },
              { icon: '🎓', title: 'Certificats', desc: 'Générez vos attestations après validation des modules.' },
              { icon: '🤝', title: 'Communauté', desc: 'Connectez-vous avec tous les ouvriers de la mission.' }
            ].map((f, i) => (
              <div key={i} className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.11] rounded-2xl p-6">
                <span className="text-2xl block mb-3">{f.icon}</span>
                <div className="font-semibold text-white text-sm mb-1" style={{ fontFamily: "'Crimson Text', serif" }}>{f.title}</div>
                <div className="text-blue-200/75 text-xs leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== STEPS ========== */}
        <section className="px-6 py-10 bg-black/[0.18] border-y border-white/[0.07]">
          <h2 className="text-2xl sm:text-3xl font-normal text-white text-center mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Comment ça marche ?
          </h2>
          <p className="text-blue-200/75 text-sm text-center mb-8">Trois étapes simples pour démarrer</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { num: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous en quelques secondes avec votre nom et rôle.' },
              { num: '02', title: 'Rejoignez votre groupe', desc: 'Intégrez votre département et accédez à vos modules assignés.' },
              { num: '03', title: 'Suivez votre progression', desc: 'Consultez présences, notes et obtenez vos certificats.' }
            ].map((s, i) => (
              <div key={i} className="text-center p-5">
                <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {s.num}
                </div>
                <div className="font-semibold text-white text-sm mb-1" style={{ fontFamily: "'Crimson Text', serif" }}>{s.title}</div>
                <div className="text-blue-200/70 text-xs leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="px-6 py-12 text-center">
          <div className="bg-white/[0.08] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-10 sm:p-12 max-w-lg mx-auto shadow-[0_24px_60px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)]">
            <h2 className="text-2xl sm:text-3xl font-normal text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Prêt à rejoindre la formation ?
            </h2>
            <p className="text-blue-200/80 text-sm leading-relaxed mb-6">
              Créez votre compte gratuitement et commencez votre parcours de disciple dès aujourd'hui.
            </p>
            <Link href="/register" className="inline-block bg-white text-[#1a3a8f] px-6 py-3 rounded-lg text-sm font-bold shadow-[0_4px_20px_rgba(255,255,255,0.22)] hover:shadow-xl hover:-translate-y-0.5 transition-all" style={{ fontFamily: "'Crimson Text', serif" }}>
              Créer mon compte →
            </Link>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="bg-[rgba(3,10,50,0.75)] backdrop-blur-2xl border-t border-white/[0.07] py-5 text-center">
          <p className="text-blue-300/50 text-xs italic mb-1">Gagner des âmes · Faire des disciples · Manifester Christ</p>
          <p className="text-blue-200/35 text-[11px]">
            &copy; {new Date().getFullYear()} Mission Évangélique Grâce Abondante (MEGA). Tous droits réservés.
          </p>
        </footer>

      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(22px, -30px); }
          66% { transform: translate(-14px, 16px); }
        }
        .animate-fadeUp { animation: fadeUp 0.8s ease both; }
        .animate-float { animation: float 12s ease-in-out infinite; }
        .animate-float-delayed { animation: float 12s ease-in-out -4s infinite; }
        .animate-float-slow { animation: float 12s ease-in-out -8s infinite; }
      `}</style>
    </div>
  )
}