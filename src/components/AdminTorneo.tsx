import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  CalendarDays,
  Copy,
  Flag,
  Layers3,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Shuffle,
  Trophy,
  Users,
} from 'lucide-react';

type LeagueMode = 'RANDOM' | 'FIXED_SQUAD';
type TournamentScope = 'league' | 'standalone';

interface AdminUser {
  google_id: string;
  role: 'PLAYER' | 'ADMIN' | 'SUPER_ADMIN';
}

interface MembershipRow {
  id: number;
  type: 'LIGA' | 'TORNEO';
  role: 'ADMIN' | 'ORGANIZER' | 'PLAYER';
}

interface AdminTorneoProps {
  currentUser: AdminUser;
  myCompetitions: MembershipRow[];
}

interface LeagueRow {
  id: number;
  name: string;
  status: string;
  invite_code?: string;
  admin_id?: string | null;
  league_mode?: LeagueMode;
}

interface TournamentRow {
  id: number;
  name: string;
  status: string;
  invite_code?: string;
  admin_id?: string | null;
  parent_league_id?: number | null;
  counts_for_league?: number | boolean;
  rules?: string | Record<string, unknown> | null;
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

const parseRules = (rules: TournamentRow['rules']) => {
  if (!rules) return {} as Record<string, unknown>;
  if (typeof rules === 'object') return rules as Record<string, unknown>;
  try {
    return JSON.parse(rules) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
};

const getMatchesPerSeries = (rules: TournamentRow['rules']) => {
  const value = Number(parseRules(rules).matches_per_series || 0);
  return Number.isFinite(value) && value > 0 ? value : 6;
};

export default function AdminTorneo({ currentUser, myCompetitions }: AdminTorneoProps) {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);

  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueDraftName, setLeagueDraftName] = useState('');
  const [leagueDraftMode, setLeagueDraftMode] = useState<LeagueMode>('RANDOM');

  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [tournamentScope, setTournamentScope] = useState<TournamentScope>('league');
  const [tournamentDraftName, setTournamentDraftName] = useState('');
  const [countsForLeague, setCountsForLeague] = useState(true);
  const [matchesPerSeries, setMatchesPerSeries] = useState(6);

  const [isEditingLeague, setIsEditingLeague] = useState(false);
  const [leagueEditName, setLeagueEditName] = useState('');
  const [leagueEditMode, setLeagueEditMode] = useState<LeagueMode>('RANDOM');

  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [tournamentEditName, setTournamentEditName] = useState('');
  const [tournamentEditCounts, setTournamentEditCounts] = useState(true);
  const [tournamentEditMatches, setTournamentEditMatches] = useState(6);

  const [squadSize, setSquadSize] = useState(4);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [participants, setParticipants] = useState<Array<{
    google_id: string;
    gamertag: string;
    avatar_url?: string;
    role: 'ADMIN' | 'ORGANIZER' | 'PLAYER';
    status: 'ACTIVE' | 'LEFT' | 'BANNED';
  }>>([]);
  const [targetParticipants, setTargetParticipants] = useState(16);

