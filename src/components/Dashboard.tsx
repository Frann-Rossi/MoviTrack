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

const ChatDrawer = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMsg }] })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error. 😢' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gray-900 w-full sm:max-w-md h-full sm:h-auto sm:rounded-3xl border-l sm:border border-gray-800 shadow-2xl flex flex-col overflow-hidden transform transition-all animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <MessageCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">MoviBot</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-400">Online</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <div className="w-16 h-16 rounded-3xl bg-gray-800 flex items-center justify-center mb-4">
                <MessageCircle size={32} />
              </div>
              <p className="font-medium">¡Hola! Soy tu asistente financiero.</p>
              <p className="text-sm mt-1">Pregúntame sobre tus gastos, ahorros o pedime un consejo.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble-ai animate-pulse">Escribiendo...</div>
          )}
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl py-3 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <button type="submit" className="absolute right-2 p-2 text-blue-400 hover:text-blue-300 transition-colors">
              <Send size={24} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ ingresos: 0, egresos: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
            MoviTrack
          </h1>
          <p className="text-gray-400 font-medium mt-1">Tu asistente financiero personal</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex-1 sm:flex-none px-6 py-4 sm:rounded-2xl"
          >
            <Plus size={24} />
            <span className="hidden sm:inline">Nuevo</span>
            <span className="sm:hidden">Nuevo Movimiento</span>
          </button>
          <button
            onClick={async () => {
              const { authClient } = await import('../lib/auth-client');
              await authClient.signOut();
              window.location.reload();
            }}
            className="p-4 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-2xl transition-all"
            title="Cerrar Sesión"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="period-select-container">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mes</p>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedDay('all'); }} className="period-select w-full">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-gray-900">
                    {formatDate(new Date(2024, i), 'MMMM')}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </div>

          <div className="period-select-container">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Año</p>
              <select value={selectedYear} onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedDay('all'); }} className="period-select w-full">
                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-gray-900">{y}</option>)}
              </select>
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </div>

          <div className="period-select-container">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Día</p>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="period-select w-full">
                <option value="all" className="bg-gray-900">Todos los días</option>
                {Array.from({ length: daysInMonth }, (_, i) => <option key={i + 1} value={i + 1} className="bg-gray-900">{i + 1}</option>)}
              </select>
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SummaryCard title={selectedDay === 'all' ? 'Saldo del Mes' : 'Saldo del Día'} value={resumen.saldo} icon={<Wallet />} />
          <SummaryCard title="Ingresos" value={resumen.ingresos} icon={<ArrowUpRight />} color="text-emerald-400" />
          <SummaryCard title="Egresos" value={resumen.egresos} icon={<ArrowDownRight />} color="text-red-400" className="sm:col-span-2 lg:col-span-1" />
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-[2rem] border border-gray-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 sm:p-8 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Detalle de Movimientos</h3>
            <p className="text-sm text-gray-500 mt-1">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button 
              onClick={() => exportToPDF(movimientos, resumen, periodLabel)} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-blue-400 bg-blue-500/10 px-5 py-3 rounded-2xl text-sm font-bold hover:bg-blue-500/20 transition-all whitespace-nowrap"
              title="Exportar PDF"
            >
              <FileText size={18} />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => exportToCSV(movimientos, periodLabel)} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 px-5 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-500/20 transition-all whitespace-nowrap"
              title="Exportar CSV"
            >
              <Download size={18} />
              <span>CSV</span>
            </button>
            <button onClick={fetchData} className="p-3 bg-gray-800 text-gray-400 rounded-2xl hover:text-white transition-all shrink-0">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        <div className="min-h-[300px]">
          {loading ? (
            <div className="p-20 text-center text-gray-500">
              <RefreshCw size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
              <p className="font-medium">Sincronizando datos...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-20 text-center text-gray-500">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus size={32} className="opacity-20" />
              </div>
              <p className="text-lg font-medium text-gray-400">Sin movimientos</p>
              <p className="text-sm">No hay registros para este periodo.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="bg-gray-800/30 px-6 py-3">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      {formatDate(date + 'T12:00:00', "EEEE d 'DE' MMMM")}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-800/50">
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

      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-3xl shadow-2xl shadow-blue-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <MessageCircle size={32} className="group-hover:rotate-12 transition-transform" />
      </button>

      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h3 className="text-2xl font-black text-white tracking-tight">Registrar</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-3 bg-gray-950 p-2 rounded-3xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setTipo('egreso')}
                  className={`py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${tipo === 'egreso' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'text-gray-500 hover:text-white'}`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('ingreso')}
                  className={`py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${tipo === 'ingreso' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-gray-500 hover:text-white'}`}
                >
                  Ingreso
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Concepto</label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="¿En qué se usó el dinero?"
                  className="w-full bg-gray-950 border border-gray-800 rounded-3xl px-6 py-5 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-2xl">$</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-950 border border-gray-800 rounded-3xl py-6 pl-12 pr-6 text-white placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-3xl font-black"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="order-2 sm:order-1 flex-1 py-5 px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest transition-all"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="btn-primary order-1 sm:order-2 flex-1 py-5 px-6 rounded-[1.5rem] font-black uppercase tracking-widest text-lg"
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
