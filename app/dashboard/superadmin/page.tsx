// app/dashboard/superadmin/page.tsx
'use client'

import SuperAdminDashboard from '@/components/dashboard/superadmin/SuperAdminDashboard'
import { CardScanShortcut } from '@/components/CardScanShortcut'

export default function SuperAdminPage() {
  return (
    <>
      <SuperAdminDashboard />
      <CardScanShortcut />
    </>
  )
}