  const managedCompetitionIds = useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') return null;
    return new Set(
      myCompetitions
        .filter((item) => item.role === 'ADMIN' || item.role === 'ORGANIZER')
        .map((item) => item.id),
    );
  }, [currentUser.role, myCompetitions]);

  const visibleLeagues = useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') return leagues;
    return leagues.filter((league) =>
      managedCompetitionIds?.has(league.id) || league.admin_id === currentUser.google_id,
    );
  }, [currentUser.google_id, currentUser.role, leagues, managedCompetitionIds]);

  const visibleLeagueIds = useMemo(
    () => new Set(visibleLeagues.map((league) => league.id)),
    [visibleLeagues],
  );

  const visibleStandaloneTournaments = useMemo(() => {
    const base = tournaments.filter((tournament) => !tournament.parent_league_id);
    if (currentUser.role === 'SUPER_ADMIN') return base;
    return base.filter((tournament) =>
      managedCompetitionIds?.has(tournament.id) || tournament.admin_id === currentUser.google_id,
    );
  }, [currentUser.google_id, currentUser.role, managedCompetitionIds, tournaments]);

  const filteredTournaments = useMemo(() => {
    const base = tournaments.filter((tournament) => tournament.parent_league_id === selectedLeagueId);
    if (currentUser.role === 'SUPER_ADMIN') return base;
    return base.filter((tournament) =>
      visibleLeagueIds.has(Number(tournament.parent_league_id)) ||
      managedCompetitionIds?.has(tournament.id) ||
      tournament.admin_id === currentUser.google_id,
    );
  }, [currentUser.google_id, currentUser.role, managedCompetitionIds, selectedLeagueId, tournaments, visibleLeagueIds]);

  const selectedLeague = useMemo(
    () => visibleLeagues.find((league) => league.id === selectedLeagueId) || null,
    [selectedLeagueId, visibleLeagues],
  );

  const selectedTournament = useMemo(() => {
    const pool = [...filteredTournaments, ...visibleStandaloneTournaments];
    return pool.find((tournament) => tournament.id === selectedTournamentId) || null;
  }, [filteredTournaments, selectedTournamentId, visibleStandaloneTournaments]);

  const loadCompetitions = async () => {
    setIsLoadingData(true);
    try {
      const [leaguesRes, tournamentsRes] = await Promise.all([
        fetch('/api/leagues'),
        fetch('/api/tournaments'),
      ]);
      const leaguesData = (await leaguesRes.json()) as LeagueRow[];
      const tournamentsData = (await tournamentsRes.json()) as TournamentRow[];

      setLeagues(Array.isArray(leaguesData) ? leaguesData : []);
      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
    } catch (e) {
      console.error('Error loading competitions', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadOverview = async (leagueId?: number | null, tournamentId?: number | null) => {
    try {
      const qs = new URLSearchParams();
      const resolvedLeagueId = leagueId ?? selectedLeagueId;
      const resolvedTournamentId = tournamentId ?? selectedTournamentId;
      if (resolvedLeagueId) qs.set('league_id', String(resolvedLeagueId));
      if (resolvedTournamentId) qs.set('tournament_id', String(resolvedTournamentId));

      const res = await fetch(`/api/admin/overview?${qs.toString()}`);
      const data = await res.json();
      if (!data.error) setOverview(data as OverviewResponse);
    } catch (e) {
      console.error('Error loading admin overview', e);
    }
  };

  const loadParticipants = async (competitionId?: number | null) => {
    const id = competitionId ?? selectedTournamentId;
    if (!id) {
      setParticipants([]);
      return;
    }
    try {
      const res = await fetch(`/api/competitions/${id}/participants`);
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading participants', e);
    }
  };

  const hydrateLeagueEditor = (league: LeagueRow | null) => {
    setLeagueEditName(league?.name || '');
    setLeagueEditMode(league?.league_mode || 'RANDOM');
  };

  const hydrateTournamentEditor = (tournament: TournamentRow | null) => {
    setTournamentEditName(tournament?.name || '');
    setTournamentEditCounts(Boolean(tournament?.counts_for_league));
    setTournamentEditMatches(getMatchesPerSeries(tournament?.rules));
  };

  const copyInviteLink = async (inviteCode?: string) => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/?join=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copiado al portapapeles.');
    } catch {
      alert(link);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (!visibleLeagues.length) {
      setSelectedLeagueId(null);
      return;
    }

    if (!selectedLeagueId || !visibleLeagues.some((league) => league.id === selectedLeagueId)) {
      setSelectedLeagueId(visibleLeagues[0].id);
    }
  }, [selectedLeagueId, visibleLeagues]);

  useEffect(() => {
    const allVisibleTournamentIds = new Set([
      ...filteredTournaments.map((tournament) => tournament.id),
      ...visibleStandaloneTournaments.map((tournament) => tournament.id),
    ]);

    if (!allVisibleTournamentIds.size) {
      setSelectedTournamentId(null);
      return;
    }

    if (!selectedTournamentId || !allVisibleTournamentIds.has(selectedTournamentId)) {
      setSelectedTournamentId(filteredTournaments[0]?.id || visibleStandaloneTournaments[0]?.id || null);
    }
  }, [filteredTournaments, selectedTournamentId, visibleStandaloneTournaments]);

  useEffect(() => {
    hydrateLeagueEditor(selectedLeague);
    setIsEditingLeague(false);
  }, [selectedLeague]);

  useEffect(() => {
    hydrateTournamentEditor(selectedTournament);
    setIsEditingTournament(false);
  }, [selectedTournament]);

  useEffect(() => {
    loadOverview();
  }, [selectedLeagueId, selectedTournamentId]);

  useEffect(() => {
    loadParticipants();
    if (!selectedTournamentId) return;

    const timer = setInterval(() => {
      loadParticipants(selectedTournamentId);
    }, 8000);

    return () => clearInterval(timer);
  }, [selectedTournamentId]);

  useEffect(() => {
    if (tournamentScope === 'standalone') {
      setCountsForLeague(false);
    } else {
      setCountsForLeague(true);
    }
  }, [tournamentScope]);

  const handleCreateLeague = async () => {
    if (!leagueDraftName.trim()) return alert('Escribe nombre de liga.');

    setIsSaving(true);
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: currentUser.google_id,
          name: leagueDraftName.trim(),
          league_mode: leagueDraftMode,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setLeagueDraftName('');
      setShowCreateLeague(false);
      await loadCompetitions();
      setSelectedLeagueId(Number(data.id));
    } catch (e) {
      alert(`Error al crear liga: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLeague = async () => {
    if (!selectedLeagueId) return;
    if (!leagueEditName.trim()) return alert('Escribe nombre de liga.');

    setIsSaving(true);
    try {
      const res = await fetch(`/api/competitions/${selectedLeagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leagueEditName.trim(),
          league_mode: leagueEditMode,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setIsEditingLeague(false);
      await loadCompetitions();
      await loadOverview(selectedLeagueId, selectedTournamentId);
    } catch (e) {
      alert(`Error al editar liga: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!tournamentDraftName.trim()) return alert('Escribe nombre del torneo.');
    if (tournamentScope === 'league' && !selectedLeagueId) return alert('Selecciona una liga.');

    setIsSaving(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: currentUser.google_id,
          name: tournamentDraftName.trim(),
          type: 'TORNEO',
          parent_league_id: tournamentScope === 'league' ? selectedLeagueId : null,
          counts_for_league: tournamentScope === 'league' ? countsForLeague : false,
          rules: { matches_per_series: matchesPerSeries },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTournamentDraftName('');
      setShowCreateTournament(false);
      await loadCompetitions();
      setSelectedTournamentId(Number(data.id));
    } catch (e) {
      alert(`Error al crear torneo: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTournament = async () => {
    if (!selectedTournamentId) return;
    if (!tournamentEditName.trim()) return alert('Escribe nombre del torneo.');

    setIsSaving(true);
    try {
      const res = await fetch(`/api/competitions/${selectedTournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentEditName.trim(),
          counts_for_league: tournamentEditCounts,
          matches_per_series: tournamentEditMatches,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setIsEditingTournament(false);
      await loadCompetitions();
      await loadOverview(selectedLeagueId, selectedTournamentId);
    } catch (e) {
      alert(`Error al editar torneo: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraft = async () => {
    if (!selectedTournamentId) return alert('Selecciona torneo activo.');

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
      await loadParticipants(selectedTournamentId);
    } catch (e) {
      alert(`Error en draft: ${(e as Error).message}`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleResetSquads = async () => {
    if (!selectedTournamentId) return alert('Selecciona torneo activo.');
    if (!confirm('¿Eliminar todos los squads del torneo activo?')) return;

    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/reset-squads`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`Reset completado. Squads eliminados: ${data.removed_squads}`);
      await loadOverview(selectedLeagueId, selectedTournamentId);
      await loadParticipants(selectedTournamentId);
    } catch (e) {
      alert(`Error al resetear squads: ${(e as Error).message}`);
    }
  };

  const summaryCards = [
    { label: 'Ligas visibles', value: visibleLeagues.length, accent: 'text-cyan-300' },
    { label: 'Torneos visibles', value: filteredTournaments.length + visibleStandaloneTournaments.length, accent: 'text-purple-300' },
    { label: 'Players', value: overview?.stats?.players_count ?? 0, accent: 'text-emerald-300' },
    { label: 'Kills hoy', value: overview?.stats?.kills_today ?? 0, accent: 'text-amber-300' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 bg-[#050505] min-h-screen text-slate-300"
    >
      <header className="flex flex-col gap-4 border-b border-white/5 pb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/20">
              <Layers3 className="text-cyan-300" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Panel de Ligas y Torneos</h1>
              <p className="text-xs text-slate-500">Primero eliges contexto, luego operas. Sin mezclar creacion, lobby y draft en el mismo bloque.</p>
            </div>
          </div>

          <button
            onClick={() => {
              loadCompetitions();
              loadOverview();
            }}
            disabled={isLoadingData}
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-black disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCcw size={14} /> {isLoadingData ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-[#0B0E14] p-4">
              <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">{card.label}</div>
              <div className={`mt-2 text-2xl font-black ${card.accent}`}>{card.value}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0B0E14] p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Mis ligas</h2>
                <p className="text-[11px] text-slate-500">Administra una liga existente antes de crear otra.</p>
              </div>
              <button
                onClick={() => setShowCreateLeague((value) => !value)}
                className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300"
                title="Nueva liga"
              >
                <PlusCircle size={16} />
              </button>
            </div>

            {showCreateLeague && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3 space-y-3">
                <input
                  value={leagueDraftName}
                  onChange={(e) => setLeagueDraftName(e.target.value)}
                  placeholder="Ej. Liga Rebirth Abril"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeagueDraftMode('RANDOM')}
                    className={`py-2 rounded-xl text-xs font-bold border ${leagueDraftMode === 'RANDOM' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                  >
                    Aleatoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeagueDraftMode('FIXED_SQUAD')}
                    className={`py-2 rounded-xl text-xs font-bold border ${leagueDraftMode === 'FIXED_SQUAD' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
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
              </div>
            )}

            {visibleLeagues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-slate-500">
                No tienes ligas asignadas. Crea la primera desde aqui.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleLeagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => setSelectedLeagueId(league.id)}
                    className={`w-full text-left rounded-2xl border p-3 transition-colors ${selectedLeagueId === league.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white">{league.name}</div>
                        <div className="text-[11px] text-slate-400">{league.league_mode || 'RANDOM'} · {league.status}</div>
                      </div>
                      <span className="text-[10px] font-black text-cyan-300">#{league.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B0E14] p-4 space-y-4">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Torneos standalone</h2>
              <p className="text-[11px] text-slate-500">No suman a liga ni carrera. Inician y terminan solos.</p>
            </div>

            {visibleStandaloneTournaments.length === 0 ? (
              <div className="text-xs text-slate-500">No hay torneos standalone visibles.</div>
            ) : (
              <div className="space-y-2">
                {visibleStandaloneTournaments.map((tournament) => (
                  <button
                    key={tournament.id}
                    onClick={() => setSelectedTournamentId(tournament.id)}
                    className={`w-full text-left rounded-2xl border p-3 transition-colors ${selectedTournamentId === tournament.id ? 'border-purple-400/40 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white">{tournament.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Standalone · {getMatchesPerSeries(tournament.rules)} partidas
                        </div>
                      </div>
                      <Flag size={14} className="text-purple-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 2xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-black text-white">Liga seleccionada</h2>
                  <p className="text-xs text-slate-500">Aqui editas la liga actual. Si algo falla, corriges la misma en vez de crear otra.</p>
                </div>
                {selectedLeague && (
                  <button
                    onClick={() => setIsEditingLeague((value) => !value)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-white flex items-center gap-2"
                  >
                    <Pencil size={14} /> {isEditingLeague ? 'Cancelar' : 'Editar liga'}
                  </button>
                )}
              </div>

              {!selectedLeague ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                  Selecciona una liga del panel izquierdo.
                </div>
              ) : isEditingLeague ? (
                <div className="space-y-3">
                  <input
                    value={leagueEditName}
                    onChange={(e) => setLeagueEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeagueEditMode('RANDOM')}
                      className={`py-2 rounded-xl text-xs font-bold border ${leagueEditMode === 'RANDOM' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    >
                      Aleatoria
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeagueEditMode('FIXED_SQUAD')}
                      className={`py-2 rounded-xl text-xs font-bold border ${leagueEditMode === 'FIXED_SQUAD' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    >
                      Squad fijo
                    </button>
                  </div>
                  <button
                    onClick={handleUpdateLeague}
                    disabled={isSaving}
                    className="w-full bg-cyan-400 text-black py-2 rounded-xl text-xs font-black disabled:opacity-50"
                  >
                    Guardar cambios
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Nombre</div>
                    <div className="mt-2 text-base font-bold text-white">{selectedLeague.name}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Modo</div>
                    <div className="mt-2 text-base font-bold text-white">{selectedLeague.league_mode || 'RANDOM'}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Invitacion</div>
                    <button
                      onClick={() => copyInviteLink(selectedLeague.invite_code)}
                      className="mt-2 text-left text-sm font-bold text-cyan-300 flex items-center gap-2"
                    >
                      <Copy size={14} /> {selectedLeague.invite_code || 'SIN_CODIGO'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-white">Nuevo torneo</h2>
                  <p className="text-xs text-slate-500">Puedes crearlo para una liga o como standalone.</p>
                </div>
                <button
                  onClick={() => setShowCreateTournament((value) => !value)}
                  className="p-2 rounded-xl bg-purple-500/10 border border-purple-400/20 text-purple-300"
                  title="Nuevo torneo"
                >
                  <PlusCircle size={16} />
                </button>
              </div>

              {showCreateTournament ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTournamentScope('league')}
                      className={`py-2 rounded-xl text-xs font-bold border ${tournamentScope === 'league' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    >
                      En liga
                    </button>
                    <button
                      type="button"
                      onClick={() => setTournamentScope('standalone')}
                      className={`py-2 rounded-xl text-xs font-bold border ${tournamentScope === 'standalone' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    >
                      Standalone
                    </button>
                  </div>

                  {tournamentScope === 'league' && (
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-slate-400">
                      Liga destino: <span className="font-bold text-white">{selectedLeague?.name || 'Selecciona una liga'}</span>
                    </div>
                  )}

                  <input
                    value={tournamentDraftName}
                    onChange={(e) => setTournamentDraftName(e.target.value)}
                    placeholder="Ej. Dia 03 - Relampago"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400">Partidas</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={matchesPerSeries}
                        onChange={(e) => setMatchesPerSeries(Number(e.target.value) || 6)}
                        className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={countsForLeague}
                          disabled={tournamentScope === 'standalone'}
                          onChange={(e) => setCountsForLeague(e.target.checked)}
                        />
                        Suma a liga
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateTournament}
                    disabled={isSaving || (tournamentScope === 'league' && !selectedLeagueId)}
                    className="w-full bg-white text-black py-2 rounded-xl text-xs font-black disabled:opacity-50"
                  >
                    Crear torneo
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                  Abre esta tarjeta para crear torneos sin tocar la liga actual.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_0.95fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-black text-white">Torneos de la liga</h2>
                  <p className="text-xs text-slate-500">Solo se muestran los torneos ligados a la liga seleccionada.</p>
                </div>
                {selectedLeague && (
                  <div className="text-xs text-slate-400">
                    Liga activa: <span className="font-bold text-white">{selectedLeague.name}</span>
                  </div>
                )}
              </div>

              {filteredTournaments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                  Esta liga todavia no tiene torneos.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTournaments.map((tournament) => (
                    <button
                      key={tournament.id}
                      onClick={() => setSelectedTournamentId(tournament.id)}
                      className={`text-left rounded-2xl border p-4 transition-colors ${selectedTournamentId === tournament.id ? 'border-purple-400/40 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-white">{tournament.name}</div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {Boolean(tournament.counts_for_league) ? 'Cuenta para liga' : 'No cuenta para liga'}
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-purple-300">#{tournament.id}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{getMatchesPerSeries(tournament.rules)} partidas</span>
                        <span>{tournament.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-black text-white">Torneo seleccionado</h2>
                  <p className="text-xs text-slate-500">Edita o ejecuta el torneo actual sin perder contexto.</p>
                </div>
                {selectedTournament && (
                  <button
                    onClick={() => setIsEditingTournament((value) => !value)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-white flex items-center gap-2"
                  >
                    <Pencil size={14} /> {isEditingTournament ? 'Cancelar' : 'Editar torneo'}
                  </button>
                )}
              </div>

              {!selectedTournament ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                  Selecciona un torneo de la liga o uno standalone.
                </div>
              ) : isEditingTournament ? (
                <div className="space-y-3">
                  <input
                    value={tournamentEditName}
                    onChange={(e) => setTournamentEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400">Partidas</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={tournamentEditMatches}
                        onChange={(e) => setTournamentEditMatches(Number(e.target.value) || 6)}
                        className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={tournamentEditCounts}
                          disabled={!selectedTournament.parent_league_id}
                          onChange={(e) => setTournamentEditCounts(e.target.checked)}
                        />
                        Suma a liga
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateTournament}
                    disabled={isSaving}
                    className="w-full bg-purple-500 text-white py-2 rounded-xl text-xs font-black disabled:opacity-50"
                  >
                    Guardar torneo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Tipo</div>
                    <div className="mt-2 text-base font-bold text-white">
                      {selectedTournament.parent_league_id ? 'Torneo de liga' : 'Standalone'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Invitacion</div>
                    <button
                      onClick={() => copyInviteLink(selectedTournament.invite_code)}
                      className="mt-2 text-left text-sm font-bold text-purple-300 flex items-center gap-2"
                    >
                      <Copy size={14} /> {selectedTournament.invite_code || 'SIN_CODIGO'}
                    </button>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Formato</div>
                    <div className="mt-2 text-base font-bold text-white">
                      {getMatchesPerSeries(selectedTournament.rules)} partidas
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Score</div>
                    <div className="mt-2 text-base font-bold text-white">
                      {selectedTournament.parent_league_id && Boolean(selectedTournament.counts_for_league) ? 'Cuenta a liga' : 'Independiente'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[0.95fr_1.05fr] gap-6">
            <section className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-emerald-400" />
                <h3 className="font-black text-white">Operacion del torneo</h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSquadSize(size)}
                    className={`py-2 rounded-xl text-xs font-bold border ${squadSize === size ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                  >
                    Squad {size}
                  </button>
                ))}
              </div>

              <button
                onClick={handleDraft}
                disabled={!selectedTournamentId || isDrafting}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Shuffle size={14} /> {isDrafting ? 'Generando...' : 'Generar squads'}
              </button>

              <button
                onClick={handleResetSquads}
                disabled={!selectedTournamentId}
                className="w-full bg-red-600/20 border border-red-500/40 text-red-300 py-3 rounded-xl text-xs font-black disabled:opacity-50"
              >
                Reset squads torneo activo
              </button>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-4 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CalendarDays size={14} className="text-emerald-300" />
                  Flujo sugerido
                </div>
                <div>1. Selecciona liga o torneo standalone.</div>
                <div>2. Comparte codigo/link correcto.</div>
                <div>3. Espera lobby y genera squads.</div>
                <div>4. Escanean partidas y revisas actividad.</div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-cyan-300" />
                <h3 className="font-black text-white">Lobby y resumen</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Squads</div>
                  <div className="mt-2 text-xl font-black text-white">{overview?.stats?.squads_in_tournament ?? 0}</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Partidas</div>
                  <div className="mt-2 text-xl font-black text-white">{overview?.stats?.matches_in_tournament ?? 0}</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Participantes</div>
                  <div className="mt-2 text-xl font-black text-white">{participants.length}</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Avg dano</div>
                  <div className="mt-2 text-xl font-black text-white">{overview?.stats?.avg_damage_tournament ?? 0}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-slate-300">
                  Participantes activos: <span className="font-black text-white">{participants.length}</span> / {targetParticipants}
                </div>
                <input
                  type="number"
                  min={2}
                  max={200}
                  value={targetParticipants}
                  onChange={(e) => setTargetParticipants(Number(e.target.value) || 16)}
                  className="w-24 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs"
                />
              </div>

              {selectedTournament?.invite_code && (
                <button
                  onClick={() => copyInviteLink(selectedTournament.invite_code)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-xs text-slate-300 flex items-center gap-2"
                >
                  <Copy size={14} className="text-cyan-300" />
                  {window.location.origin}/?join={selectedTournament.invite_code}
                </button>
              )}

              {participants.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">Nadie en lobby aun. Comparte el link/codigo del torneo correcto.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {participants.map((participant) => (
                    <div key={participant.google_id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="text-sm font-semibold text-white truncate">{participant.gamertag}</div>
                      <div className="text-[10px] text-slate-400">{participant.role}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-white/10 bg-[#0B0E14] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-purple-400" />
              <h3 className="font-bold text-white text-sm">Actividad reciente real</h3>
            </div>

            {(overview?.recent_activity || []).length === 0 ? (
              <div className="text-xs text-slate-500 py-6">Sin actividad aun para el torneo seleccionado.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {(overview?.recent_activity || []).map((item, idx) => (
                  <div key={`${item.match_id}-${idx}`} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="text-sm text-white font-semibold">Match {item.match_id}</div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      {item.total_kills} kills / {item.total_points} pts
                    </div>
                    <div className="text-[11px] text-slate-500">by {item.submitted_by}</div>
                    <div className="mt-2 text-[10px] text-slate-500">{new Date(item.processed_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </motion.div>
  );
}
