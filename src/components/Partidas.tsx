import { History, Image as ImageIcon, Users, Clock, ChevronDown, ChevronUp, ArrowDown, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

type SortField = 'date' | 'totalKills' | 'totalScore';

export default function Partidas() {
  const [matches, setMatches] = useState<any[]>([]);
  const [matchMembers, setMatchMembers] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        const data = await res.json();
        setMatches(data || []);
      } catch (e) {
        console.error('Failed to fetch matches', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const loadMembers = async (matchId: string) => {
    if (matchMembers[matchId]) return;
    try {
      const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/members`);
      const data = await res.json();
      setMatchMembers((prev) => ({ ...prev, [matchId]: data || [] }));
    } catch (e) {
      console.error('Failed to fetch match members', e);
      setMatchMembers((prev) => ({ ...prev, [matchId]: [] }));
    }
  };

  const toggleExpand = (id: string) => {
    const next = expandedMatch === id ? null : id;
    setExpandedMatch(next);
    if (next) loadMembers(next);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'date') {
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * multiplier;
    }
    return (a[sortField] - b[sortField]) * multiplier;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-4 pb-24"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="text-purple-500" />
          Historial de Partidas
        </h2>
        <span className="text-xs font-medium text-slate-400 bg-slate-900/50 border border-purple-500/20 px-2 py-1 rounded-md">
          Recientes
        </span>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 justify-end mb-4">
        <button 
          onClick={() => handleSort('date')}
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${sortField === 'date' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Recientes {sortField === 'date' && (sortDirection === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
        </button>
        <button 
          onClick={() => handleSort('totalKills')}
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${sortField === 'totalKills' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Kills {sortField === 'totalKills' && (sortDirection === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
        </button>
        <button 
          onClick={() => handleSort('totalScore')}
          className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${sortField === 'totalScore' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Score {sortField === 'totalScore' && (sortDirection === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
        </button>
      </div>

      <div className="space-y-4">
        {isLoading && (
          <div className="text-center text-slate-500 text-sm py-8">Cargando historial...</div>
        )}

        {sortedMatches.map((match) => (
          <div 
            key={match.id} 
            className="bg-[#0F1115] rounded-2xl border border-white/5 overflow-hidden shadow-lg hover:border-purple-500/30 transition-colors"
          >
            <div className="flex flex-col sm:flex-row cursor-pointer" onClick={() => toggleExpand(match.id)}>
              {/* Miniatura de la captura */}
              <div className="relative w-full sm:w-32 h-32 sm:h-auto bg-slate-900 flex-shrink-0">
                {match.thumbnail ? (
                  <img 
                    src={match.thumbnail} 
                    alt="Captura de partida" 
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-purple-400 text-[10px] font-mono px-1.5 py-0.5 rounded border border-purple-500/20">
                  {match.id}
                </div>
              </div>

              {/* Detalles de la partida */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-white text-base">{match.squad}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12}/> {new Date(match.date).toLocaleString()}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px] text-purple-300/80">{match.mode}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-black italic ${match.position === '1st' ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'text-slate-500'}`}>
                      {match.position}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Total Kills</div>
                    <div className="font-mono font-bold text-white">{match.totalKills}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Score Squad</div>
                    <div className="font-mono font-bold text-purple-400">{match.totalScore.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-2 sm:hidden">
                   {expandedMatch === match.id ? <ChevronUp size={16} className="text-slate-600"/> : <ChevronDown size={16} className="text-slate-600"/>}
                </div>
              </div>
            </div>

            {/* Tabla de integrantes (Expandible) */}
            <AnimatePresence>
              {expandedMatch === match.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-black/20 border-t border-white/5"
                >
                  <div className="p-3">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/5">
                          <th className="pb-2 pl-2 font-medium">Jugador</th>
                          <th className="pb-2 text-center font-medium">Kills</th>
                          <th className="pb-2 text-center font-medium">Daño</th>
                          <th className="pb-2 text-right pr-2 font-medium">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(matchMembers[match.id] || []).map((member, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-2 pl-2 font-medium text-slate-300">{member.gamertag}</td>
                            <td className="py-2 text-center font-mono text-white">{member.kills}</td>
                            <td className="py-2 text-center font-mono text-slate-400">{member.damage}</td>
                            <td className="py-2 text-right pr-2 font-mono text-purple-400">{member.score}</td>
                          </tr>
                        ))}
                        {(matchMembers[match.id] || []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-slate-500">Sin detalle de jugadores.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {!isLoading && sortedMatches.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">No hay partidas registradas aún.</div>
        )}
      </div>
    </motion.div>
  );
}
