// components/dashboard/superadmin/SessionsHistorySection.tsx
'use client'

import { useState } from 'react'
import { ServiceHistoryDetail } from '@/components/ServiceHistoryDetail'
import { CodeHistoryList } from '@/components/CodeHistoryList'
import { AcademicCapIcon, QrCodeIcon } from '@heroicons/react/24/outline'

export const SessionsHistorySection = () => {
  const [activeTab, setActiveTab] = useState<'service' | 'codes'>('service')

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          📋 Historique
        </h2>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'service' 
              ? 'border-white text-white' 
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <AcademicCapIcon className="w-4 h-4" />
          Séances service
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'codes' 
              ? 'border-white text-white' 
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <QrCodeIcon className="w-4 h-4" />
          Codes de présence
        </button>
      </div>

      {/* Contenu */}
      {activeTab === 'service' ? (
        <ServiceHistoryDetail />
      ) : (
        <CodeHistoryList />
      )}
    </div>
  )
}