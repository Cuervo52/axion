import { Trophy, Medal, ChevronDown, ChevronUp, Users, ArrowDown, ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type SortField = 'points' | 'kills' | 'kd';

export default function Equipos() {
  const [squads, setSquads] = useState<any[]>([]);
  const [expandedSquad, setExpandedSquad] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSquads();
  }, []);

  const fetchSquads = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setSquads(data);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSquad = (id: number) => {
    setExpandedSquad(expandedSquad === id ? null : id);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedSquads = [...squads].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const getMedal = (index: number) => {
    if (sortField !== 'points' || sortDirection !== 'desc') {
      return <span className="text-slate-500 font-bold w-6 text-center">{index + 1}</span>;
    }
    if (index === 0) return <Medal className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={24} />;
    if (index === 1) return <Medal className="text-slate-300" size={24} />;
    if (index === 2) return <Medal className="text-amber-700" size={24} />;
    return <span className="text-slate-500 font-bold w-6 text-center">{index + 1}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Cargando Tablas...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-24"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-purple-500" />
          Ranking Global
        </h2>
        <span className="text-xs font-medium text-slate-400 bg-slate-900/50 border border-purple-500/20 px-2 py-1 rounded-md">
          Temporada 1
        </span>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 justify-end mb-4">
        <button
          onClick={() => handleSort('points')}
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${sortField === 'points' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Puntos {sortField === 'points' && (sortDirection === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
        </button>
        <button
          onClick={() => handleSort('kills')}
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${sortField === 'kills' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Kills {sortField === 'kills' && (sortDirection === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
        </button>
        <button
          onClick={() => handleSort('kd')}
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${sortField === 'kd' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          K/D {sortField === 'kd' && (sortDirection === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
        </button>
      </div>

      <div className="space-y-3">
        {sortedSquads.map((squad, index) => (
          <div
            key={squad.squad_id || index}
            className="bg-[#0F1115] rounded-2xl border border-white/5 overflow-hidden shadow-lg hover:border-purple-500/30 transition-colors"
          >
            <div
              onClick={() => toggleSquad(squad.squad_id)}
              className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-4 w-full md:w-auto flex-1">
                <div className="flex items-center justify-center w-8 pt-1 md:pt-0 flex-shrink-0">
                  {getMedal(index)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg leading-tight truncate">{squad.squad_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2.5">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 whitespace-nowrap">
                      <Users size={12} className="text-slate-500" />
                      <span className="font-medium text-slate-300">{squad.members_count || 0}</span> Jugadores
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-8 pl-12 md:pl-0 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                <div className="flex items-center gap-6 md:gap-8">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Kills</div>
                    <div className="text-sm font-bold text-white">{squad.kills}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">K/D</div>
                    <div className="text-sm font-bold text-white">{squad.kd.toFixed(2)}</div>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Puntos</div>
                    <div className="text-xl md:text-2xl font-black text-purple-400 leading-none">{squad.points}</div>
                  </div>
                </div>

                <div className="text-slate-500 pl-2">
                  {expandedSquad === squad.squad_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedSquad === squad.squad_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 bg-black/20"
                >
                  <div className="p-4 text-center text-slate-500 text-xs">
                    Cargando detalles de miembros...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
