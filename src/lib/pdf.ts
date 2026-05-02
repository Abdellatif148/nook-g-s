import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, Cafe } from '../types'

export const generateReceiptText = (cafe: Cafe, session: Session) => {
  const isTimeMode = session.rate_per_hour !== 0
  const isCompleted = session.status === 'completed'
  let text = `*${cafe.name}*\n`
  if (cafe.address) text += `${cafe.address}\n`
  if (cafe.phone) text += `${cafe.phone}\n`
  text += `\n`
  text += `*Session :* Place ${session.seat_number}\n`
  text += `*Client :* ${session.customer_name || 'Client'}\n`
  text += `*Date :* ${format(new Date(session.started_at), 'dd/MM/yyyy HH:mm')}\n`
  if (isCompleted && session.ended_at) {
    text += `*Fin :* ${format(new Date(session.ended_at), 'dd/MM/yyyy HH:mm')}\n`
  }
  text += `\n`
  
  if (isTimeMode) {
    text += `*Temps passé:* ${session.duration_minutes || 0} min\n`
    text += `*Tarif:* ${session.rate_per_hour} DH/h\n`
    text += `*Coût temps:* ${session.time_cost?.toFixed(2) || '0.00'} DH\n`
  }

  const extras = session.extras as any[]
  if (extras && extras.length > 0) {
    text += `\n*Consommations:*\n`
    extras.forEach(extra => {
      text += `- ${extra.quantity || extra.qty}x ${extra.name} : ${(extra.price * (extra.quantity || extra.qty)).toFixed(2)} DH\n`
    })
    text += `*Total Consommations:* ${session.extras_total?.toFixed(2) || '0.00'} DH\n`
  }

  text += `\n*TOTAL : ${session.total_amount?.toFixed(2) || '0.00'} DH*\n`
  
  if (isCompleted) {
    text += `\n*Paiement :* ${session.payment_method || '-'}\n`
  }

  text += `\nMerci de votre visite !\n`
  text += `Généré par Nook OS\n`

  return encodeURIComponent(text)
}

export const generateReceiptPDF = (cafe: Cafe, session: Session) => {
  const doc = new jsPDF({ format: [80, 200] }) // Thermal receipt format approximation
  const isTimeMode = session.rate_per_hour !== 0
  const isCompleted = session.status === 'completed'
  let y = 10;
  
  // Header
  const customLogo = localStorage.getItem('nook_logo');
  if (customLogo) {
     try {
       doc.addImage(customLogo, "PNG", 30, y, 20, 20);
       y += 24;
     } catch (e) {
       y += 4;
     }
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(cafe.name, 40, y, { align: 'center' }); y += 6;
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (cafe.address) { doc.text(cafe.address, 40, y, { align: 'center' }); y += 4; }
  if (cafe.phone) { doc.text(cafe.phone, 40, y, { align: 'center' }); y += 4; }
  
  y += 2
  doc.setDrawColor(0)
  doc.line(5, y, 75, y); y += 6;
  
  doc.setFontSize(10)
  doc.text(`Place ${session.seat_number}`, 5, y); 
  doc.text(format(new Date(session.started_at), 'dd/MM HH:mm'), 75, y, { align: 'right' }); y += 6;
  doc.text(`Client: ${session.customer_name}`, 5, y); y += 6;

  doc.line(5, y, 75, y); y += 6;

  if (isTimeMode) {
    doc.text(`Durée: ${session.duration_minutes || 0} min`, 5, y); y += 5;
    doc.text(`Tarif: ${session.rate_per_hour} DH/h`, 5, y); y += 5;
    doc.text(`Coût temps:`, 5, y);
    doc.text(`${session.time_cost?.toFixed(2) || '0.00'} DH`, 75, y, { align: 'right' }); y += 6;
  }

  const extras = session.extras as any[]
  if (extras && extras.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Consommations:`, 5, y); y += 5;
    doc.setFont('helvetica', 'normal')
    extras.forEach(extra => {
      const extraTotal = (extra.price * (extra.quantity || extra.qty)).toFixed(2)
      doc.text(`${extra.quantity || extra.qty}x ${extra.name}`, 5, y);
      doc.text(`${extraTotal} DH`, 75, y, { align: 'right' }); y += 5;
    })
    doc.text(`Total conso:`, 5, y);
    doc.text(`${session.extras_total?.toFixed(2) || '0.00'} DH`, 75, y, { align: 'right' }); y += 6;
  }
  
  doc.line(5, y, 75, y); y += 6;

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL A PAYER`, 5, y);
  doc.text(`${session.total_amount?.toFixed(2) || '0.00'} DH`, 75, y, { align: 'right' }); y += 8;
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (isCompleted) {
    doc.text(`Paiement: ${session.payment_method || '-'}`, 5, y); y += 5;
  }

  y += 5
  doc.setFontSize(8)
  doc.text('Merci de votre visite !', 40, y, { align: 'center' }); y += 4;
  doc.text('Généré par Nook OS', 40, y, { align: 'center' });

  doc.save(`Facture_${session.customer_name.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMddHHmm')}.pdf`)
}

export const generateReportPDF = (cafe: Cafe, sessions: Session[], period: string) => {
  const doc = new jsPDF()
  const now = format(new Date(), 'dd/MM/yyyy HH:mm')
  
  // Header
  doc.setFontSize(22)
  doc.setTextColor(249, 115, 22) // Accent color
  doc.text('Nook OS - Rapport d\'activité', 14, 22)
  
  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(`${cafe.name}`, 14, 32)
  doc.text(`${cafe.address || ''}, ${cafe.city || ''}`, 14, 38)
  doc.text(`Période: ${period}`, 14, 44)
  doc.text(`Généré le: ${now}`, 14, 50)

  // Stats Summary
  const totalRevenue = sessions.reduce((acc, s) => acc + s.total_amount, 0)
  const totalSessions = sessions.length
  const avgSession = totalSessions > 0 ? totalRevenue / totalSessions : 0

  doc.setDrawColor(200)
  doc.line(14, 55, 196, 55)
  
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text('Résumé', 14, 65)
  
  doc.setFontSize(10)
  doc.text(`Chiffre d'affaires total: ${totalRevenue.toFixed(2)} DH`, 14, 75)
  doc.text(`Nombre de sessions: ${totalSessions}`, 14, 82)
  doc.text(`Moyenne par session: ${avgSession.toFixed(2)} DH`, 14, 89)

  // Table
  const tableData = sessions.map(s => [
    format(new Date(s.ended_at!), 'dd/MM HH:mm'),
    s.customer_name,
    `Place ${s.seat_number}`,
    `${s.duration_minutes} min`,
    s.payment_method || '-',
    `${s.total_amount.toFixed(2)} DH`
  ])

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Client', 'Place', 'Durée', 'Paiement', 'Montant']],
    body: tableData,
    headStyles: { fillColor: [249, 115, 22] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Page ${i} sur ${pageCount} - Nook OS`, 105, 285, { align: 'center' })
  }

  doc.save(`Rapport_${cafe.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}
