// app/dashboard/student/documents/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { documentService, Document } from '@/services/documentService'
import { ArrowLeftIcon, DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline'

const DocumentCard = ({ document, onDownload }: { document: Document; onDownload: (id: string) => void }) => {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            await onDownload(document.id)
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl overflow-hidden hover:bg-white/[0.08] transition-all hover:scale-[1.02] duration-300">
            <div className="aspect-video bg-white/[0.04] flex items-center justify-center relative">
                {document.cover_image_url ? (
                    <img src={document.cover_image_url} alt={document.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-6xl">📄</div>
                )}
                {!document.is_downloadable && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500/80 text-white text-xs rounded-full">
                        Lecture seule
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-white font-medium text-lg">{document.title}</h3>
                {document.description && (
                    <p className="text-white/50 text-sm mt-1 line-clamp-2">{document.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                    {document.level && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                            Niveau {document.level}
                        </span>
                    )}
                    {document.branch && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
                            {document.branch}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-xs text-white/40">
                        📅 {new Date(document.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || !document.is_downloadable}
                        className="px-4 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        {isDownloading ? 'Téléchargement...' : 'Télécharger'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function StudentDocumentsPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (!loading && !user) router.push('/login')
        if (user?.id) fetchDocuments()
    }, [user, loading])

    const fetchDocuments = async () => {
        setLoadingData(true)
        try {
            const data = await documentService.getStudentDocuments()
            setDocuments(data || [])
        } catch (error) {
            console.error('Erreur chargement documents:', error)
            toast.error('Erreur lors du chargement')
        } finally {
            setLoadingData(false)
        }
    }

    const handleDownload = async (documentId: string) => {
        try {
            const result = await documentService.download(documentId)
            
            // Ouvrir le PDF dans un nouvel onglet ou télécharger
            if (result.url) {
                window.open(result.url, '_blank')
                toast.success('Téléchargement commencé')
                // Mettre à jour le compteur
                await fetchDocuments()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erreur lors du téléchargement')
        }
    }

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading || loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}>
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
            <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
            <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.94) 0%, rgba(15,45,130,0.9) 40%, rgba(10,30,100,0.92) 70%, rgba(4,12,65,0.96) 100%)' }} />

            <div className="relative z-30 max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.push('/dashboard/student')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                            📚 Bibliothèque de documents
                        </h1>
                        <p className="text-white/50 text-sm">Tous les documents mis à votre disposition</p>
                    </div>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="🔍 Rechercher un document..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400"
                    />
                </div>

                {filteredDocuments.length === 0 ? (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">
                        {searchTerm ? 'Aucun document ne correspond à votre recherche' : 'Aucun document disponible pour le moment'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocuments.map((doc) => (
                            <DocumentCard
                                key={doc.id}
                                document={doc}
                                onDownload={handleDownload}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}