import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  FileText, 
  Trash2,
  X
} from 'lucide-react';
import { exportToPDF } from '../utils/exportPdf';
import { formatCurrency, formatDate } from '../utils/formatters';

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
  <div className={`bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group ${className}`}>
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
  <div className="hover:bg-gray-700/30 transition-colors group px-6 py-4">
    <div className="flex justify-between items-center">
      <div className="flex-1 min-w-0">
        <p className="text-gray-200 font-medium truncate">{mov.descripcion}</p>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-gray-900/50 ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
          {mov.tipo}
        </span>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <p className={`font-semibold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
          {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(Number(mov.monto))}
        </p>
        <button onClick={onDelete} className="text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 sm:block hidden">
          <Trash2 size={18} />
        </button>
        <button onClick={onDelete} className="text-gray-500 sm:hidden">
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
      
      const [movRes, resRes] = await Promise.all([
        fetch(`/api/movimientos${queryParams}`),
        fetch(`/api/resumen${queryParams}`)
      ]);
      setMovimientos(await movRes.json());
      setResumen(await resRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
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
      await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descripcion, monto: Number(monto) })
      });
      setIsModalOpen(false);
      setDescripcion('');
      setMonto('');
      fetchData();
    } catch (error) {
      console.error('Error submitting data:', error);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete.id) {
      await fetch(`/api/movimientos/${confirmDelete.id}`, { method: 'DELETE' });
      setConfirmDelete({ isOpen: false, id: null });
      fetchData();
    }
  };

  const groupedMovimientos = movimientos.reduce((groups: { [key: string]: Movimiento[] }, mov) => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            MoviTrack
          </h1>
          <p className="text-gray-400 mt-1">Gestión financiera inteligente</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <button
            onClick={async () => {
              const { authClient } = await import('../lib/auth-client');
              await authClient.signOut();
              window.location.reload();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-3 rounded-2xl sm:rounded-full font-medium transition-all"
          >
            <span>Salir</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary px-5 py-3 sm:rounded-full">
            <Plus size={20} />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-gray-800/40 p-2 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-xl border border-gray-700">
            <span className="text-xs font-bold text-gray-500 uppercase">Mes</span>
            <select value={selectedMonth} onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedDay('all'); }} className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1} className="bg-gray-800">
                  {formatDate(new Date(2024, i), 'MMMM')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-xl border border-gray-700">
            <span className="text-xs font-bold text-gray-500 uppercase">Año</span>
            <select value={selectedYear} onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedDay('all'); }} className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer">
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-gray-800">{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-xl border border-gray-700">
            <span className="text-xs font-bold text-gray-500 uppercase">Día</span>
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer min-w-[80px]">
              <option value="all" className="bg-gray-800">Todos</option>
              {Array.from({ length: daysInMonth }, (_, i) => <option key={i + 1} value={i + 1} className="bg-gray-800">{i + 1}</option>)}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2 pr-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {selectedDay === 'all' ? 'Vista Mensual' : 'Vista Diaria'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SummaryCard title={selectedDay === 'all' ? 'Saldo del Mes' : 'Saldo del Día'} value={resumen.saldo} icon={<Wallet size={60} />} />
          <SummaryCard title="Ingresos" value={resumen.ingresos} icon={<ArrowUpRight size={60} />} color="text-emerald-400" />
          <SummaryCard title="Egresos" value={resumen.egresos} icon={<ArrowDownRight size={60} />} color="text-red-400" className="sm:col-span-2 lg:col-span-1" />
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-semibold text-white">Detalle de Movimientos</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => exportToPDF(movimientos, resumen, periodLabel)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium">
              <FileText size={18} />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
            <button onClick={fetchData} className="text-gray-400 hover:text-white transition-colors p-1">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        <div className="min-h-[200px]">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando...</div>
          ) : movimientos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="bg-gray-700/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={24} className="opacity-20" />
              </div>
              <p>No hay movimientos en este periodo.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="bg-gray-900/50 px-6 py-2 border-y border-gray-700/50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      {formatDate(date + 'T12:00:00', "EEEE d 'de' MMMM")}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-700/30">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Registrar Movimiento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 sm:hidden">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-3 bg-gray-900 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTipo('egreso')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${tipo === 'egreso' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('ingreso')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${tipo === 'ingreso' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                  Ingreso
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Descripción</label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="¿En qué se usó el dinero?"
                  className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Monto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-900 border border-gray-700 rounded-2xl py-4 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="order-2 sm:order-1 flex-1 py-4 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary order-1 sm:order-2 flex-1 py-4 px-4 rounded-2xl font-bold flex justify-center items-center"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales de Sistema */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer. El monto se reajustará de tu saldo actual."
      />
    </div>
  );
}
