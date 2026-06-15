// components/dashboard/superadmin/GlobalStatsSection.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts'
import { attendanceService } from '@/services/attendanceService'
import { toast } from 'sonner'

interface GlobalStats {
  globalAttendanceRate: number
  totalStudents: number
  totalAttendance: number
  expectedAttendance: number
  bestService: { name: string; rate: number }
  strugglingService: { name: string; rate: number }
  totalServices: number
  attendanceByService: Array<{ serviceName: string; rate: number; presentCount: number; totalStudents: number }>
  attendanceOverTime: Array<{ month: string; rate: number; present: number; total: number }>
}

export const GlobalStatsSection = () => {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGlobalStats()
  }, [])

  const fetchGlobalStats = async () => {
    setLoading(true)
    try {
      const data = await attendanceService.getStatsGlobal()
      console.log('📊 Stats globales reçues:', data)
      
      if (data) {
        setGlobalStats({
          globalAttendanceRate: data.globalAttendanceRate || 0,
          totalStudents: data.totalStudents || 0,
          totalAttendance: data.totalAttendance || 0,
          expectedAttendance: data.expectedAttendance || 0,
          bestService: data.bestService || { name: '-', rate: 0 },
          strugglingService: data.strugglingService || { name: '-', rate: 0 },
          totalServices: data.totalServices || 0,
          attendanceByService: data.attendanceByService || [],
          attendanceOverTime: data.attendanceOverTime || []
        })
      }
    } catch (error) {
      console.error('Erreur chargement stats globales:', error)
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!globalStats) {
    return (
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-8 text-center">
        <p className="text-white/40 text-sm">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>📊 Analyse globale</h2>
      
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/[0.06] border-white/[0.08]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-indigo-400">{globalStats.globalAttendanceRate}%</div>
            <div className="text-sm text-white/50">Taux de présence global</div>
            <div className="text-xs text-white/30 mt-1">{globalStats.totalAttendance} / {globalStats.expectedAttendance}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.06] border-white/[0.08]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{globalStats.bestService?.rate || 0}%</div>
            <div className="text-sm text-white/50">🏆 Meilleur service</div>
            <div className="text-xs text-white/30 mt-1">{globalStats.bestService?.name || '-'}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.06] border-white/[0.08]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{globalStats.strugglingService?.rate || 0}%</div>
            <div className="text-sm text-white/50">⚠️ Service en difficulté</div>
            <div className="text-xs text-white/30 mt-1">{globalStats.strugglingService?.name || '-'}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.06] border-white/[0.08]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{globalStats.totalServices}</div>
            <div className="text-sm text-white/50">Services actifs</div>
            <div className="text-xs text-white/30 mt-1">{globalStats.totalStudents} étudiants</div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white/[0.06] border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-white/80">Présence par service</CardTitle>
          </CardHeader>
          <CardContent>
            {globalStats.attendanceByService.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={globalStats.attendanceByService}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="serviceName" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="rate" fill="#8884d8" name="Taux (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-white/40 text-sm">
                Aucune donnée de présence par service
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.06] border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-white/80">Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            {globalStats.attendanceOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={globalStats.attendanceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" name="Taux (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-white/40 text-sm">
                Aucune donnée d'évolution mensuelle
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}