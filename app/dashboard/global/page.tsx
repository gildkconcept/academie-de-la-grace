'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function GlobalStatsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'superadmin')) router.push('/dashboard/superadmin')
    if (user?.role === 'superadmin') fetchStats()
  }, [user, loading])

  const fetchStats = async () => {
    const res = await fetch('/api/stats/global', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    setStats(data)
  }

  if (!stats) return <div className="p-8">Chargement...</div>

  const serviceChartData = stats.serviceStats.map(s => ({ name: s.name, taux: s.rate }))
  const pieData = [
    { name: 'Présents', value: stats.totalPresent },
    { name: 'Absents/Retards', value: stats.totalExpected - stats.totalPresent }
  ]
  const COLORS = ['#10b981', '#ef4444']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📊 Analyse globale des présences</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><CardHeader><CardTitle>Taux de présence global</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold text-indigo-600">{stats.globalRate.toFixed(1)}%</div></CardContent></Card>
        <Card><CardHeader><CardTitle>🥇 Meilleur service</CardTitle></CardHeader><CardContent>{stats.bestService ? <><div className="font-bold">{stats.bestService.name}</div><div>{stats.bestService.rate.toFixed(1)}%</div></> : '-'}</CardContent></Card>
        <Card><CardHeader><CardTitle>⚠️ Service en difficulté</CardTitle></CardHeader><CardContent>{stats.worstService ? <><div className="font-bold">{stats.worstService.name}</div><div>{stats.worstService.rate.toFixed(1)}%</div></> : '-'}</CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Répartition globale</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({name, percent}) => `${name}: ${(percent*100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value"><Cell fill={COLORS[0]} /><Cell fill={COLORS[1]} /></Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Taux de présence par service</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={serviceChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} /><YAxis unit="%" /><Tooltip /><Bar dataKey="taux" fill="#8884d8" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>
  )
}