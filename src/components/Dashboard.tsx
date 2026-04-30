import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, Wallet, RefreshCw, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfirmModal from './ConfirmModal';
import { exportToPDF } from '../utils/exportPdf';

interface Movimiento {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto: string;
  medioPago: string | null;
  categoria: string | null;
}

interface Resumen {
  ingresos: number;
  egresos: number;
  saldo: number;
}

export default function Dashboard() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ ingresos: 0, egresos: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para el modal de confirmación
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
      const [movRes, resRes] = await Promise.all([
        fetch('/api/movimientos'),
        fetch('/api/resumen')
      ]);
      const movData = await movRes.json();
      const resData = await resRes.json();
      setMovimientos(movData);
      setResumen(resData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          descripcion,
          monto: Number(monto)
        })
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
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            MoviTrack
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1">Gestión financiera inteligente</p>
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary w-full sm:w-auto px-5 py-3 sm:rounded-full"
          >
            <Plus size={20} />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={60} className="sm:w-20 sm:h-20" />
          </div>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1">Saldo Actual</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            ${resumen.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-400">
            <ArrowUpRight size={60} className="sm:w-20 sm:h-20" />
          </div>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1">Ingresos</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400">
            ${resumen.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-400">
            <ArrowDownRight size={60} className="sm:w-20 sm:h-20" />
          </div>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1">Egresos</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-red-400">
            ${resumen.egresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-semibold text-white">Historial de Movimientos</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => exportToPDF(movimientos, resumen)}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium"
              title="Exportar PDF"
            >
              <FileText size={18} />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
            <button onClick={fetchData} className="text-gray-400 hover:text-white transition-colors p-1" title="Actualizar">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        <div className="min-h-[200px]">
          {loading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col justify-center items-center gap-4">
              <RefreshCw size={32} className="animate-spin text-blue-500" />
              <p>Actualizando tus datos...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="bg-gray-700/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={24} className="opacity-20" />
              </div>
              <p>No hay movimientos registrados.</p>
              <p className="text-sm">¡Añade tu primera transacción!</p>
            </div>
          ) : (
            <>
              {/* Vista Desktop (Tabla) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-800/50 text-gray-400 text-sm">
                      <th className="py-4 px-6 font-medium">Fecha</th>
                      <th className="py-4 px-6 font-medium">Descripción</th>
                      <th className="py-4 px-6 font-medium text-right">Monto</th>
                      <th className="py-4 px-6 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {movimientos.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-700/30 transition-colors group">
                        <td className="py-4 px-6 text-sm text-gray-300">
                          {format(new Date(mov.fecha), "dd MMM yyyy", { locale: es })}
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-gray-200 font-medium">{mov.descripcion}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-gray-900/50 ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {mov.tipo}
                            </span>
                          </div>
                        </td>
                        <td className={`py-4 px-6 text-right font-semibold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}${Number(mov.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => setConfirmDelete({ isOpen: true, id: mov.id })}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile (Tarjetas) */}
              <div className="sm:hidden divide-y divide-gray-700">
                {movimientos.map((mov) => (
                  <div key={mov.id} className="p-4 active:bg-gray-700/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {format(new Date(mov.fecha), "dd MMMM", { locale: es })}
                        </p>
                        <p className="text-white font-medium">{mov.descripcion}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className={`font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}${Number(mov.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] uppercase font-bold mt-1 ${mov.tipo === 'ingreso' ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                          {mov.tipo}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button 
                        onClick={() => setConfirmDelete({ isOpen: true, id: mov.id })}
                        className="text-gray-500 p-2 -mr-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
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
