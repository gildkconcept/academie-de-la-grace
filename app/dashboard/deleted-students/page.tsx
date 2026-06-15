'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { studentService } from '@/services/studentService'  
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Student } from '@/types'

export default function DeletedStudentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [deletedStudents, setDeletedStudents] = useState<Student[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user?.role !== 'superadmin') router.push('/dashboard/manager')
    if (user?.role === 'superadmin') fetchDeletedStudents()
  }, [user, loading])

  const fetchDeletedStudents = async () => {
    setLoadingData(true)
    try {
      const data = await studentService.getDeleted()  // ← Remplacé
      setDeletedStudents(data || [])
    } catch (error) { 
      console.error(error); 
      toast.error('Erreur de chargement') 
    } finally { 
      setLoadingData(false) 
    }
  }

  const restoreStudent = async (studentId: string) => {
    try {
      await studentService.restore(studentId)  // ← Remplacé
      toast.success('Étudiant restauré')
      fetchDeletedStudents()
    } catch (error) { 
      console.error(error); 
      toast.error('Erreur lors de la restauration') 
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      {/* Fond */}
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.94) 0%, rgba(15,45,130,0.9) 40%, rgba(10,30,100,0.92) 70%, rgba(4,12,65,0.96) 100%)' }} />
      <div className="fixed w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-[100px] -top-[50px] -right-[50px] z-20 pointer-events-none" />
      
      <div className="relative z-30 max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>🗑️ Étudiants supprimés</h1>
          <button onClick={() => router.push('/dashboard/superadmin')}
            className="px-4 py-2 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors">
            Retour au tableau
          </button>
        </div>

        {deletedStudents.length === 0 ? (
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-8 text-center text-white/40 text-sm">
            Aucun étudiant supprimé
          </div>
        ) : (
          <div className="grid gap-4">
            {deletedStudents.map(student => (
              <div key={student.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="text-white font-medium">{student.full_name}</p>
                  <p className="text-white/50 text-sm">@{student.username} - {student.branch} - Niveau {student.level}</p>
                  <p className="text-white/30 text-xs">Supprimé le {new Date(student.deleted_at!).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => restoreStudent(student.id)}
                  className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/20 rounded-lg text-sm hover:bg-green-500/30 transition-colors">
                  ♻️ Restaurer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}