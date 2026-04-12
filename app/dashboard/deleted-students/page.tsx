'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      const { data } = await supabase
        .from('students')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      setDeletedStudents(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erreur de chargement')
    } finally {
      setLoadingData(false)
    }
  }

  const restoreStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ deleted_at: null })
        .eq('id', studentId)
      if (error) throw error
      toast.success('Étudiant restauré')
      fetchDeletedStudents()
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la restauration')
    }
  }

  if (loading || loadingData) return <div className="p-8 text-center">Chargement...</div>

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🗑️ Étudiants supprimés</h1>
        <Button onClick={() => router.push('/dashboard/superadmin')}>Retour au tableau</Button>
      </div>
      {deletedStudents.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-500">Aucun étudiant supprimé</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {deletedStudents.map(student => (
            <Card key={student.id}>
              <CardContent className="p-4 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-sm text-gray-500">@{student.username} - {student.branch} - Niveau {student.level}</p>
                  <p className="text-xs text-gray-400">Supprimé le {new Date(student.deleted_at!).toLocaleDateString('fr-FR')}</p>
                </div>
                <Button onClick={() => restoreStudent(student.id)} variant="outline" className="text-green-600 border-green-600">
                  ♻️ Restaurer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}