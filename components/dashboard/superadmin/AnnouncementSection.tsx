// components/dashboard/superadmin/AnnouncementSection.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MegaphoneIcon } from '@heroicons/react/24/outline'
import { SendAnnouncement } from '@/components/SendAnnouncement'

interface AnnouncementSectionProps {
  setShowAnnouncement?: (show: boolean) => void
}

export const AnnouncementSection = ({ setShowAnnouncement }: AnnouncementSectionProps) => {
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)

  const handleOpenModal = () => {
    setShowAnnouncementModal(true)
    if (setShowAnnouncement) setShowAnnouncement(true)
  }

  const handleCloseModal = () => {
    setShowAnnouncementModal(false)
    if (setShowAnnouncement) setShowAnnouncement(false)
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            📢 Annonces
          </h2>
          <Button 
            onClick={handleOpenModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="sm"
          >
            <MegaphoneIcon className="w-4 h-4 mr-1" />
            Nouvelle annonce
          </Button>
        </div>
        <Card>
          <CardContent className="p-4 text-center text-gray-500 text-sm">
            Envoyez des notifications à tous les étudiants ou à un service spécifique.
          </CardContent>
        </Card>
      </div>

      {/* Modal d'envoi d'annonce */}
      {showAnnouncementModal && (
        <SendAnnouncement onClose={handleCloseModal} />
      )}
    </>
  )
}