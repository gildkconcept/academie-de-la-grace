// app/dashboard/superadmin/documents/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { documentService, Document } from '../../../../services/documentService'
import { serviceService } from '../../../../services/serviceService'
import Link from 'next/link'
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    DocumentArrowDownIcon,
    ChartBarIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    FunnelIcon
} from '@heroicons/react/24/outline'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Composants
const DocumentForm = ({ isOpen, onClose, document, onSuccess }: any) => {
    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<any[]>([])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [selectedCover, setSelectedCover] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        level: '',
        branch: '',
        serviceId: '',
        isVisible: true,
        isDownloadable: true,
        fileUrl: '',
        fileName: '',
        fileSize: 0,
        coverImageUrl: ''
    })

    useEffect(() => {
        fetchServices()
        if (document) {
            setFormData({
                title: document.title || '',
                description: document.description || '',
                level: document.level || '',
                branch: document.branch || '',
                serviceId: document.service_id || '',
                isVisible: document.is_visible !== undefined ? document.is_visible : true,
                isDownloadable: document.is_downloadable !== undefined ? document.is_downloadable : true,
                fileUrl: document.file_url || '',
                fileName: document.file_name || '',
                fileSize: document.file_size || 0,
                coverImageUrl: document.cover_image_url || ''
            })
            setPreviewUrl(document.cover_image_url || null)
        }
    }, [document])

    const fetchServices = async () => {
        try {
            const data = await serviceService.getAll()
            setServices(data || [])
        } catch (error) {
            console.error('Erreur chargement services:', error)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            toast.error('Seuls les fichiers PDF sont acceptés')
            return
        }

        if (file.size > 50 * 1024 * 1024) {
            toast.error('Le fichier ne doit pas dépasser 50 MB')
            return
        }

        setSelectedFile(file)
        setFormData(prev => ({
            ...prev,
            fileName: file.name,
            fileSize: file.size
        }))

        // Upload automatique
        try {
            const result = await documentService.uploadFile(file)
            setFormData(prev => ({
                ...prev,
                fileUrl: result.url
            }))
            toast.success('Fichier uploadé avec succès')
        } catch (error) {
            toast.error('Erreur lors de l\'upload du fichier')
        }
    }

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            toast.error('Seuls les formats JPEG, PNG et WebP sont acceptés')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('L\'image ne doit pas dépasser 5 MB')
            return
        }

        setSelectedCover(file)
        
        // Preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        try {
            const result = await documentService.uploadFile(file, 'covers')
            setFormData(prev => ({
                ...prev,
                coverImageUrl: result.url
            }))
            toast.success('Image de couverture uploadée')
        } catch (error) {
            toast.error('Erreur lors de l\'upload de l\'image')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (document) {
                await documentService.update(document.id, formData)
                toast.success('Document mis à jour')
            } else {
                await documentService.create(formData)
                toast.success('Document créé')
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
    const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-2xl bg-[rgba(8,20,90,0.97)] backdrop-blur-2xl border border-white/[0.15]">
                <div className="sticky top-0 bg-[rgba(5,15,70,0.9)] p-4 border-b border-white/[0.08] flex justify-between items-center rounded-t-2xl">
                    <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {document ? 'Modifier le document' : 'Ajouter un document'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                        <XMarkIcon className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-white/70 mb-1">Titre *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className={inputClass}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-white/70 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={`${inputClass} min-h-[80px] resize-y`}
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-white/70 mb-1">Fichier PDF *</label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className={inputClass}
                                required={!document}
                            />
                            {formData.fileName && (
                                <p className="text-xs text-white/50 mt-1">📄 {formData.fileName} ({(formData.fileSize / 1024 / 1024).toFixed(2)} MB)</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm text-white/70 mb-1">Image de couverture</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverChange}
                                className={inputClass}
                            />
                            {previewUrl && (
                                <div className="mt-2">
                                    <img src={previewUrl} alt="Couverture" className="w-32 h-40 object-cover rounded-lg" />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-white/70 mb-1">Niveau</label>
                                <select
                                    value={formData.level}
                                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                    className={selectClass}
                                >
                                    <option value="">Tous les niveaux</option>
                                    <option value="1">Niveau 1</option>
                                    <option value="2">Niveau 2</option>
                                    <option value="3">Niveau 3</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-white/70 mb-1">Branche</label>
                                <input
                                    type="text"
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    placeholder="Optionnel"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-white/70 mb-1">Service</label>
                            <select
                                value={formData.serviceId}
                                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">Tous les services</option>
                                {services.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 text-sm text-white/70">
                                <input
                                    type="checkbox"
                                    checked={formData.isVisible}
                                    onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/30 bg-white/10"
                                />
                                Visible aux étudiants
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white/70">
                                <input
                                    type="checkbox"
                                    checked={formData.isDownloadable}
                                    onChange={(e) => setFormData({ ...formData, isDownloadable: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/30 bg-white/10"
                                />
                                Téléchargement autorisé
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/[0.08]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? 'Enregistrement...' : document ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

const DocumentStats = ({ documents }: { documents: Document[] }) => {
    const totalDownloads = documents.reduce((acc, d) => acc + d.download_count, 0)
    const totalViews = documents.reduce((acc, d) => acc + d.view_count, 0)

    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white/[0.06] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{documents.length}</div>
                <div className="text-xs text-white/40">Total documents</div>
            </div>
            <div className="bg-white/[0.06] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-300">{totalDownloads}</div>
                <div className="text-xs text-white/40">Téléchargements</div>
            </div>
            <div className="bg-white/[0.06] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-300">{totalViews}</div>
                <div className="text-xs text-white/40">Consultations</div>
            </div>
            <div className="bg-white/[0.06] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-300">
                    {documents.length > 0 ? Math.round(totalDownloads / documents.length) : 0}
                </div>
                <div className="text-xs text-white/40">Moyenne/doc</div>
            </div>
        </div>
    )
}

export default function DocumentsPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingDocument, setEditingDocument] = useState<Document | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterLevel, setFilterLevel] = useState('')
    const [showStats, setShowStats] = useState(false)

    useEffect(() => {
        if (!loading && !user) router.push('/login')
        if (user && user.role !== 'superadmin') router.push('/dashboard/student')
        if (user?.role === 'superadmin') fetchDocuments()
    }, [user, loading])

    const fetchDocuments = async () => {
        setLoadingData(true)
        try {
            const data = await documentService.getAll()
            setDocuments(data || [])
        } catch (error) {
            console.error('Erreur chargement documents:', error)
            toast.error('Erreur lors du chargement')
        } finally {
            setLoadingData(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce document ? Cette action est irréversible.')) return

        try {
            await documentService.delete(id)
            toast.success('Document supprimé')
            fetchDocuments()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
        }
    }

    const handleExportStats = () => {
        const doc = new jsPDF()
        doc.setFontSize(20)
        doc.text('Statistiques des documents', 105, 15, { align: 'center' })

        const tableData = documents.map(d => [
            d.title,
            d.download_count.toString(),
            d.view_count.toString(),
            new Date(d.created_at).toLocaleDateString('fr-FR')
        ])

        autoTable(doc, {
            head: [['Titre', 'Téléchargements', 'Consultations', 'Date']],
            body: tableData,
            startY: 25
        })

        doc.save('statistiques_documents.pdf')
    }

    const filteredDocuments = documents.filter(doc => {
        const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchLevel = !filterLevel || doc.level === parseInt(filterLevel)
        return matchSearch && matchLevel
    })

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
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                            📚 Bibliothèque de documents
                        </h1>
                        <p className="text-white/50 text-sm">Gérez les documents mis à disposition des étudiants</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="px-4 py-2 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                        >
                            <ChartBarIcon className="w-4 h-4" />
                            {showStats ? 'Masquer stats' : 'Voir stats'}
                        </button>
                        <button
                            onClick={() => { setEditingDocument(null); setShowForm(true) }}
                            className="px-4 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Ajouter un document
                        </button>
                    </div>
                </div>

                {showStats && (
                    <>
                        <DocumentStats documents={documents} />
                        <button
                            onClick={handleExportStats}
                            className="mb-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            Exporter les stats en PDF
                        </button>
                    </>
                )}

                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un document..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400"
                    >
                        <option value="">Tous les niveaux</option>
                        <option value="1">Niveau 1</option>
                        <option value="2">Niveau 2</option>
                        <option value="3">Niveau 3</option>
                    </select>
                </div>

                {filteredDocuments.length === 0 ? (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">
                        Aucun document trouvé
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocuments.map((doc) => (
                            <div key={doc.id} className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl overflow-hidden hover:bg-white/[0.08] transition-all">
                                <div className="aspect-video bg-white/[0.04] flex items-center justify-center relative">
                                    {doc.cover_image_url ? (
                                        <img src={doc.cover_image_url} alt={doc.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-6xl">📄</div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        {!doc.is_visible && (
                                            <span className="px-2 py-0.5 bg-red-500/80 text-white text-xs rounded-full">Masqué</span>
                                        )}
                                        {!doc.is_downloadable && (
                                            <span className="px-2 py-0.5 bg-orange-500/80 text-white text-xs rounded-full">Lecture seule</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-white font-medium text-lg">{doc.title}</h3>
                                    {doc.description && (
                                        <p className="text-white/50 text-sm mt-1 line-clamp-2">{doc.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {doc.level && (
                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                                Niveau {doc.level}
                                            </span>
                                        )}
                                        {doc.branch && (
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
                                                {doc.branch}
                                            </span>
                                        )}
                                        {doc.services?.name && (
                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                                                {doc.services.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06]">
                                        <div className="flex gap-3 text-xs text-white/40">
                                            <span>📥 {doc.download_count}</span>
                                            <span>👁️ {doc.view_count}</span>
                                            <span>📅 {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => window.open(doc.file_url, '_blank')}
                                                className="p-1.5 text-blue-300 hover:text-blue-200 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Prévisualiser"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingDocument(doc); setShowForm(true) }}
                                                className="p-1.5 text-yellow-300 hover:text-yellow-200 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Modifier"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="p-1.5 text-red-300 hover:text-red-200 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Supprimer"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <DocumentForm
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditingDocument(null) }}
                document={editingDocument}
                onSuccess={fetchDocuments}
            />
        </div>
    )
}