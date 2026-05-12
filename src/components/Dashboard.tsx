import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  FileText, 
  Trash2,
  Calendar,
  Download,
  MessageCircle,
  X,
  Send,
  ChevronDown
} from 'lucide-react';
import { exportToPDF } from '../utils/exportPdf';
import { exportToCSV } from '../utils/exportCsv';
import { formatCurrency, formatDate } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';

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

const SummaryCard = ({ title, value, icon, color = "text-white", className = "" }: any) => (
  <div className={`summary-card ${className}`}>
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      {React.cloneElement(icon, { size: 60, className: "sm:w-20 sm:h-20" })}
    </div>
    <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1">{title}</p>
    <h2 className={`text-2xl sm:text-3xl font-bold ${color}`}>
      {formatCurrency(value)}
    </h2>
  </div>
);

const MovementRow = ({ mov, onDelete }: { mov: Movimiento, onDelete: () => void }) => (
  <div className="hover:bg-gray-700/20 transition-colors group px-4 sm:px-6 py-4">
    <div className="flex justify-between items-center">
      <div className="flex-1 min-w-0">
        <p className="text-gray-200 font-medium truncate">{mov.descripcion}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-gray-900/50 ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
            {mov.tipo}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 ml-4">
        <p className={`font-bold sm:font-semibold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
          {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(Number(mov.monto))}
        </p>
        <button onClick={onDelete} className="text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 sm:block hidden p-1">
          <Trash2 size={18} />
        </button>
        <button onClick={onDelete} className="text-gray-500 sm:hidden p-1">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ ingresos: 0, egresos: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let queryParams = `?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedDay !== 'all') queryParams += `&day=${selectedDay}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const [movRes, resRes] = await Promise.all([
        fetch(`/api/movimientos${queryParams}`, { signal: controller.signal }),
        fetch(`/api/resumen${queryParams}`, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      if (!movRes.ok || !resRes.ok) {
        console.error('API Error:', movRes.status, resRes.status);
        throw new Error('Error en el servidor');
      }
      
      const movData = await movRes.json();
      const resData = await resRes.json();
      
      setMovimientos(Array.isArray(movData) ? movData : []);
      setResumen(resData || { ingresos: 0, egresos: 0, saldo: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
      // Solo limpiamos si es un error real, no un aborto por un nuevo efecto
      if (error instanceof Error && error.name !== 'AbortError') {
        setMovimientos([]);
        setResumen({ ingresos: 0, egresos: 0, saldo: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, selectedDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descripcion, monto: Number(monto) })
      });
      if (!res.ok) throw new Error('Error al guardar');
      setIsModalOpen(false);
      setDescripcion('');
      setMonto('');
      fetchData();
    } catch (error) {
      alert('Error al guardar el movimiento');
    }
  };

  const handleDelete = async () => {
    if (confirmDelete.id) {
      try {
        const res = await fetch(`/api/movimientos/${confirmDelete.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        setConfirmDelete({ isOpen: false, id: null });
        fetchData();
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  const groupedMovimientos = movimientos.reduce((groups: { [key: string]: Movimiento[] }, mov) => {
    if (!mov.fecha) return groups;
    const date = formatDate(new Date(mov.fecha), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(mov);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMovimientos).sort((a, b) => b.localeCompare(a));
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const periodLabel = selectedDay === 'all' 
    ? formatDate(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')
    : `${selectedDay} de ${formatDate(new Date(selectedYear, selectedMonth - 1), 'MMMM')} de ${selectedYear}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
            MoviTrack PRO
          </h1>
          <p className="text-gray-400 font-medium mt-1">Tu asistente financiero personal</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex-1 sm:flex-none px-8 py-4 sm:rounded-2xl text-lg shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40"
          >
            <Plus size={24} />
            <span className="font-black uppercase tracking-widest text-sm">Nuevo</span>
          </button>
          <button
            onClick={async () => {
              const { authClient } = await import('../lib/auth-client');
              await authClient.signOut();
              window.location.reload();
            }}
            className="p-4 bg-gray-900 border border-gray-800 text-gray-500 hover:text-white rounded-2xl transition-all hover:bg-gray-800"
            title="Cerrar Sesión"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Date Selectors Premium */}
      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="period-select-container">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/10">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Mes</p>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedDay('all'); }} className="period-select w-full">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-gray-900">
                    {formatDate(new Date(2024, i), 'MMMM')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="period-select-container">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/10">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Año</p>
              <select value={selectedYear} onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedDay('all'); }} className="period-select w-full">
                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-gray-900">{y}</option>)}
              </select>
            </div>
          </div>

          <div className="period-select-container">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/10">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Día</p>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="period-select w-full">
                <option value="all" className="bg-gray-900 text-gray-400">Todo el mes</option>
                {Array.from({ length: daysInMonth }, (_, i) => <option key={i + 1} value={i + 1} className="bg-gray-900">{i + 1}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SummaryCard title={selectedDay === 'all' ? 'Saldo del Mes' : 'Saldo del Día'} value={resumen.saldo} icon={<Wallet />} />
          <SummaryCard title="Ingresos" value={resumen.ingresos} icon={<ArrowUpRight />} color="text-emerald-400" />
          <SummaryCard title="Egresos" value={resumen.egresos} icon={<ArrowDownRight />} color="text-red-400" className="sm:col-span-2 lg:col-span-1" />
        </div>
      </div>

      {/* Movimientos Section */}
      <div className="bg-gray-900/40 rounded-[2.5rem] border border-gray-800/60 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-8 sm:p-10 border-b border-gray-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Historial</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1.5">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button 
              onClick={() => exportToPDF(movimientos, resumen, periodLabel)} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-blue-400 bg-blue-500/10 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all whitespace-nowrap border border-blue-500/10"
              title="Exportar PDF"
            >
              <FileText size={18} />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => exportToCSV(movimientos, periodLabel)} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all whitespace-nowrap border border-emerald-500/20"
              title="Exportar CSV"
            >
              <Download size={18} />
              <span>CSV</span>
            </button>
            <button onClick={fetchData} className="p-4 bg-gray-900 text-gray-500 rounded-2xl hover:text-white transition-all border border-gray-800">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        <div className="min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-gray-500">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                  <RefreshCw size={24} className="animate-pulse" />
                </div>
              </div>
              <p className="mt-6 font-bold tracking-widest uppercase text-[10px]">Sincronizando datos</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-gray-500">
              <div className="w-24 h-24 bg-gray-800/40 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-700/30">
                <Plus size={40} className="opacity-10" />
              </div>
              <p className="text-xl font-black text-gray-400 tracking-tight">Sin registros</p>
              <p className="text-sm mt-2 opacity-60">No hay movimientos para este periodo.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="bg-gray-800/20 px-8 py-3.5 border-y border-gray-800/30">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                      {formatDate(date + 'T12:00:00', "EEEE d 'DE' MMMM")}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-800/30">
                    {groupedMovimientos[date].map((mov) => (
                      <MovementRow key={mov.id} mov={mov} onDelete={() => setConfirmDelete({ isOpen: true, id: mov.id })} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-gray-900 rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500">
            <div className="p-10 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter">Registrar</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Añadir transacción</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-all">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-4 bg-gray-950 p-2 rounded-[2rem] border border-gray-800">
                <button
                  type="button"
                  onClick={() => setTipo('egreso')}
                  className={`py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all ${tipo === 'egreso' ? 'bg-red-500 text-white shadow-2xl shadow-red-500/40' : 'text-gray-500 hover:text-white'}`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('ingreso')}
                  className={`py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all ${tipo === 'ingreso' ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40' : 'text-gray-500 hover:text-white'}`}
                >
                  Ingreso
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">Concepto</label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="¿En qué se usó el dinero?"
                  className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] px-8 py-6 text-white placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-lg shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">Monto Total</label>
                <div className="relative group">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-700 font-black text-4xl group-focus-within:text-blue-500 transition-colors">$</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] py-8 pl-16 pr-8 text-white placeholder-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-5xl font-black shadow-inner"
                  />
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="order-2 sm:order-1 flex-1 py-6 px-8 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary order-1 sm:order-2 flex-1 py-6 px-8 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xl shadow-2xl shadow-blue-500/40"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="¿Eliminar registro?"
        message="Esta acción no se puede deshacer. Se reajustarán tus totales automáticamente."
      />
    </div>
  );
}
