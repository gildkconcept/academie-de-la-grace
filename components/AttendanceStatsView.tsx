'use client'

import { useState, useEffect } from 'react'
// ⚠️ SUPPRIMER l'import de supabase
// import { supabase } from '@/lib/supabase'
import { serviceService } from '@/services/serviceService'  // ← AJOUTER
import { toast } from 'sonner'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

interface AttendanceStats {
  stats: {
    total: number; present: number; absent: number; late: number;
    byMethod: { code: { total: number; present: number }; manual: { total: number; present: number } }
  }
  details: any[]
}

const COLORS = ['#6ee7b7', '#fca5a5', '#fde68a']

export const AttendanceStatsView = () => {
  const [data, setData] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [serviceId, setServiceId] = useState<string>('all')
  const [method, setMethod] = useState<string>('all')
  const [services, setServices] = useState<any[]>([])

  useEffect(() => { fetchServices(); fetchStats() }, [serviceId, method])

  // ✅ CORRIGÉ - Remplacer l'appel Supabase par serviceService
  const fetchServices = async () => {
    try {
      const data = await serviceService.getAll()
      setServices(data || [])
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      let url = '/api/stats/attendance?'
      if (serviceId !== 'all') url += `serviceId=${serviceId}&`
      if (method !== 'all') url += `method=${method}&`
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      const result = await res.json()
      if (res.ok) setData(result)
      else toast.error(result.error || 'Erreur chargement stats')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  const selectClass = "p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  if (loading) return <div className="text-center py-8 text-white/60">Chargement...</div>
  if (!data) return <div className="text-center py-8 text-white/60">Aucune donnée</div>

  const pieData = [
    { name: 'Présents', value: data.stats.present },
    { name: 'Absents', value: data.stats.absent },
    { name: 'Retards', value: data.stats.late }
  ]

  const methodData = [
    { name: 'Code', presents: data.stats.byMethod.code.present, total: data.stats.byMethod.code.total },
    { name: 'Manuel', presents: data.stats.byMethod.manual.present, total: data.stats.byMethod.manual.total }
  ]

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4">
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={selectClass}>
          <option value="all">Tous les services</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectClass}>
          <option value="all">Toutes méthodes</option>
          <option value="code">Par code</option>
          <option value="manual">Manuel</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: data.stats.total, label: 'Total', bg: 'bg-white/[0.04]', color: 'text-white' },
          { value: data.stats.present, label: 'Présents', bg: 'bg-green-500/10', color: 'text-green-300' },
          { value: data.stats.absent, label: 'Absents', bg: 'bg-red-500/10', color: 'text-red-300' },
          { value: data.stats.late, label: 'Retards', bg: 'bg-yellow-500/10', color: 'text-yellow-300' }
        ].map((s, i) => (
          <div key={i} className={`${s.bg} backdrop-blur-2xl border border-white/[0.08] rounded-xl p-4 text-center`}>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-xl p-6">
          <h4 className="text-white/80 text-sm mb-4 font-medium">Répartition des présences</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(8,20,90,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-xl p-6">
          <h4 className="text-white/80 text-sm mb-4 font-medium">Présences par méthode</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={methodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(8,20,90,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white' }} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
              <Bar dataKey="presents" fill="#6ee7b7" name="Présents" radius={[6, 6, 0, 0]} />
              <Bar dataKey="total" fill="rgba(255,255,255,0.3)" name="Total" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06]">
          <h4 className="text-white/80 text-sm font-medium">Détail des présences</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                {['Nom', 'Service', 'Niveau', 'Statut', 'Méthode', 'Date'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.details.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-sm text-white/80">{d.studentName}</td>
                  <td className="px-4 py-2 text-sm text-white/60">{d.serviceName}</td>
                  <td className="px-4 py-2 text-sm text-white/60">Niv. {d.level}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      d.status === 'present' ? 'bg-green-500/20 text-green-300' : d.status === 'late' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {d.status === 'present' ? 'Présent' : d.status === 'late' ? 'Retard' : 'Absent'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      d.method === 'code' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                    }`}>{d.method === 'code' ? 'Code' : 'Manuel'}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-white/50">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}