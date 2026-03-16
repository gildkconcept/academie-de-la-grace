import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentData {
  id: string;
  full_name: string;
  branch: string;
  level: number;
  baptized: boolean;
  phone: string;
}

interface AttendanceData {
  student: StudentData;
  status: string;
  scanned_at?: string;
}

export const generateAttendancePDF = (
  sessionCode: string,
  sessionDate: string,
  allStudents: StudentData[],
  attendanceData: AttendanceData[],
  serviceName: string,
  type: 'all' | 'present' | 'absent' = 'all' // Nouveau paramètre
) => {
  // Filtrer les étudiants selon le type demandé
  let filteredStudents: StudentData[] = [];
  let filteredAttendance: AttendanceData[] = [];
  let titleSuffix = '';

  switch (type) {
    case 'present':
      filteredAttendance = attendanceData.filter(a => a.status === 'present');
      filteredStudents = filteredAttendance.map(a => a.student);
      titleSuffix = ' - PRÉSENTS';
      break;
    case 'absent':
      // Les absents sont tous les étudiants qui ne sont pas dans attendanceData avec status present
      const presentIds = new Set(
        attendanceData
          .filter(a => a.status === 'present')
          .map(a => a.student.id)
      );
      filteredStudents = allStudents.filter(s => !presentIds.has(s.id));
      filteredAttendance = filteredStudents.map(s => ({
        student: s,
        status: 'absent',
        scanned_at: undefined
      }));
      titleSuffix = ' - ABSENTS';
      break;
    default:
      filteredStudents = allStudents;
      filteredAttendance = attendanceData;
      titleSuffix = ' - TOUS';
  }

  // Créer un nouveau document PDF
  const doc = new jsPDF();
  
  // Titre
  doc.setFontSize(20);
  doc.text('Académie de la Grâce', 105, 15, { align: 'center' });
  
  // Sous-titre
  doc.setFontSize(16);
  doc.text(`Rapport de présence${titleSuffix}`, 105, 25, { align: 'center' });
  doc.text(`Séance du ${sessionDate}`, 105, 32, { align: 'center' });
  
  // Code de la séance
  doc.setFontSize(12);
  doc.text(`Code: ${sessionCode}`, 105, 42, { align: 'center' });
  
  // Service
  doc.text(`Service: ${serviceName}`, 105, 49, { align: 'center' });
  
  // Statistiques
  const totalPresent = attendanceData.filter(a => a.status === 'present').length;
  const totalAbsent = allStudents.length - totalPresent;
  const totalLate = attendanceData.filter(a => a.status === 'late').length;
  
  doc.setFontSize(11);
  doc.text(`Total étudiants: ${allStudents.length}`, 20, 62);
  doc.text(`Présents: ${totalPresent}`, 20, 69);
  doc.text(`Absents: ${totalAbsent}`, 20, 76);
  doc.text(`Retards: ${totalLate}`, 20, 83);
  
  // Pourcentage de présence
  const pourcentage = allStudents.length > 0 
    ? Math.round((totalPresent / allStudents.length) * 100) 
    : 0;
  doc.text(`Taux de présence: ${pourcentage}%`, 20, 90);
  
  // Date de génération
  const now = new Date();
  doc.setFontSize(8);
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 105, 280, { align: 'center' });
  
  // Tableau des étudiants filtrés
  const tableData = filteredStudents.map(student => {
    const attendance = filteredAttendance.find(a => a.student.id === student.id);
    return [
      student.full_name,
      student.branch,
      `Niveau ${student.level}`,
      student.baptized ? 'Oui' : 'Non',
      student.phone,
      attendance ? 
        (attendance.status === 'present' ? '✓ Présent' : 
         attendance.status === 'late' ? '⚠ Retard' : '✗ Absent') 
        : '✗ Absent',
      attendance?.scanned_at ? new Date(attendance.scanned_at).toLocaleTimeString('fr-FR') : '-'
    ];
  });
  
  // Ajuster la position de départ du tableau en fonction du contenu
  const startY = type === 'all' ? 98 : 95;
  
  autoTable(doc, {
    head: [['Nom', 'Branche', 'Niveau', 'Baptisé', 'Téléphone', 'Statut', 'Heure scan']],
    body: tableData,
    startY: startY,
    styles: { fontSize: 8 },
    headStyles: { fillColor: type === 'present' ? [16, 185, 129] : type === 'absent' ? [239, 68, 68] : [79, 70, 229] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 }
    }
  });
  
  // Sauvegarder le PDF avec un nom approprié
  const typeSuffix = type === 'present' ? 'present' : type === 'absent' ? 'absents' : 'tous';
  doc.save(`presences_${sessionCode}_${sessionDate.replace(/\//g, '-')}_${typeSuffix}.pdf`);
};