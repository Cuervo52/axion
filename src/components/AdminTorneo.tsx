import { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Trophy, Calendar, Settings, Plus, Trash2, Edit, Box } from 'lucide-react';

export default function AdminTorneo() {
  const [isDrafting, setIsDrafting] = useState(false);
  const [squadSize, setSquadSize] = useState(3);

  const handleDraft = async () => {
    if (!confirm(`¿Confirmas sortear a todos los jugadores en squads de ${squadSize}?`)) return;
    setIsDrafting(true);
    try {
      const res = await fetch('/api/tournaments/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: 1, squad_size: squadSize })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`¡Sorteo completado! Se crearon ${data.squads_created} squads.`);
    } catch (e: any) {
      alert(`Error en el sorteo: ${e.message}`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿ESTÁS SEGURO? Esto borrará TODOS los squads del torneo actual.")) return;
    try {
      await fetch('/api/tournaments/reset-squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: 1 })
      });
      alert("Squads eliminados.");
    } catch (e) {
      alert("Error al resetear");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 pb-24"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-purple-500" />
          Administrar Torneo
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors border border-red-500/20"
          >
            <Trash2 size={14} /> Limpiar Squads
          </button>
          <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors shadow-lg shadow-purple-900/20">
            <Plus size={14} /> Nuevo Torneo
          </button>
        </div>
      </div>

      {/* Draft Control Section */}
      <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Users className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tight">Sorteo Relámpago (Draft)</h3>
            <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">Balanceo Automático de Equipos</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Tamaño del Equipo</label>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              {[2, 3, 4].map(size => (
                <button
                  key={size}
                  onClick={() => setSquadSize(size)}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${squadSize === size ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  {size === 2 ? 'Dúos' : size === 3 ? 'Tríos' : 'Cuartetos'}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleDraft}
            disabled={isDrafting}
            className="h-12 w-full sm:w-auto px-8 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-purple-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isDrafting ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Box size={16} />}
            {isDrafting ? 'Mezclando...' : 'Iniciar Sorteo'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl">
          <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Equipos Activos</div>
          <div className="text-2xl font-black text-white">24</div>
          <div className="text-[10px] text-emerald-500 mt-1 font-bold">+2 esta semana</div>
        </div>
        <div className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl">
          <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Partidas Pendientes</div>
          <div className="text-2xl font-black text-yellow-500">12</div>
          <div className="text-[10px] text-slate-400 mt-1 font-bold">Requieren revisión</div>
        </div>
      </div>

      {/* Lista de Torneos */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Torneos Activos</h3>

        {[1, 2].map((i) => (
          <div key={i} className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit size={14} /></button>
              <button className="p-1.5 bg-red-900/30 rounded-lg text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded uppercase border border-purple-500/20">
                  {i === 1 ? 'Liga Mensual' : 'Torneo Relámpago'}
                </span>
                <h3 className="text-lg font-black text-white mt-2 uppercase tracking-tight">
                  {i === 1 ? 'AxisvIA Season 1' : 'Weekend Warriors'}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> EN CURSO
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Inicio</div>
                <div className="text-white font-mono">01 Mar 2026</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1 flex items-center gap-1"><Users size={12} /> Participantes</div>
                <div className="text-white font-mono">48 Jugadores</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
              <button className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold py-2 rounded-lg border border-white/5 transition-colors">
                Ver Tabla
              </button>
              <button className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold py-2 rounded-lg border border-white/5 transition-colors">
                Configuración
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
