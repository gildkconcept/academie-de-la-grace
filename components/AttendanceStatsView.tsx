'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'  // ← Ajouter CETTE ligne
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

interface AttendanceStats {
  stats: {
    total: number
    present: number
    absent: number
    late: number
    byMethod: {
      code: { total: number; present: number }
      manual: { total: number; present: number }
    }
  }
  details: any[]
}

export const AttendanceStatsView = () => {
  const [data, setData] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [serviceId, setServiceId] = useState<string>('all')
  const [method, setMethod] = useState<string>('all')
  const [services, setServices] = useState<any[]>([])

  useEffect(() => {
    fetchServices()
    fetchStats()
  }, [serviceId, method])

  const fetchServices = async () => {
    try {
      const { data } = await supabase.from('services').select('id, name')
      if (data) setServices(data)
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      let url = `/api/stats/attendance?`
      if (serviceId !== 'all') url += `serviceId=${serviceId}&`
      if (method !== 'all') url += `method=${method}&`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const result = await res.json()
      if (res.ok) {
        setData(result)
      } else {
        toast.error(result.error || 'Erreur chargement stats')
      }
    } catch (error) {
      console.error('Erreur fetchStats:', error)
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>
  if (!data) return <div className="text-center py-8">Aucune donnée</div>

  const pieData = [
    { name: 'Présents', value: data.stats.present, color: '#10b981' },
    { name: 'Absents', value: data.stats.absent, color: '#ef4444' },
    { name: 'Retards', value: data.stats.late, color: '#f59e0b' }
  ]

  const methodData = [
    { name: 'Code', présents: data.stats.byMethod.code.present, total: data.stats.byMethod.code.total },
    { name: 'Manuel', présents: data.stats.byMethod.manual.present, total: data.stats.byMethod.manual.total }
  ]

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4">
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">Tous les services</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">Toutes méthodes</option>
          <option value="code">Par code</option>
          <option value="manual">Manuel</option>
        </select>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{data.stats.present}</div>
            <div className="text-sm text-gray-500">Présents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{data.stats.absent}</div>
            <div className="text-sm text-gray-500">Absents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{data.stats.late}</div>
            <div className="text-sm text-gray-500">Retards</div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Répartition des présences</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Présences par méthode</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="présents" fill="#10b981" name="Présents" />
                <Bar dataKey="total" fill="#9ca3af" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card>
        <CardHeader><CardTitle>Détail des présences</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nom</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Service</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Niveau</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Méthode</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.details.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-sm">{d.studentName}</td>
                  <td className="px-4 py-2 text-sm">{d.serviceName}</td>
                  <td className="px-4 py-2 text-sm">Niveau {d.level}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      d.status === 'present' ? 'bg-green-100 text-green-800' :
                      d.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {d.status === 'present' ? 'Présent' : d.status === 'late' ? 'Retard' : 'Absent'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      d.method === 'code' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {d.method === 'code' ? 'Code' : 'Manuel'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}