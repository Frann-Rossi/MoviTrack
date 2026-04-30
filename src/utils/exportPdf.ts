import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Movimiento {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto: string;
  categoria: string | null;
}

interface Resumen {
  ingresos: number;
  egresos: number;
  saldo: number;
}

export const exportToPDF = (movimientos: Movimiento[], resumen: Resumen) => {
  const doc = new jsPDF();
  const fechaGeneracion = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

  // Configuración de colores
  const primaryColor = [37, 99, 235]; // Azul
  const successColor = [16, 185, 129]; // Esmeralda
  const dangerColor = [239, 68, 68]; // Rojo

  // Título
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MoviTrack - Informe Financiero', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado el: ${fechaGeneracion}`, 14, 30);

  // Línea decorativa
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  // Sección de Resumen
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Resumen General', 14, 45);

  autoTable(doc, {
    startY: 50,
    head: [['Concepto', 'Monto']],
    body: [
      ['Total Ingresos', `$${resumen.ingresos.toLocaleString('es-AR')}`],
      ['Total Egresos', `$${resumen.egresos.toLocaleString('es-AR')}`],
      ['Saldo Neto', `$${resumen.saldo.toLocaleString('es-AR')}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor as [number, number, number] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  // Tabla de Movimientos
  doc.setFontSize(14);
  doc.text('Detalle de Movimientos', 14, (doc as any).lastAutoTable.finalY + 15);

  const tableBody = movimientos.map(m => [
    format(new Date(m.fecha), 'dd/MM/yyyy'),
    m.descripcion,
    m.tipo.toUpperCase(),
    `$${Number(m.monto).toLocaleString('es-AR')}`
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Fecha', 'Descripción', 'Tipo', 'Monto']],
    body: tableBody,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [51, 65, 85] }, // Gray-700
    columnStyles: { 3: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const text = data.cell.raw as string;
        if (text === 'INGRESO') data.cell.styles.textColor = successColor as [number, number, number];
        if (text === 'EGRESO') data.cell.styles.textColor = dangerColor as [number, number, number];
      }
    }
  });

  // Pie de página
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `MoviTrack - Gestión Inteligente - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`MoviTrack_Informe_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
