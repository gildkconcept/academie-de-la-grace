// components/dashboard/superadmin/StudentsListSection.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FunnelIcon, DocumentArrowDownIcon, TrophyIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Student } from '@/types'

interface StudentsListSectionProps {
  displayedStudents: Student[]
  services: any[]
  selectedService: string
  setSelectedService: (service: string) => void
  selectedBranch: string
  setSelectedBranch: (branch: string) => void
  selectedLevel: string
  setSelectedLevel: (level: string) => void
  selectedBaptism: string
  setSelectedBaptism: (baptism: string) => void
  studentSearchTerm: string
  setStudentSearchTerm: (term: string) => void
  studentServiceFilter: string
  setStudentServiceFilter: (filter: string) => void
  studentLevelFilter: string
  setStudentLevelFilter: (filter: string) => void
  studentBranchFilter: string
  setStudentBranchFilter: (filter: string) => void
  studentBaptismFilter: string
  setStudentBaptismFilter: (filter: string) => void
  studentMaisonGraceFilter: string
  setStudentMaisonGraceFilter: (filter: string) => void
  studentMaisonGraceSearch: string
  setStudentMaisonGraceSearch: (search: string) => void
  studentMaisonGraceList: string[]
  showStudentFilters: boolean
  setShowStudentFilters: (show: boolean) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  resetFilters: () => void
  handleDeleteStudent: (id: string) => void
  setShowBadgeModal: (show: boolean) => void
  generateStudentsPDF: () => void
}

