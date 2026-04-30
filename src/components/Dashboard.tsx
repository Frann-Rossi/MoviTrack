import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, Wallet, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  // Form state
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

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este movimiento?')) {
      await fetch(`/api/movimientos/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            MoviTrack
          </h1>
          <p className="text-gray-400 mt-1">Gestión financiera inteligente</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
        >
          <Plus size={20} />
          <span>Nuevo Movimiento</span>
        </button>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Saldo Actual</p>
          <h2 className="text-4xl font-bold text-white">
            ${resumen.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-400">
            <ArrowUpRight size={80} />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Ingresos</p>
          <h2 className="text-3xl font-bold text-emerald-400">
            ${resumen.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-400">
            <ArrowDownRight size={80} />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Egresos</p>
          <h2 className="text-3xl font-bold text-red-400">
            ${resumen.egresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* Lista de Movimientos */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Historial de Movimientos</h3>
          <button onClick={fetchData} className="text-gray-400 hover:text-white transition-colors" title="Actualizar">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 flex justify-center items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-blue-500" />
              Cargando movimientos...
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay movimientos registrados. ¡Añade uno nuevo!
            </div>
          ) : (
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
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-700 ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mov.tipo}
                        </span>
                        {mov.categoria && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                            {mov.categoria}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-4 px-6 text-right font-semibold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {mov.tipo === 'ingreso' ? '+' : '-'}${Number(mov.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => handleDelete(mov.id)}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Registrar Movimiento</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-3 bg-gray-900 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTipo('egreso')}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${tipo === 'egreso' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Egreso
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('ingreso')}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Ingreso
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Descripción</label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Supermercado, Sueldo..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Monto ($)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-lg"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
