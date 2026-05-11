import { format } from 'date-fns';

interface Movimiento {
  fecha: string;
  tipo: string;
  descripcion: string;
  monto: string;
}

export const exportToCSV = (movimientos: Movimiento[], periodLabel: string) => {
  const headers = ['Fecha', 'Tipo', 'Descripción', 'Monto'];
  const rows = movimientos.map(m => [
    format(new Date(m.fecha), 'dd/MM/yyyy'),
    m.tipo.toUpperCase(),
    m.descripcion,
    m.monto
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MoviTrack_${periodLabel.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
