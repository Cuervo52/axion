import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, ChevronUp, Crosshair, Shield, Target, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

type PlayerTab = 'league' | 'career';
type LeagueMode = 'current' | 'past';
type StatField = 'score' | 'eliminations' | 'kills' | 'assists' | 'redeploys' | 'damage' | 'matches';

interface PlayerDashboardProps {
  userId: string;
  activeTab: PlayerTab;
  onTabChange: (tab: PlayerTab) => void;
}

const statLabels: Record<StatField, string> = {
  score: 'Puntuación',
  eliminations: 'Eliminaciones',
  kills: 'Bajas',
  assists: 'Asistencias',
  redeploys: 'Redespliegues',
  damage: 'Daño',
  matches: 'Partidas',
};

function StatCards({ summary }: { summary: any }) {
  const cards = [
    { label: 'Puntuación', value: Number(summary?.score || 0), icon: Trophy, tone: 'text-amber-300' },
    { label: 'Eliminaciones', value: Number(summary?.eliminations || 0), icon: Crosshair, tone: 'text-red-300' },
    { label: 'Bajas', value: Number(summary?.kills || 0), icon: Crosshair, tone: 'text-red-400' },
    { label: 'Asistencias', value: Number(summary?.assists || 0), icon: Shield, tone: 'text-emerald-300' },
    { label: 'Redespliegues', value: Number(summary?.redeploys || 0), icon: Crosshair, tone: 'text-blue-300' },
    { label: 'Daño', value: Number(summary?.damage || 0), icon: Target, tone: 'text-cyan-300' },
    { label: 'Partidas', value: Number(summary?.matches || 0), icon: CalendarDays, tone: 'text-slate-200' },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <card.icon size={13} className={card.tone} />
            {card.label}
          </div>
          <div className="mt-3 text-xl font-black text-white">{card.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function SortChips({
  fields,
  sortField,
  sortDirection,
  onChange,
}: {
  fields: StatField[];
  sortField: StatField;
  sortDirection: 'asc' | 'desc';
  onChange: (field: StatField) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <button
          key={field}
          onClick={() => onChange(field)}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
            sortField === field
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
              : 'border-white/8 bg-white/[0.03] text-slate-400 hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            {statLabels[field]}
            {sortField === field ? (sortDirection === 'desc' ? <ArrowDown size={11} /> : <ArrowUp size={11} />) : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function StandingsTable({
  title,
  rows,
  rowNameKey,
  rowSecondaryKey,
  sortFields,
  highlightId,
  rowIdKey = 'id',
  showHeader = true,
  externalSort,
}: {
  title: string;
  rows: any[];
  rowNameKey: string;
  rowSecondaryKey?: string;
  sortFields: StatField[];
  highlightId?: string | number | null;
  rowIdKey?: string;
  showHeader?: boolean;
  externalSort?: { field: StatField; direction: 'asc' | 'desc' };
}) {
  const [sortField, setSortField] = useState<StatField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const activeSortField = externalSort?.field ?? sortField;
  const activeSortDirection = externalSort?.direction ?? sortDirection;

  const handleSort = (field: StatField) => {
    if (field === sortField) {
      setSortDirection((current) => current === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const sortedRows = [...rows].sort((a, b) => {
    const left = Number(a?.[activeSortField] || 0);
    const right = Number(b?.[activeSortField] || 0);
    const direction = activeSortDirection === 'desc' ? -1 : 1;
    return (left - right) * direction;
  });

  return (
    <section className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {showHeader ? <h3 className="text-lg font-black text-white">{title}</h3> : <div />}
        <SortChips fields={sortFields} sortField={activeSortField} sortDirection={activeSortDirection} onChange={handleSort} />
      </div>

      <div className="space-y-2 md:hidden">
        {sortedRows.map((row, index) => {
          const rowId = row?.[rowIdKey];
          const isHighlighted = highlightId !== undefined && highlightId !== null && rowId === highlightId;

          return (
            <div key={`${rowId || row[rowNameKey]}-${index}`} className={`rounded-lg border p-3 ${isHighlighted ? 'border-amber-400/30 bg-amber-500/10' : 'border-white/6 bg-white/[0.03]'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-500">#{index + 1}</span>
                  <span className="ml-2 font-bold text-white text-xs">{row?.[rowNameKey]}</span>
                  {rowSecondaryKey ? <span className="ml-2 text-[10px] text-slate-500">{row?.[rowSecondaryKey] || ''}</span> : null}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500">Pts </span>
                  <span className="font-black text-amber-200 text-xs">{Number(row?.points || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-[10px]">
                <span><span className="text-slate-500">K </span><span className="font-bold text-slate-300">{Number(row?.kills || 0)}</span></span>
                <span><span className="text-slate-500">D </span><span className="font-bold text-slate-300">{Number(row?.damage || 0).toLocaleString()}</span></span>
                <span><span className="text-slate-500">A </span><span className="font-bold text-slate-300">{Number(row?.assists || 0)}</span></span>
                <span><span className="text-slate-500">P </span><span className="font-bold text-slate-400">{Number(row?.matches || 0)}</span></span>
              </div>
            </div>
          );
        })}
        {sortedRows.length === 0 ? <div className="py-4 text-center text-slate-500 text-xs">Sin datos todavía.</div> : null}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            <tr className="border-b border-white/6">
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Nombre</th>
              <th className="px-2 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-right">Kills</th>
              <th className="px-2 py-2 text-right">Daño</th>
              <th className="px-2 py-2 text-right">Asist</th>
              <th className="px-2 py-2 text-right">Part</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedRows.map((row, index) => {
              const rowId = row?.[rowIdKey];
              const isHighlighted = highlightId !== undefined && highlightId !== null && rowId === highlightId;

              return (
                <tr key={`${rowId || row[rowNameKey]}-${index}`} className={isHighlighted ? 'bg-amber-500/8' : ''}>
                  <td className="px-2 py-2 font-black text-slate-500">{index + 1}</td>
                  <td className="px-2 py-2">
                    <div className="font-bold text-white">{row?.[rowNameKey]}</div>
                    {rowSecondaryKey ? <div className="text-[10px] text-slate-500">{row?.[rowSecondaryKey] || 'Sin dato'}</div> : null}
                  </td>
                  <td className="px-2 py-2 text-right font-black text-amber-200">{Number(row?.points || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right text-slate-300">{Number(row?.kills || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right text-slate-400">{Number(row?.damage || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right text-slate-400">{Number(row?.assists || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right text-slate-500">{Number(row?.matches || 0).toLocaleString()}</td>
                </tr>
              );
            })}
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-slate-500">Sin datos todavía.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankingSection({
  teams,
  players,
  teamHighlightId,
  playerHighlightId,
}: {
  teams: any[];
  players: any[];
  teamHighlightId?: number | null;
  playerHighlightId?: string | number | null;
}) {
  const [mode, setMode] = useState<'squad' | 'individual'>('squad');
  const [sortField, setSortField] = useState<StatField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: StatField) => {
    if (field === sortField) {
      setSortDirection((current) => current === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const sortedTeams = [...teams].sort((a, b) => {
    const left = Number(a?.[sortField] || 0);
    const right = Number(b?.[sortField] || 0);
    const direction = sortDirection === 'desc' ? -1 : 1;
    return (left - right) * direction;
  });

  const sortedPlayers = [...players].sort((a, b) => {
    const left = Number(a?.[sortField] || 0);
    const right = Number(b?.[sortField] || 0);
    const direction = sortDirection === 'desc' ? -1 : 1;
    return (left - right) * direction;
  });

  return (
    <section className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-black text-white">Ranking</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('squad')}
            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
              mode === 'squad' ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : 'border-white/8 bg-white/[0.03] text-slate-400'
            }`}
          >
            Squad
          </button>
          <button
            onClick={() => setMode('individual')}
            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
              mode === 'individual' ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : 'border-white/8 bg-white/[0.03] text-slate-400'
            }`}
          >
            Individual
          </button>
        </div>
      </div>

      {mode === 'squad' ? (
        <div className="space-y-2">
          <SortChips
            fields={['score', 'eliminations', 'kills', 'assists', 'redeploys', 'damage', 'matches']}
            sortField={sortField}
            sortDirection={sortDirection}
            onChange={handleSort}
          />
          <div className="border-b border-white/6 pb-1 mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-slate-500 px-1">
            <span className="w-5">#</span>
            <span className="flex-1">Nombre</span>
            <span className="w-10 text-right">Pts</span>
            <span className="w-8 text-right">Elim</span>
            <span className="w-8 text-right">K</span>
            <span className="w-8 text-right">A</span>
            <span className="w-8 text-right">Redep</span>
            <span className="w-12 text-right">Daño</span>
            <span className="w-8 text-right">Part</span>
          </div>
          <div className="space-y-1">
            {sortedTeams.map((team, index) => {
              const isHighlighted = teamHighlightId !== undefined && teamHighlightId !== null && team.id === teamHighlightId;
              return (
                <div
                  key={team.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                    isHighlighted ? 'border-amber-400/50 bg-amber-500/15' : 'border-white/6 bg-white/[0.02]'
                  }`}
                >
                  <span className={`font-black w-5 ${index < 3 ? 'text-amber-300' : 'text-slate-500'}`}>{index + 1}</span>
                  <span className="font-bold text-slate-200 flex-1 truncate">{team.name}</span>
                  <span className={`w-10 text-right font-black ${sortField === 'score' ? 'text-amber-300' : 'text-slate-300'}`}>{Number(team.points || 0).toLocaleString()}</span>
                  <span className={`w-8 text-right ${sortField === 'eliminations' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(team.eliminations || 0)}</span>
                  <span className={`w-8 text-right ${sortField === 'kills' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(team.kills || 0)}</span>
                  <span className={`w-8 text-right ${sortField === 'assists' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(team.assists || 0)}</span>
                  <span className={`w-8 text-right ${sortField === 'redeploys' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(team.redeploys || 0)}</span>
                  <span className={`w-12 text-right ${sortField === 'damage' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(team.damage || 0).toLocaleString()}</span>
                  <span className={`w-8 text-right ${sortField === 'matches' ? 'text-amber-200 font-bold' : 'text-slate-500'}`}>{Number(team.matches || 0)}</span>
                </div>
              );
            })}
            {sortedTeams.length === 0 && <div className="text-center text-slate-500 text-xs py-4">Sin datos todavía.</div>}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <SortChips
            fields={['score', 'eliminations', 'kills', 'assists', 'redeploys', 'damage', 'matches']}
            sortField={sortField}
            sortDirection={sortDirection}
            onChange={handleSort}
          />
          <div className="border-b border-white/6 pb-1 mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-slate-500 px-1">
            <span className="w-5">#</span>
            <span className="flex-1">Nombre</span>
            <span className="w-10 text-right">Pts</span>
            <span className="w-8 text-right">Elim</span>
            <span className="w-8 text-right">K</span>
            <span className="w-8 text-right">A</span>
            <span className="w-8 text-right">Redep</span>
            <span className="w-12 text-right">Daño</span>
            <span className="w-8 text-right">Part</span>
          </div>
          <div className="space-y-1">
            {sortedPlayers.map((player, index) => {
              const isHighlighted = playerHighlightId !== undefined && playerHighlightId !== null && player.google_id === playerHighlightId;
              return (
                <div
                  key={player.google_id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                    isHighlighted ? 'border-amber-400/50 bg-amber-500/15' : 'border-white/6 bg-white/[0.02]'
                  }`}
                >
                  <span className={`font-black w-5 ${index < 3 ? 'text-amber-300' : 'text-slate-500'}`}>{index + 1}</span>
                  <span className="font-bold text-slate-200 flex-1 truncate">{player.gamertag}</span>
                  <span className={`w-10 text-right font-black ${sortField === 'score' ? 'text-amber-300' : 'text-slate-300'}`}>{Number(player.points || 0).toLocaleString()}</span>
                  <span className={`w-8 text-right ${sortField === 'eliminations' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(player.eliminations || 0)}</span>
                  <span className={`w-8 text-right ${sortField === 'kills' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(player.kills || 0)}</span>
                  <span className={`w-8 text-right ${sortField === 'assists' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(player.assists || 0)}</span>
                  <span className={`w-8 text-right ${sortField === 'redeploys' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(player.redeploys || 0)}</span>
                  <span className={`w-12 text-right ${sortField === 'damage' ? 'text-amber-200 font-bold' : 'text-slate-400'}`}>{Number(player.damage || 0).toLocaleString()}</span>
                  <span className={`w-8 text-right ${sortField === 'matches' ? 'text-amber-200 font-bold' : 'text-slate-500'}`}>{Number(player.matches || 0)}</span>
                </div>
              );
            })}
            {sortedPlayers.length === 0 && <div className="text-center text-slate-500 text-xs py-4">Sin datos todavía.</div>}
          </div>
        </div>
      )}
    </section>
  );
}

function CompactRanking({
  rows,
  rowNameKey,
  rowIdKey = 'id',
  highlightId,
  sortFields,
}: {
  rows: any[];
  rowNameKey: string;
  rowIdKey?: string;
  highlightId?: string | number | null;
  sortFields?: StatField[];
}) {
  const [sortField, setSortField] = useState<StatField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const fields = sortFields || ['score', 'eliminations', 'kills', 'assists', 'redeploys', 'damage', 'matches'];

  const handleSort = (field: StatField) => {
    if (field === sortField) {
      setSortDirection((current) => current === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const sortedRows = [...rows].sort((a, b) => {
    const left = Number(a?.[sortField] || 0);
    const right = Number(b?.[sortField] || 0);
    const direction = sortDirection === 'desc' ? -1 : 1;
    return (left - right) * direction;
  });

  return (
    <div className="space-y-2">
      <SortChips fields={fields} sortField={sortField} sortDirection={sortDirection} onChange={handleSort} />
      <div className="border-b border-white/6 pb-1 mb-2 flex items-center gap-3 text-[9px] uppercase tracking-[0.16em] text-slate-500 px-1">
        <span className="w-6">Pos</span>
        <span className="flex-1">Nombre</span>
        <span className="w-12 text-right">Kills</span>
        <span className="w-16 text-right">Daño</span>
        <span className="w-14 text-right">Pts</span>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {sortedRows.map((row, index) => {
          const rowId = row?.[rowIdKey];
          const isHighlighted = highlightId !== undefined && highlightId !== null && String(rowId) === String(highlightId);
          return (
            <div
              key={rowId || index}
              className={`flex items-center gap-3 rounded-lg border px-2 py-1.5 text-xs ${
                isHighlighted ? 'border-amber-400/50 bg-amber-500/15' : 'border-white/6 bg-white/[0.02]'
              }`}
            >
              <span className={`font-black w-6 ${index < 3 ? 'text-amber-300' : 'text-slate-500'}`}>{index + 1}</span>
              <span className="font-bold text-slate-200 flex-1 truncate">{row?.[rowNameKey]}</span>
              <span className="w-12 text-right text-slate-400">{Number(row?.kills || 0)}</span>
              <span className="w-16 text-right text-slate-400">{Number(row?.damage || 0).toLocaleString()}</span>
              <span className="w-14 text-right font-black text-amber-300">{Number(row?.[sortField] || 0).toLocaleString()}</span>
            </div>
          );
        })}
        {sortedRows.length === 0 && <div className="text-center text-slate-500 text-xs py-4">Sin datos todavía.</div>}
      </div>
    </div>
  );
}

function SquadCard({
  squad,
  isHighlighted = false,
}: {
  squad: any;
  isHighlighted?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isHighlighted);

  return (
    <div className={`rounded-[1.35rem] border overflow-hidden ${isHighlighted ? 'border-amber-400/30 bg-amber-500/10' : 'border-white/8 bg-white/[0.03]'}`}>
      <button onClick={() => setIsOpen((value) => !value)} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">{squad.name}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {isHighlighted ? 'Mi squad' : 'Squad'} • {Number(squad.members_count || squad.members?.length || 0)} players
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Puntos</div>
              <div className="text-lg font-black text-amber-200">{Number(squad.points || 0).toLocaleString()}</div>
            </div>
            {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 text-xs">
          <div><span className="text-slate-500">Kills </span><span className="font-bold text-white">{squad.kills}</span></div>
          <div><span className="text-slate-500">Daño </span><span className="font-bold text-white">{Number(squad.damage || 0).toLocaleString()}</span></div>
          <div><span className="text-slate-500">Asist. </span><span className="font-bold text-white">{Number(squad.assists || 0).toLocaleString()}</span></div>
          <div><span className="text-slate-500">Part. </span><span className="font-bold text-white">{squad.matches}</span></div>
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-white/6 bg-black/20 px-4 py-3">
          <div className="space-y-2">
            {(squad.members || []).map((member: any) => (
              <div key={member.google_id} className="rounded-[1rem] border border-white/6 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{member.gamertag}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{member.matches} partidas</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Pts</div>
                    <div className="font-black text-amber-200">{Number(member.points || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-500">Kills </span><span className="font-bold text-white">{member.kills}</span></div>
                  <div><span className="text-slate-500">Daño </span><span className="font-bold text-white">{Number(member.damage || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-500">Asist. </span><span className="font-bold text-white">{Number(member.assists || 0).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SquadCardsSection({
  title,
  subtitle,
  squads,
  highlightId,
}: {
  title: string;
  subtitle: string;
  squads: any[];
  highlightId?: number | null;
}) {
  return (
    <section className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-5 space-y-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{subtitle}</div>
        <h3 className="mt-2 text-lg font-black text-white">{title}</h3>
      </div>
      <div className="grid gap-3">
        {squads.map((squad: any) => (
          <div key={squad.id}>
            <SquadCard squad={squad} isHighlighted={Number(highlightId) === Number(squad.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SquadOverviewCards({ snapshot }: { snapshot: any }) {
  const mySquad = snapshot?.my_squad;

  return (
    <section className="rounded-[1.7rem] border border-amber-400/20 bg-[#0B0E14] p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Torneo actual</div>
          <h2 className="mt-2 text-2xl font-black text-white">{snapshot?.competition?.name}</h2>
        </div>
        <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {mySquad ? 'Con squad' : 'Esperando sorteo'}
        </div>
      </div>

      {mySquad ? (
        <>
          <SquadCardsSection
            title="Squads del torneo"
            subtitle="Actual"
            squads={snapshot?.standings?.teams || []}
            highlightId={mySquad.id}
          />
        </>
      ) : (
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.04] p-4 text-sm text-slate-400">
          Estás dentro del torneo. Falta cierre de lobby y sorteo.
        </div>
      )}
    </section>
  );
}

function TournamentArchiveCard({ snapshot, userId }: { snapshot: any; userId: string }) {
  if (!snapshot) {
    return <div className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-6 text-sm text-slate-500">Selecciona un torneo pasado.</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-5 space-y-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Torneo pasado</div>
          <h2 className="mt-2 text-2xl font-black text-white">{snapshot.competition?.name}</h2>
        </div>
        <StatCards summary={snapshot.my_team_summary || {}} />
      </section>

      <SquadCardsSection
        title="Resultados generales por squads"
        subtitle="Histórico"
        squads={snapshot.standings?.teams || []}
        highlightId={snapshot.my_squad?.id}
      />

      <RankingSection
        teams={snapshot.standings?.teams || []}
        players={snapshot.standings?.players || []}
        teamHighlightId={snapshot.my_squad?.id}
        playerHighlightId={userId}
      />
    </div>
  );
}

export default function PlayerDashboard({ userId, activeTab, onTabChange }: PlayerDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [leagueMode, setLeagueMode] = useState<LeagueMode>('current');
  const [selectedPastTournamentId, setSelectedPastTournamentId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/player/dashboard/${encodeURIComponent(userId)}`);
        const nextData = await response.json();
        if (cancelled) return;
        setData(nextData);

        const availableTabs = (nextData?.tabs || []).map((tab: any) => tab.id);
        if (!availableTabs.includes(activeTab)) {
          onTabChange(availableTabs[0] || 'career');
        }

        const firstLeagueId = nextData?.leagues?.[0]?.competition?.id || null;
        setSelectedLeagueId((current) => current ?? firstLeagueId);
      } catch (error) {
        console.error('Failed to fetch player dashboard', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const league = (data?.leagues || []).find((item: any) => Number(item.competition?.id) === Number(selectedLeagueId));
    if (!league) return;
    const firstPastId = league.past_tournaments?.[0]?.competition?.id || null;
    setSelectedPastTournamentId(firstPastId);
    setLeagueMode(league.current_tournament ? 'current' : 'past');
  }, [selectedLeagueId, data]);

  if (isLoading) {
    return <div className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-8 text-center text-sm text-slate-500">Cargando dashboard del player...</div>;
  }

  const tabs = data?.tabs || [
    { id: 'career', label: 'Carrera', type: 'CAREER' },
    { id: 'league', label: 'Ligas', type: 'LIGA' },
  ];
  const leagues = data?.leagues || [];
  const selectedLeague = leagues.find((item: any) => Number(item.competition?.id) === Number(selectedLeagueId)) || leagues[0] || null;
  const selectedPastTournament = selectedLeague?.past_tournaments?.find((item: any) => Number(item.competition?.id) === Number(selectedPastTournamentId))
    || selectedLeague?.past_tournaments?.[0]
    || null;

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 rounded-[1.2rem] px-4 py-3 text-left transition-colors ${
                activeTab === tab.id ? 'bg-amber-500/12 text-white border border-amber-400/20' : 'bg-white/[0.03] text-slate-400 border border-white/6'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em]">{tab.type || tab.id}</div>
              <div className="mt-1 text-sm font-bold">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'career' ? (
        <div className="space-y-5">
          <section className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-5 space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Carrera</div>
              <h2 className="mt-2 text-2xl font-black text-white">Progreso individual</h2>
            </div>
            <StatCards summary={data?.career?.summary || {}} />
          </section>

          <section className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-5 space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Historial</div>
              <h3 className="mt-2 text-lg font-black text-white">Tus últimas partidas</h3>
            </div>
            <div className="space-y-3">
              {(data?.career?.recent_matches || []).map((match: any) => (
                <div key={`${match.match_id}-${match.date}`} className="rounded-[1.2rem] border border-white/6 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-white">{match.match_id}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(match.date).toLocaleString()} • {match.competition_name} • {match.mode}
                      </div>
                    </div>
                    <div className="text-sm font-black text-amber-200">{Number(match.points || 0).toLocaleString()} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'league' ? (
        selectedLeague ? (
          <div className="space-y-5">
            <section className="rounded-[1.7rem] border border-cyan-400/20 bg-[#0B0E14] p-5 space-y-4">
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Ligas</div>
                    <label className="relative block">
                      <select
                        value={selectedLeague.competition.id}
                        onChange={(event) => setSelectedLeagueId(Number(event.target.value))}
                        className="w-full appearance-none rounded-[1.3rem] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm font-bold text-white focus:outline-none"
                      >
                        {leagues.map((league: any) => (
                          <option key={league.competition.id} value={league.competition.id} className="bg-[#0B0E14] text-white">
                            {league.competition.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    </label>
                  </div>

                  <div className="w-[44%] min-w-[160px] space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Torneos pasados</div>
                    <label className="relative block">
                      <select
                        value={selectedPastTournament?.competition?.id || ''}
                        disabled={(selectedLeague.past_tournaments || []).length === 0}
                        onChange={(event) => {
                          setSelectedPastTournamentId(Number(event.target.value));
                          setLeagueMode('past');
                        }}
                        className="w-full appearance-none rounded-[1.3rem] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm font-bold text-white focus:outline-none disabled:opacity-50"
                      >
                        {(selectedLeague.past_tournaments || []).length === 0 ? (
                          <option value="" className="bg-[#0B0E14] text-white">Sin torneos</option>
                        ) : null}
                        {(selectedLeague.past_tournaments || []).map((tournament: any) => (
                          <option key={tournament.competition.id} value={tournament.competition.id} className="bg-[#0B0E14] text-white">
                            {tournament.competition.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-1">
                  {selectedLeague.current_tournament ? (
                    <button
                      onClick={() => setLeagueMode('current')}
                      className={`rounded-[1.3rem] border p-4 text-left transition-colors ${
                        leagueMode === 'current' ? 'border-amber-400/30 bg-amber-500/10' : 'border-white/8 bg-white/[0.03]'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Torneo actual</div>
                      <div className="mt-2 text-lg font-black text-white">{selectedLeague.current_tournament.competition?.name}</div>
                    </button>
                  ) : (
                    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-500">
                      No hay torneo actual.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {leagueMode === 'current' && selectedLeague.current_tournament ? (
              <div className="space-y-5">
                <SquadOverviewCards snapshot={selectedLeague.current_tournament} />

                <RankingSection
                  teams={selectedLeague.current_tournament.standings?.teams || []}
                  players={selectedLeague.current_tournament.standings?.players || []}
                  teamHighlightId={selectedLeague.current_tournament.my_squad?.id}
                  playerHighlightId={userId}
                />
              </div>
            ) : null}

            {leagueMode === 'past' ? <TournamentArchiveCard snapshot={selectedPastTournament} userId={userId} /> : null}
          </div>
        ) : (
          <div className="rounded-[1.7rem] border border-white/8 bg-[#0B0E14] p-6 text-sm text-slate-500">No perteneces a ninguna liga.</div>
        )
      ) : null}
    </motion.section>
  );
}
