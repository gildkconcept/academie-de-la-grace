'use client'

import { useState, useEffect } from 'react'
import { attendanceService } from '@/services/attendanceService'
import { toast } from 'sonner'

export const OverviewSection = () => {
  const [stats, setStats] = useState({
    globalRate: 0,
    totalStudents: 0,
    totalPresent: 0,
    totalAbsent: 0,
    bestService: { name: '-', rate: 0 },
    strugglingService: { name: '-', rate: 0 },
    totalServices: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await attendanceService.getStatsGlobal()
      if (data) {
        setStats({
          globalRate: data.globalAttendanceRate || 0,
          totalStudents: data.totalStudents || 0,
          totalPresent: data.totalAttendance || 0,
          totalAbsent: (data.expectedAttendance || 0) - (data.totalAttendance || 0),
          bestService: data.bestService || { name: '-', rate: 0 },
          strugglingService: data.strugglingService || { name: '-', rate: 0 },
          totalServices: data.totalServices || 0
        })
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
      toast.error('Erreur chargement des statistiques')
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

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Taux de présence</div>
          <div className="stat-value c-indigo">{stats.globalRate}%</div>
          <div className="stat-sub">{stats.totalPresent} / {stats.totalPresent + stats.totalAbsent}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Meilleur service</div>
          <div className="stat-value c-green">{stats.bestService.rate}%</div>
          <div className="stat-sub">{stats.bestService.name}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Service en difficulté</div>
          <div className="stat-value c-red">{stats.strugglingService.rate}%</div>
          <div className="stat-sub">{stats.strugglingService.name}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Services actifs</div>
          <div className="stat-value c-blue">{stats.totalServices}</div>
          <div className="stat-sub">{stats.totalStudents} étudiants</div>
        </div>
      </div>
      
      <div className="chart-row">
        <div className="chart-box">
          <div className="chart-title">Présences par service</div>
          <div className="bars">
            <div className="bar-wrap"><div className="bar" style={{ height: '89%', background: '#6366f1' }}></div><div className="bar-lbl">Grâce</div></div>
            <div className="bar-wrap"><div className="bar" style={{ height: '76%', background: '#6366f1' }}></div><div className="bar-lbl">Foi</div></div>
            <div className="bar-wrap"><div className="bar" style={{ height: '68%', background: '#6366f1' }}></div><div className="bar-lbl">Paix</div></div>
            <div className="bar-wrap"><div className="bar" style={{ height: '60%', background: '#6366f1' }}></div><div className="bar-lbl">Lumière</div></div>
            <div className="bar-wrap"><div className="bar" style={{ height: '42%', background: '#f87171' }}></div><div className="bar-lbl">Espoir</div></div>
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-title">Présences par niveau</div>
          <div className="bars">
            <div className="bar-wrap"><div className="bar" style={{ height: '70%', background: '#818cf8' }}></div><div className="bar-lbl">Niv. 1</div></div>
            <div className="bar-wrap"><div className="bar" style={{ height: '65%', background: '#a78bfa' }}></div><div className="bar-lbl">Niv. 2</div></div>
            <div className="bar-wrap"><div className="bar" style={{ height: '60%', background: '#c4b5fd' }}></div><div className="bar-lbl">Niv. 3</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}