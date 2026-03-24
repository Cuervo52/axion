import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Trophy, Calendar, Settings, Plus, Trash2,
  Edit, Box, ChevronRight, Zap, Target, ShieldCheck,
  History, BarChart3, Search, Filter
} from 'lucide-react';

export default function AdminTorneo() {
  const [isDrafting, setIsDrafting] = useState(false);
  const [squadSize, setSquadSize] = useState(3);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({ name: '', type: 'TORNEO' });

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

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTournament)
      });
      if (res.ok) {
        alert('Torneo creado exitosamente');
        setIsCreateModalOpen(false);
      }
    } catch (e) {
      alert('Error al crear torneo');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-[#050505] min-h-screen text-slate-300"
    >
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Trophy className="text-purple-500" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
              Tournament<span className="text-purple-500">Master</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Command Center // Level 4 Permissions</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-[#111] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-purple-500"><Plus size={14} /></span> Nuevo Torneo
          </button>
          <button className="flex-1 md:flex-none px-6 py-3 bg-red-600/10 border border-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
            <Trash2 size={14} /> Reset Squads
          </button>
        </div>
      </header>

      {/* NEW: Create Tournament Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0D1016] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Nuevo Torneo Demo</h2>

              <form onSubmit={handleCreateTournament} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre del Torneo</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Warzone Master Cup"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 transition-colors"
                    value={newTournament.name}
                    onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewTournament({ ...newTournament, type: 'TORNEO' })}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newTournament.type === 'TORNEO' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                  >Torneo</button>
                  <button
                    type="button"
                    onClick={() => setNewTournament({ ...newTournament, type: 'LIGA' })}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newTournament.type === 'LIGA' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                  >Liga</button>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                  >Cancelar</button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-purple-400 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >Crear Torneo</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Main Control Panel (Large) */}
        <div className="md:col-span-8 space-y-6">

          {/* Draft Simulator Tool */}
          <div className="bg-gradient-to-br from-[#121418] to-[#0B0E14] border border-purple-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={140} className="text-purple-500" />
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <Users size={20} className="text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Sorteo Inteligente (Draft)</h3>
            </div>

            <p className="text-sm text-slate-400 mb-8 max-w-lg leading-relaxed">
              Algoritmo de balanceo automático basado en MMR y estadísticas históricas. Organiza la competición en segundos.
            </p>

            <div className="flex flex-col sm:flex-row items-end gap-6">
              <div className="flex-1 w-full space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Filter size={12} /> Configuración de Squad
                </span>
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                  {[2, 3, 4].map(size => (
                    <button
                      key={size}
                      onClick={() => setSquadSize(size)}
                      className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${squadSize === size ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {size === 2 ? 'DUOS' : size === 3 ? 'TRIOS' : 'CUARTETOS'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleDraft}
                disabled={isDrafting}
                className="h-14 w-full sm:w-auto px-10 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-purple-400 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 shadow-2xl"
              >
                {isDrafting ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ShieldCheck size={18} />}
                {isDrafting ? 'ASIGNANDO...' : 'EJECUTAR SORTEO'}
              </button>
            </div>
          </div>

          {/* Activity Logs (Compact for Admin) */}
          <div className="bg-[#0B0E14] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <History size={14} /> Actividad Reciente del Torneo
              </h3>
              <Search size={14} className="text-slate-600" />
            </div>

            <div className="space-y-4">
              {[
                { time: '2m', user: 'Cristhian', action: 'Validó partida #2259', target: 'Squad Alpha', color: 'text-emerald-500' },
                { time: '15m', user: 'System', action: 'Generó nuevo bracket', target: 'Season 1', color: 'text-blue-500' },
                { time: '1h', user: 'Admin', action: 'Eliminó usuario', target: 'HackerMan#1', color: 'text-red-500' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-1 h-8 rounded-full ${item.color}`} />
                    <div>
                      <div className="text-xs font-bold text-white">{item.action} : <span className="text-slate-400 font-medium">{item.target}</span></div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase">By {item.user}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">{item.time} ago</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Panel (Stats) */}
        <div className="md:col-span-4 space-y-6">

          {/* Active Tournament Status Card */}
          <div className="bg-[#0D1016] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full min-h-[400px]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

            <div>
              <div className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 uppercase">
                  Live Status
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter">Active</span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">AXISVIA SEASON 1</h2>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><Calendar size={12} /> Mar 1 - Mar 31</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Squads</div>
                  <div className="text-2xl font-black text-white tabular-nums">24<span className="text-xs text-slate-600">/32</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Players</div>
                  <div className="text-2xl font-black text-white tabular-nums">72</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Tournament Progress</span>
                  <span>75%</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-[2px]">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 w-3/4 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.3)]" />
                </div>
              </div>

              <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all group">
                Open Leaderboard <ChevronRight size={14} className="inline-block ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B0E14] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:bg-white/5 transition-colors group">
              <BarChart3 size={20} className="text-yellow-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Kills Today</div>
              <div className="text-2xl font-black text-white italic">412</div>
            </div>
            <div className="bg-[#0B0E14] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:bg-white/5 transition-colors group">
              <Target size={20} className="text-emerald-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Avg Damage</div>
              <div className="text-2xl font-black text-white italic">2.4k</div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
