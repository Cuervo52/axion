import { Trophy, Medal, User, ArrowDown, ArrowUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

// Datos de prueba (Mock Data) para mostrar el diseño
const mockPlayers = [
  { rank: 1, gamertag: 'ElMataNoobs', squad: 'Los Malandros', points: 600, kills: 40, kd: 4.1, matches: 5 },
  { rank: 2, gamertag: 'AlphaOne', squad: 'Team Alpha', points: 450, kills: 30, kd: 3.0, matches: 5 },
  { rank: 3, gamertag: 'SniperPro', squad: 'Los Malandros', points: 400, kills: 25, kd: 2.8, matches: 5 },
  { rank: 4, gamertag: 'GhostLead', squad: 'Ghost Squad', points: 400, kills: 25, kd: 2.5, matches: 5 },
  { rank: 5, gamertag: 'BravoTwo', squad: 'Team Alpha', points: 350, kills: 22, kd: 2.6, matches: 5 },
  { rank: 6, gamertag: 'CharlieThree', squad: 'Team Alpha', points: 300, kills: 20, kd: 2.7, matches: 5 },
  { rank: 7, gamertag: 'Spectre', squad: 'Ghost Squad', points: 300, kills: 20, kd: 2.0, matches: 5 },
  { rank: 8, gamertag: 'RushB', squad: 'Los Malandros', points: 250, kills: 20, kd: 2.5, matches: 5 },
  { rank: 9, gamertag: 'Phantom', squad: 'Ghost Squad', points: 250, kills: 15, kd: 1.8, matches: 5 },
  { rank: 10, gamertag: 'Camper1', squad: 'Noobs Unidos', points: 200, kills: 10, kd: 0.9, matches: 5 },
];

type SortField = 'points' | 'kills' | 'kd';

export default function Individual() {
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPlayers = [...mockPlayers].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const getMedal = (index: number) => {
    // Only show medals if sorting by points descending (default view)
    if (sortField !== 'points' || sortDirection !== 'desc') {
       return <span className="text-slate-500 font-bold w-5 text-center text-sm">{index + 1}</span>;
    }

    if (index === 0) return <Medal className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={20} />;
    if (index === 1) return <Medal className="text-slate-300" size={20} />;
    if (index === 2) return <Medal className="text-amber-700" size={20} />;
    return <span className="text-slate-500 font-bold w-5 text-center text-sm">{index + 1}</span>;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-4 pb-24"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="text-purple-500" />
          Top Jugadores
        </h2>
        <span className="text-xs font-medium text-slate-400 bg-slate-900/50 border border-purple-500/20 px-2 py-1 rounded-md">
          Global
        </span>
      </div>

      <div className="bg-[#0F1115] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-black/20 border-b border-white/5">
              <tr>
                <th scope="col" className="px-4 py-3 w-12 text-center">#</th>
                <th scope="col" className="px-4 py-3">Jugador / Squad</th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('kills')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Kills {sortField === 'kills' && (sortDirection === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('kd')}
                >
                  <div className="flex items-center justify-center gap-1">
                    K/D {sortField === 'kd' && (sortDirection === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('points')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Pts {sortField === 'points' && (sortDirection === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPlayers.map((player, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center">
                      {getMedal(index)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{player.gamertag}</div>
                    <div className="text-xs text-slate-500">{player.squad}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">
                    {player.kills}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">
                    {player.kd}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-purple-400">
                    {player.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
