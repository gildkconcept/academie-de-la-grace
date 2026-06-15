// components/dashboard/superadmin/SessionsHistorySection.tsx
'use client'

import { ServiceHistoryDetail } from '@/components/ServiceHistoryDetail'

export const SessionsHistorySection = () => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
        📋 Historique des séances
      </h2>
      <ServiceHistoryDetail />
    </div>
  )
}