export const StudentsListSection = ({
  displayedStudents,
  services,
  selectedService,
  setSelectedService,
  selectedBranch,
  setSelectedBranch,
  selectedLevel,
  setSelectedLevel,
  selectedBaptism,
  setSelectedBaptism,
  studentSearchTerm,
  setStudentSearchTerm,
  studentServiceFilter,
  setStudentServiceFilter,
  studentLevelFilter,
  setStudentLevelFilter,
  studentBranchFilter,
  setStudentBranchFilter,
  studentBaptismFilter,
  setStudentBaptismFilter,
  studentMaisonGraceFilter,
  setStudentMaisonGraceFilter,
  studentMaisonGraceSearch,
  setStudentMaisonGraceSearch,
  studentMaisonGraceList,
  showStudentFilters,
  setShowStudentFilters,
  showFilters,
  setShowFilters,
  resetFilters,
  handleDeleteStudent,
  setShowBadgeModal,
  generateStudentsPDF
}: StudentsListSectionProps) => {

  const branchesList = [...new Set(displayedStudents.map(s => s.branch))].sort()
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)

  const openStudentModal = (student: Student) => {
    setSelectedStudent(student)
    setShowStudentModal(true)
  }

  const closeStudentModal = () => {
    setSelectedStudent(null)
    setShowStudentModal(false)
  }

  return (
    <>
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl mb-8">
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06]">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-normal text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
              Étudiants ({displayedStudents.length})
              {selectedService !== 'all' && ` - ${services.find(s => s.id === selectedService)?.name}`}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setShowStudentFilters(!showStudentFilters)} className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-xs hover:bg-white/20 transition-colors flex items-center gap-1">
                <FunnelIcon className="w-3.5 h-3.5" />{showStudentFilters ? 'Masquer' : 'Filtres'}
              </button>
              <button onClick={generateStudentsPDF} className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors flex items-center gap-1">
                <DocumentArrowDownIcon className="w-3.5 h-3.5" />PDF
              </button>
              <button onClick={() => setShowBadgeModal(true)} className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs hover:bg-yellow-500/30 transition-colors flex items-center gap-1">
                <TrophyIcon className="w-3.5 h-3.5" />Badge
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Barre de recherche */}
          <div className="mb-4">
            <input type="text" placeholder="🔍 Rechercher par nom..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400" />
          </div>

          {/* Filtres */}
          {showStudentFilters && (
            <div className="space-y-3 mb-4 p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Service</label>
                  <select value={studentServiceFilter} onChange={(e) => setStudentServiceFilter(e.target.value)} className="w-full p-1.5 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Tous</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Niveau</label>
                  <select value={studentLevelFilter} onChange={(e) => setStudentLevelFilter(e.target.value)} className="w-full p-1.5 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Tous</option>
                    <option value="1">Niveau 1</option>
                    <option value="2">Niveau 2</option>
                    <option value="3">Niveau 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Branche</label>
                  <select value={studentBranchFilter} onChange={(e) => setStudentBranchFilter(e.target.value)} className="w-full p-1.5 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Toutes</option>
                    {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Baptême</label>
                  <select value={studentBaptismFilter} onChange={(e) => setStudentBaptismFilter(e.target.value)} className="w-full p-1.5 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Tous</option>
                    <option value="yes">Baptisés</option>
                    <option value="no">Non baptisés</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Maison de grâce</label>
                  <select value={studentMaisonGraceFilter} onChange={(e) => setStudentMaisonGraceFilter(e.target.value)} className="w-full p-1.5 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Toutes</option>
                    {studentMaisonGraceList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Recherche maison</label>
                  <input type="text" placeholder="Ex: Abobo..." value={studentMaisonGraceSearch} onChange={(e) => setStudentMaisonGraceSearch(e.target.value)} className="w-full p-1.5 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900" />
                </div>
              </div>
              <div>
                <button onClick={() => {
                  setStudentSearchTerm('')
                  setStudentServiceFilter('all')
                  setStudentLevelFilter('all')
                  setStudentBranchFilter('all')
                  setStudentBaptismFilter('all')
                  setStudentMaisonGraceFilter('all')
                  setStudentMaisonGraceSearch('')
                }} className="text-xs text-blue-300/80 hover:text-blue-200">
                  Réinitialiser tous les filtres
                </button>
              </div>
            </div>
          )}

          {/* Filtres avancés */}
          <div className={`mb-4 ${!showFilters && 'hidden'}`}>
            <div className="bg-white/[0.06] rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Service</label>
                  <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="w-full p-2 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Tous</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Branche</label>
                  <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full p-2 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Toutes</option>
                    {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Niveau</label>
                  <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full p-2 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Tous</option>
                    <option value="1">Niveau 1</option>
                    <option value="2">Niveau 2</option>
                    <option value="3">Niveau 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Baptême</label>
                  <select value={selectedBaptism} onChange={(e) => setSelectedBaptism(e.target.value)} className="w-full p-2 text-sm bg-white/90 border border-white/30 rounded-lg text-gray-900">
                    <option value="all">Tous</option>
                    <option value="yes">Baptisés</option>
                    <option value="no">Non baptisés</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-white/60">{displayedStudents.length} étudiants</span>
                <button onClick={resetFilters} className="px-3 py-1 bg-white/10 text-white/70 rounded-lg text-xs hover:bg-white/20">Réinitialiser</button>
              </div>
            </div>
          </div>

          {/* Liste des étudiants - Version mobile */}
          {displayedStudents.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">Aucun étudiant trouvé</div>
          ) : (
            <div className="space-y-3 lg:hidden">
              {displayedStudents.map((student) => {
                const studentService = services.find(s => s.id === student.service_id)
                return (
                  <div 
                    key={student.id} 
                    onClick={() => openStudentModal(student)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {(student as any).profile_image_url ? (
                        <img 
                          src={(student as any).profile_image_url} 
                          alt={student.full_name} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <span className="font-bold text-white/60">{student.full_name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <h3 className="font-medium text-white/90">{student.full_name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/60 mb-3">
                      <div>Service: {studentService?.name || '-'}</div>
                      <div>Niveau {student.level}</div>
                      <div>Branche: {student.branch}</div>
                      <div>Baptême: {student.baptized ? 'Oui' : 'Non'}</div>
                      <div className="col-span-2">Tél: {student.phone || '-'}</div>
                      {(student as any).maison_grace && <div className="col-span-2">🏠 {(student as any).maison_grace}</div>}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id) }} 
                      className="w-full py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Liste des étudiants - Version desktop */}
          {displayedStudents.length > 0 && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Photo</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Username</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Niveau</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Branche</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Baptême</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Maison</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {displayedStudents.map((student) => {
                    const studentService = services.find(s => s.id === student.service_id)
                    return (
                      <tr 
                        key={student.id} 
                        onClick={() => openStudentModal(student)}
                        className="border-t border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          {(student as any).profile_image_url ? (
                            <img 
                              src={(student as any).profile_image_url} 
                              alt={student.full_name} 
                              className="w-10 h-10 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-white/60">{student.full_name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-white/90">{student.full_name}</td>
                        <td className="px-4 py-3 text-xs text-white/50">@{student.username}</td>
                        <td className="px-4 py-3 text-sm text-white/60">{studentService?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-white/60">Niv. {student.level}</td>
                        <td className="px-4 py-3 text-sm text-white/60">{student.branch}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${student.baptized ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'}`}>
                            {student.baptized ? 'Oui' : 'Non'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/50">{(student as any).maison_grace || '-'}</td>
                        <td className="px-4 py-3 text-sm text-white/60">{student.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id) }} 
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded transition-colors"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal étudiant */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeStudentModal}>
          <div className="bg-[rgba(8,20,90,0.98)] backdrop-blur-3xl border border-white/[0.2] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[rgba(5,15,70,0.95)] backdrop-blur-2xl p-4 border-b border-white/[0.1] flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Détails de l'étudiant
              </h3>
              <button onClick={closeStudentModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Photo en grand */}
              <div className="flex justify-center mb-6">
                {(selectedStudent as any).profile_image_url ? (
                  <img 
                    src={(selectedStudent as any).profile_image_url} 
                    alt={selectedStudent.full_name} 
                    className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20">
                    <span className="text-5xl font-bold text-white/60">{selectedStudent.full_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Informations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Nom complet</p>
                  <p className="text-white font-medium">{selectedStudent.full_name}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Nom d'utilisateur</p>
                  <p className="text-white font-medium">@{selectedStudent.username}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Service</p>
                  <p className="text-white font-medium">{services.find(s => s.id === selectedStudent.service_id)?.name || '-'}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Niveau</p>
                  <p className="text-white font-medium">{selectedStudent.level}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Branche</p>
                  <p className="text-white font-medium">{selectedStudent.branch}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Baptême</p>
                  <p className="text-white font-medium">{selectedStudent.baptized ? 'Oui' : 'Non'}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Téléphone</p>
                  <p className="text-white font-medium">{selectedStudent.phone || 'Non renseigné'}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Maison de grâce</p>
                  <p className="text-white font-medium">{(selectedStudent as any).maison_grace || 'Non renseigné'}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Date d'inscription</p>
                  <p className="text-white font-medium">{new Date(selectedStudent.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <p className="text-white/40 text-xs">Email</p>
                  <p className="text-white font-medium">{selectedStudent.email || 'Non renseigné'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.08]">
                <button onClick={closeStudentModal} className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">
                  Fermer
                </button>
                <button 
                  onClick={() => {
                    closeStudentModal();
                    setShowBadgeModal(true);
                  }} 
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors"
                >
                  🏅 Attribuer un badge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}