import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, Shuffle, RefreshCcw, CalendarDays, Activity } from 'lucide-react';

type LeagueMode = 'RANDOM' | 'FIXED_SQUAD';

interface LeagueRow {
  id: number;
  name: string;
  status: string;
  league_mode?: LeagueMode;
}

interface TournamentRow {
  id: number;
  name: string;
  status: string;
  parent_league_id?: number | null;
  counts_for_league?: number | boolean;
}

interface OverviewResponse {
  league: {
    id: number;
    name: string;
    status: string;
    league_mode: LeagueMode;
  } | null;
  tournament: {
    id: number;
    name: string;
    status: string;
    target_matches?: number;
  } | null;
  stats: {
    leagues_count: number;
    tournaments_count: number;
    players_count: number;
    squads_in_tournament: number;
    matches_in_tournament: number;
    kills_today: number;
    avg_damage_tournament: number;
  };
  recent_activity: Array<{
    match_id: string;
    processed_at: string;
    submitted_by: string;
    total_kills: number;
    total_points: number;
  }>;
}

export default function AdminTorneo() {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);

  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueMode, setNewLeagueMode] = useState<LeagueMode>('RANDOM');

  const [newTournamentName, setNewTournamentName] = useState('');
  const [countsForLeague, setCountsForLeague] = useState(true);
  const [matchesPerSeries, setMatchesPerSeries] = useState(6);

  const [squadSize, setSquadSize] = useState(4);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  const filteredTournaments = useMemo(() => {
    if (!selectedLeagueId) return tournaments;
    return tournaments.filter((t) => t.parent_league_id === selectedLeagueId);
  }, [tournaments, selectedLeagueId]);

  const selectedLeague = useMemo(
    () => leagues.find((l) => l.id === selectedLeagueId) || null,
    [leagues, selectedLeagueId]
  );

  const loadCompetitions = async () => {
    setIsLoadingData(true);
    try {
      const [leaguesRes, tournamentsRes] = await Promise.all([
        fetch('/api/leagues'),
        fetch('/api/tournaments'),
      ]);
      const leaguesData = (await leaguesRes.json()) as LeagueRow[];
      const tournamentsData = (await tournamentsRes.json()) as TournamentRow[];

      setLeagues(leaguesData || []);
      setTournaments(tournamentsData || []);

      const fallbackLeagueId = selectedLeagueId ?? leaguesData?.[0]?.id ?? null;
      setSelectedLeagueId(fallbackLeagueId);

      if (fallbackLeagueId) {
        const leagueTournaments = (tournamentsData || []).filter((t) => t.parent_league_id === fallbackLeagueId);
        const stillValid = leagueTournaments.some((t) => t.id === selectedTournamentId);
        setSelectedTournamentId(stillValid ? selectedTournamentId : (leagueTournaments[0]?.id ?? null));
      } else {
        setSelectedTournamentId(null);
      }
    } catch (e) {
      console.error('Error loading competitions', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadOverview = async (leagueId?: number | null, tournamentId?: number | null) => {
    try {
      const qs = new URLSearchParams();
      if (leagueId ?? selectedLeagueId) qs.set('league_id', String(leagueId ?? selectedLeagueId));
      if (tournamentId ?? selectedTournamentId) qs.set('tournament_id', String(tournamentId ?? selectedTournamentId));

      const res = await fetch(`/api/admin/overview?${qs.toString()}`);
      const data = await res.json();
      if (!data.error) setOverview(data as OverviewResponse);
    } catch (e) {
      console.error('Error loading admin overview', e);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    loadOverview();
  }, [selectedLeagueId, selectedTournamentId]);

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) return alert('Escribe nombre de liga.');

    setIsSaving(true);
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeagueName.trim(),
          league_mode: newLeagueMode,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNewLeagueName('');
      await loadCompetitions();
      setSelectedLeagueId(Number(data.id));
      alert(`Liga creada: ${data.name} (${data.league_mode})`);
    } catch (e) {
      alert(`Error al crear liga: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDailyTournament = async () => {
    if (!selectedLeagueId) return alert('Selecciona una liga.');
    if (!newTournamentName.trim()) return alert('Escribe nombre del torneo diario.');

    setIsSaving(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTournamentName.trim(),
          type: 'TORNEO',
          parent_league_id: selectedLeagueId,
          counts_for_league: countsForLeague,
          rules: { matches_per_series: matchesPerSeries },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNewTournamentName('');
      await loadCompetitions();
      setSelectedTournamentId(Number(data.id));
      alert(`Torneo diario creado: ${data.name}`);
    } catch (e) {
      alert(`Error al crear torneo: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraft = async () => {
    if (!selectedTournamentId) return alert('Selecciona torneo diario activo.');

    setIsDrafting(true);
    try {
      const res = await fetch('/api/tournaments/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: selectedTournamentId, squad_size: squadSize }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const sourceInfo = data.source_tournament_id ? `\nClonado desde torneo #${data.source_tournament_id}` : '';
      alert(`Draft listo. Squads: ${data.squads_created}${sourceInfo}`);
      await loadOverview(selectedLeagueId, selectedTournamentId);
    } catch (e) {
      alert(`Error en draft: ${(e as Error).message}`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleResetSquads = async () => {
    if (!selectedTournamentId) return alert('Selecciona torneo diario activo.');
    if (!confirm('¿Eliminar todos los squads del torneo activo?')) return;

    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/reset-squads`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`Reset completado. Squads eliminados: ${data.removed_squads}`);
      await loadOverview(selectedLeagueId, selectedTournamentId);
    } catch (e) {
      alert(`Error al resetear squads: ${(e as Error).message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 bg-[#050505] min-h-screen text-slate-300"
    >
      <header className="flex items-center gap-3 border-b border-white/5 pb-5">
        <Trophy className="text-purple-500" size={28} />
        <div>
          <h1 className="text-2xl font-black text-white">Admin Torneos</h1>
          <p className="text-xs text-slate-500">Operación diaria real: liga -&gt; torneo diario -&gt; draft -&gt; registro.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-[#0B0E14] border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-white text-sm">1) Crear Liga</h2>
          <input
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="Ej. Liga Rebirth Marzo"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewLeagueMode('RANDOM')}
              className={`py-2 rounded-xl text-xs font-bold border ${newLeagueMode === 'RANDOM' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
            >
              Aleatoria
            </button>
            <button
              type="button"
              onClick={() => setNewLeagueMode('FIXED_SQUAD')}
              className={`py-2 rounded-xl text-xs font-bold border ${newLeagueMode === 'FIXED_SQUAD' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
            >
              Squad fijo
            </button>
          </div>
          <button
            onClick={handleCreateLeague}
            disabled={isSaving}
            className="w-full bg-white text-black py-2 rounded-xl text-xs font-black disabled:opacity-50"
          >
            Crear liga
          </button>
        </section>

        <section className="bg-[#0B0E14] border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-white text-sm">2) Torneo Diario</h2>
          <label className="text-xs text-slate-400">Liga activa</label>
          <select
            value={selectedLeagueId ?? ''}
            onChange={(e) => setSelectedLeagueId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecciona liga</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id} className="text-black">
                {league.name} ({league.league_mode || 'RANDOM'})
              </option>
            ))}
          </select>

          <input
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
            placeholder="Ej. Día 03 - Relámpago"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400">Partidas</label>
              <input
                type="number"
                min={1}
                max={20}
                value={matchesPerSeries}
                onChange={(e) => setMatchesPerSeries(Number(e.target.value) || 6)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={countsForLeague}
                  onChange={(e) => setCountsForLeague(e.target.checked)}
                />
                Suma a liga
              </label>
            </div>
          </div>

          <button
            onClick={handleCreateDailyTournament}
            disabled={isSaving || !selectedLeagueId}
            className="w-full bg-purple-600 text-white py-2 rounded-xl text-xs font-black disabled:opacity-50"
          >
            Crear torneo diario
          </button>
        </section>

        <section className="bg-[#0B0E14] border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-white text-sm">3) Operación</h2>
          <label className="text-xs text-slate-400">Torneo activo</label>
          <select
            value={selectedTournamentId ?? ''}
            onChange={(e) => setSelectedTournamentId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecciona torneo</option>
            {filteredTournaments.map((t) => (
              <option key={t.id} value={t.id} className="text-black">
                #{t.id} {t.name}
              </option>
            ))}
          </select>

          <label className="text-xs text-slate-400">Tamaño squad</label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((size) => (
              <button
                key={size}
                onClick={() => setSquadSize(size)}
                className={`py-2 rounded-xl text-xs font-bold border ${squadSize === size ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
              >
                {size}
              </button>
            ))}
          </div>

          <button
            onClick={handleDraft}
            disabled={!selectedTournamentId || isDrafting}
            className="w-full bg-emerald-600 text-white py-2 rounded-xl text-xs font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Shuffle size={14} /> {isDrafting ? 'Generando...' : 'Generar squads'}
          </button>

          <button
            onClick={handleResetSquads}
            disabled={!selectedTournamentId}
            className="w-full bg-red-600/20 border border-red-500/40 text-red-400 py-2 rounded-xl text-xs font-black disabled:opacity-50"
          >
            Reset squads torneo activo
          </button>

          <button
            onClick={() => {
              loadCompetitions();
              loadOverview();
            }}
            disabled={isLoadingData}
            className="w-full bg-white/10 text-white py-2 rounded-xl text-xs font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCcw size={14} /> {isLoadingData ? 'Actualizando...' : 'Actualizar datos'}
          </button>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1 bg-[#0B0E14] border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-white text-sm">Resumen</h3>
          <div className="text-xs text-slate-400">Liga: <span className="text-white font-semibold">{overview?.league?.name || 'N/A'}</span></div>
          <div className="text-xs text-slate-400">Modo: <span className="text-white font-semibold">{overview?.league?.league_mode || selectedLeague?.league_mode || 'RANDOM'}</span></div>
          <div className="text-xs text-slate-400">Torneo: <span className="text-white font-semibold">{overview?.tournament?.name || 'N/A'}</span></div>
          <div className="text-xs text-slate-400">Jugadores: <span className="text-white font-semibold">{overview?.stats?.players_count ?? 0}</span></div>
          <div className="text-xs text-slate-400">Squads torneo: <span className="text-white font-semibold">{overview?.stats?.squads_in_tournament ?? 0}</span></div>
          <div className="text-xs text-slate-400">Partidas torneo: <span className="text-white font-semibold">{overview?.stats?.matches_in_tournament ?? 0}</span></div>
          <div className="text-xs text-slate-400">Kills hoy: <span className="text-white font-semibold">{overview?.stats?.kills_today ?? 0}</span></div>
          <div className="text-xs text-slate-400">Avg daño torneo: <span className="text-white font-semibold">{overview?.stats?.avg_damage_tournament ?? 0}</span></div>
        </section>

        <section className="lg:col-span-2 bg-[#0B0E14] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-purple-400" />
            <h3 className="font-bold text-white text-sm">Actividad reciente real</h3>
          </div>

          {(overview?.recent_activity || []).length === 0 ? (
            <div className="text-xs text-slate-500 py-6">Sin actividad aún para el torneo seleccionado.</div>
          ) : (
            <div className="space-y-2">
              {(overview?.recent_activity || []).map((item, idx) => (
                <div key={`${item.match_id}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-xs text-white font-semibold">Match {item.match_id}</div>
                  <div className="text-[11px] text-slate-400">
                    {item.total_kills} kills / {item.total_points} pts - by {item.submitted_by}
                  </div>
                  <div className="text-[10px] text-slate-500">{new Date(item.processed_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="text-[11px] text-slate-500 flex items-center gap-2">
        <CalendarDays size={14} />
        Flujo recomendado: crear liga -&gt; crear torneo diario -&gt; generar squads -&gt; jugar/subir capturas -&gt; cerrar torneo.
      </div>
    </motion.div>
  );
}
