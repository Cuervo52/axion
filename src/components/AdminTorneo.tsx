import { motion } from 'motion/react';
import { Copy, Plus, Share2, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AdminUser {
  google_id: string;
  role: 'PLAYER' | 'ADMIN' | 'SUPER_ADMIN';
  gamertag?: string;
  avatar_url?: string;
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
  deleted_at?: string | null;
}

interface TournamentRow {
  id: number;
  name: string;
  status: string;
  parent_league_id?: number | null;
  counts_for_league?: number;
  invite_code?: string;
  rules?: string | Record<string, any> | null;
  created_at?: string;
  deleted_at?: string | null;
}

interface EditDraft {
  id: number;
  type: 'LIGA' | 'TORNEO';
  name: string;
  status: 'OPEN' | 'ACTIVE' | 'FINISHED';
  invite_code: string;
  start_date: string;
  end_date: string;
  parent_league_id: number | '';
  counts_for_league: boolean;
  league_mode: 'RANDOM' | 'FIXED_SQUAD';
  game_mode: 'RESURGENCE' | 'BATTLE_ROYALE';
  map_rotation: 'REBIRTH' | 'HAVENS_HOLLOW' | 'MIXTO';
  matches_per_series: number;
}

export default function AdminTorneo({ currentUser, myCompetitions }: AdminTorneoProps) {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | ''>('');
  const [countsForLeague, setCountsForLeague] = useState(true);
  const [tournamentMode, setTournamentMode] = useState<'RESURGENCE' | 'BATTLE_ROYALE'>('RESURGENCE');
  const [tournamentMap, setTournamentMap] = useState<'REBIRTH' | 'HAVENS_HOLLOW' | 'MIXTO'>('REBIRTH');
  const [matchesPerSeries, setMatchesPerSeries] = useState(6);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [trashLeagues, setTrashLeagues] = useState<LeagueRow[]>([]);
  const [trashTournaments, setTrashTournaments] = useState<TournamentRow[]>([]);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const parseRules = (rules: TournamentRow['rules']) => {
    if (!rules) return {} as Record<string, any>;
    if (typeof rules === 'object') return rules as Record<string, any>;
    try {
      return JSON.parse(String(rules));
    } catch {
      return {} as Record<string, any>;
    }
  };

  const formatDateShort = (raw?: string) => {
    if (!raw) return 'N/A';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const loadData = async () => {
    const [leaguesRes, tournamentsRes] = await Promise.all([
      fetch('/api/leagues?include_trashed=1'),
      fetch('/api/tournaments?include_trashed=1'),
    ]);

    const [leaguesData, tournamentsData] = await Promise.all([
      leaguesRes.json(),
      tournamentsRes.json(),
    ]);

    const leagueRows = Array.isArray(leaguesData) ? leaguesData : [];
    const tournamentRows = Array.isArray(tournamentsData) ? tournamentsData : [];

    setLeagues(leagueRows.filter((row: LeagueRow) => !row.deleted_at));
    setTrashLeagues(leagueRows.filter((row: LeagueRow) => Boolean(row.deleted_at)));

    setTournaments(tournamentRows.filter((row: TournamentRow) => !row.deleted_at));
    setTrashTournaments(tournamentRows.filter((row: TournamentRow) => Boolean(row.deleted_at)));
  };

  useEffect(() => {
    loadData().catch((error) => {
      console.error('AdminTorneo load error', error);
      setFeedback('No se pudieron cargar ligas y torneos.');
    });
  }, []);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copiado.`);
    } catch {
      alert(text);
    }
  };

  const shareText = async (title: string, text: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // fallback below
      }
    }
    await copyText(url, title);
  };

  const createLeague = async () => {
    if (!leagueName.trim()) return;
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leagueName.trim(),
          admin_id: currentUser.google_id,
          league_mode: 'RANDOM',
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Error creando liga');

      setLeagueName('');
      setFeedback(`Liga creada: ${data.name}`);
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo crear la liga.');
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!tournamentName.trim()) return;
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentName.trim(),
          type: 'TORNEO',
          admin_id: currentUser.google_id,
          parent_league_id: selectedLeagueId || null,
          counts_for_league: countsForLeague,
          rules: {
            matches_per_series: matchesPerSeries,
            game_mode: tournamentMode,
            map_rotation: tournamentMap,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Error creando torneo');

      setTournamentName('');
      setFeedback(`Torneo creado: ${data.name}`);
      setMatchesPerSeries(6);
      setTournamentMode('RESURGENCE');
      setTournamentMap('REBIRTH');
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo crear el torneo.');
    } finally {
      setLoading(false);
    }
  };

  const toDateInput = (raw?: string | null) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const openEditLeague = (league: LeagueRow & { rules?: string | Record<string, any>; start_date?: string; end_date?: string }) => {
    const rules = parseRules(league.rules || null);
    setEditDraft({
      id: league.id,
      type: 'LIGA',
      name: league.name,
      status: (league.status as any) || 'OPEN',
      invite_code: (league.invite_code || '').toUpperCase(),
      start_date: toDateInput((league as any).start_date),
      end_date: toDateInput((league as any).end_date),
      parent_league_id: '',
      counts_for_league: true,
      league_mode: String(rules.league_mode || 'RANDOM').toUpperCase() === 'FIXED_SQUAD' ? 'FIXED_SQUAD' : 'RANDOM',
      game_mode: 'RESURGENCE',
      map_rotation: 'REBIRTH',
      matches_per_series: Number(rules.matches_per_series || 6),
    });
  };

  const openEditTournament = (tournament: TournamentRow) => {
    const rules = parseRules(tournament.rules);
    setEditDraft({
      id: tournament.id,
      type: 'TORNEO',
      name: tournament.name,
      status: (tournament.status as any) || 'OPEN',
      invite_code: (tournament.invite_code || '').toUpperCase(),
      start_date: toDateInput((tournament as any).start_date),
      end_date: toDateInput((tournament as any).end_date),
      parent_league_id: tournament.parent_league_id ? Number(tournament.parent_league_id) : '',
      counts_for_league: Boolean(tournament.counts_for_league),
      league_mode: 'RANDOM',
      game_mode: String(rules.game_mode || 'RESURGENCE').toUpperCase() === 'BATTLE_ROYALE' ? 'BATTLE_ROYALE' : 'RESURGENCE',
      map_rotation: (['REBIRTH', 'HAVENS_HOLLOW', 'MIXTO'].includes(String(rules.map_rotation || '').toUpperCase())
        ? String(rules.map_rotation).toUpperCase()
        : 'REBIRTH') as 'REBIRTH' | 'HAVENS_HOLLOW' | 'MIXTO',
      matches_per_series: Number(rules.matches_per_series || 6),
    });
  };

  const saveEditCompetition = async () => {
    if (!editDraft) return;
    if (!editDraft.name.trim()) {
      setFeedback('El nombre es obligatorio.');
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const payload: any = {
        name: editDraft.name.trim(),
        status: editDraft.status,
        invite_code: editDraft.invite_code.trim().toUpperCase(),
        start_date: editDraft.start_date || null,
        end_date: editDraft.end_date || null,
      };

      if (editDraft.type === 'LIGA') {
        payload.league_mode = editDraft.league_mode;
      } else {
        payload.parent_league_id = editDraft.parent_league_id || null;
        payload.counts_for_league = editDraft.counts_for_league;
        payload.rules = {
          game_mode: editDraft.game_mode,
          map_rotation: editDraft.map_rotation,
          matches_per_series: editDraft.matches_per_series,
        };
      }

      const res = await fetch(`/api/competitions/${editDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo guardar.');

      setEditDraft(null);
      setFeedback('Competencia actualizada.');
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo guardar.');
    } finally {
      setLoading(false);
    }
  };

  const sendToTrash = async (competitionId: number) => {
    if (!window.confirm('Enviar a papelera?')) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/trash`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo enviar a papelera.');
      setFeedback('Enviado a papelera.');
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo enviar a papelera.');
    } finally {
      setLoading(false);
    }
  };

  const restoreFromTrash = async (competitionId: number) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo restaurar.');
      setFeedback('Competencia restaurada.');
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo restaurar.');
    } finally {
      setLoading(false);
    }
  };

  const deletePermanently = async (competitionId: number) => {
    if (!window.confirm('Eliminar definitivamente? Esta accion NO se puede recuperar.')) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/permanent`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo eliminar definitivamente.');
      setFeedback('Eliminado definitivamente.');
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo eliminar definitivamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="bg-[#0B0E14] border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white">Admin Torneo</h1>
            <p className="text-xs text-slate-500">Gestiona ligas y torneos desde aqui.</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200">
            {myCompetitions.length} membresias
          </div>
        </div>
      </section>

      <section className="bg-[#0B0E14] border border-cyan-400/20 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-cyan-300" size={20} />
          <div>
            <h2 className="text-lg font-black text-white">Crear liga</h2>
            <p className="text-xs text-slate-500">Crea tu liga y comparte el link de ingreso.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <input
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="Nombre de liga"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500">Ejemplo: Liga Nocturna Rebirth.</p>
          </div>
          <button
            onClick={createLeague}
            disabled={loading || !leagueName.trim()}
            className="px-4 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-black text-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Plus size={16} /> Crear
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {leagues.map((league) => {
            const link = `${window.location.origin}/?join=${league.invite_code || ''}`;
            return (
              <div key={league.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="text-white font-bold">{league.name}</div>
                <div className="text-xs text-slate-400">ID {league.id} • {league.status}</div>
                <div className="text-xs text-cyan-300 font-bold">Codigo: {league.invite_code || 'N/A'}</div>
                <div className="flex gap-2">
                  <button onClick={() => copyText(link, 'Link de liga')} className="px-3 py-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 text-xs font-black inline-flex items-center gap-1"><Copy size={13} /> Copiar</button>
                  <button onClick={() => shareText(league.name, 'Unete a la liga en AXION', link)} className="px-3 py-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 text-xs font-black inline-flex items-center gap-1"><Share2 size={13} /> Compartir</button>
                  <button onClick={() => openEditLeague(league as any)} className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-black">Editar</button>
                  <button onClick={() => sendToTrash(league.id)} className="px-3 py-2 rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-black">Papelera</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#0B0E14] border border-purple-400/20 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-purple-300" size={20} />
          <div>
            <h2 className="text-lg font-black text-white">Crear torneo</h2>
            <p className="text-xs text-slate-500">Crea torneos, enlazalos a una liga y comparte invitaciones.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <input
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Nombre de torneo"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500">Nombre visible para los jugadores.</p>
          </div>
          <div>
            <select
              value={tournamentMode}
              onChange={(e) => setTournamentMode((e.target.value as 'RESURGENCE' | 'BATTLE_ROYALE'))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="RESURGENCE">Resurgence</option>
              <option value="BATTLE_ROYALE">Battle Royale</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Define reglas base del tipo de partida.</p>
          </div>
          <div>
            <select
              value={tournamentMap}
              onChange={(e) => setTournamentMap((e.target.value as 'REBIRTH' | 'HAVENS_HOLLOW' | 'MIXTO'))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="REBIRTH">Rebirth</option>
              <option value="HAVENS_HOLLOW">Havens Hollow</option>
              <option value="MIXTO">Mixto</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Selecciona un mapa fijo o mezcla.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <select
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="">Sin liga (independiente)</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Opcional: vincúlalo a una liga existente.</p>
          </div>
          <div>
            <input
              type="number"
              min={1}
              max={20}
              value={matchesPerSeries}
              onChange={(e) => setMatchesPerSeries(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              placeholder="Partidas"
            />
            <p className="mt-1 text-[11px] text-slate-500">Cuántas partidas jugarán en el torneo.</p>
          </div>
          <button
            onClick={createTournament}
            disabled={loading || !tournamentName.trim()}
            className="px-4 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-200 font-black text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Crear torneo
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={countsForLeague} onChange={(e) => setCountsForLeague(e.target.checked)} />
          Cuenta para la liga seleccionada
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tournaments.map((tournament) => {
            const link = `${window.location.origin}/?join=${tournament.invite_code || ''}`;
            const league = leagues.find((row) => Number(row.id) === Number(tournament.parent_league_id));
            const rules = parseRules(tournament.rules);
            const mode = String(rules.game_mode || '').toUpperCase();
            const map = String(rules.map_rotation || '').toUpperCase();
            const matches = Number(rules.matches_per_series || 0);
            return (
              <div key={tournament.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="text-white font-bold">{tournament.name}</div>
                <div className="text-xs text-slate-400">ID {tournament.id} • {tournament.status}</div>
                <div className="text-xs text-slate-400">Creado: {formatDateShort(tournament.created_at)}</div>
                <div className="text-xs text-purple-300 font-bold">Codigo: {tournament.invite_code || 'N/A'}</div>
                <div className="text-xs text-slate-400">Liga: {league?.name || 'Independiente'} • Cuenta: {tournament.counts_for_league ? 'Si' : 'No'}</div>
                <div className="text-xs text-slate-400">Modalidad: {mode || 'N/A'} • Mapa: {map || 'N/A'} • Partidas: {matches || 0}</div>
                <div className="flex gap-2">
                  <button onClick={() => copyText(link, 'Link del torneo')} className="px-3 py-2 rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-200 text-xs font-black inline-flex items-center gap-1"><Copy size={13} /> Copiar</button>
                  <button onClick={() => shareText(tournament.name, 'Unete al torneo en AXION', link)} className="px-3 py-2 rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-200 text-xs font-black inline-flex items-center gap-1"><Share2 size={13} /> Compartir</button>
                  <button onClick={() => openEditTournament(tournament)} className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-black">Editar</button>
                  <button onClick={() => sendToTrash(tournament.id)} className="px-3 py-2 rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-black">Papelera</button>
                </div>
              </div>
            );
          })}
        </div>

        {feedback ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {feedback}
          </div>
        ) : null}
      </section>

      <section className="bg-[#0B0E14] border border-red-400/20 rounded-3xl p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">Papelera</h2>
          <p className="text-xs text-slate-500">Desde aquí puedes restaurar o eliminar definitivamente. Si se elimina definitivamente no se puede recuperar en app.</p>
        </div>

        <div className="space-y-2">
          {[...trashLeagues, ...trashTournaments].map((row: any) => (
            <div key={`${row.type || 'COMP'}-${row.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">{row.name}</div>
                <div className="text-xs text-slate-400">ID {row.id} • {row.type || (row.parent_league_id ? 'TORNEO' : 'LIGA')} • En papelera</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => restoreFromTrash(row.id)} className="px-3 py-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 text-xs font-black">Restaurar</button>
                <button onClick={() => deletePermanently(row.id)} className="px-3 py-2 rounded-xl border border-red-400/40 bg-red-600/20 text-red-100 text-xs font-black">Eliminar definitivo</button>
              </div>
            </div>
          ))}
          {[...trashLeagues, ...trashTournaments].length === 0 ? (
            <div className="text-xs text-slate-500">Papelera vacía.</div>
          ) : null}
        </div>
      </section>

      {editDraft ? (
        <div className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditDraft(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0B0E14] border border-white/20 rounded-3xl p-5 md:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-black text-white">Editar {editDraft.type === 'LIGA' ? 'Liga' : 'Torneo'}</h2>
              <p className="text-xs text-slate-500">Edita todos los datos del elemento.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" placeholder="Nombre" />
              <input value={editDraft.invite_code} onChange={(e) => setEditDraft({ ...editDraft, invite_code: e.target.value.toUpperCase() })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" placeholder="Código invitación" />
              <select value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as any })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <option value="OPEN">OPEN</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="FINISHED">FINISHED</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={editDraft.start_date} onChange={(e) => setEditDraft({ ...editDraft, start_date: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" />
                <input type="date" value={editDraft.end_date} onChange={(e) => setEditDraft({ ...editDraft, end_date: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" />
              </div>
            </div>

            {editDraft.type === 'LIGA' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={editDraft.league_mode} onChange={(e) => setEditDraft({ ...editDraft, league_mode: e.target.value as any })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                  <option value="RANDOM">RANDOM</option>
                  <option value="FIXED_SQUAD">FIXED_SQUAD</option>
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <p className="md:col-span-3 text-[11px] text-slate-500">Tip: si es torneo independiente, deja "Sin liga" y desactiva "Cuenta para la liga".</p>
                <select value={editDraft.parent_league_id} onChange={(e) => setEditDraft({ ...editDraft, parent_league_id: e.target.value ? Number(e.target.value) : '' })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                  <option value="">Sin liga (independiente)</option>
                  {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                </select>
                <select value={editDraft.game_mode} onChange={(e) => setEditDraft({ ...editDraft, game_mode: e.target.value as any })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                  <option value="RESURGENCE">Resurgence</option>
                  <option value="BATTLE_ROYALE">Battle Royale</option>
                </select>
                <select value={editDraft.map_rotation} onChange={(e) => setEditDraft({ ...editDraft, map_rotation: e.target.value as any })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                  <option value="REBIRTH">Rebirth</option>
                  <option value="HAVENS_HOLLOW">Havens Hollow</option>
                  <option value="MIXTO">Mixto</option>
                </select>
                <input type="number" min={1} max={20} value={editDraft.matches_per_series} onChange={(e) => setEditDraft({ ...editDraft, matches_per_series: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" />
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={editDraft.counts_for_league} onChange={(e) => setEditDraft({ ...editDraft, counts_for_league: e.target.checked })} />
                  Cuenta para la liga
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={saveEditCompetition} disabled={loading} className="px-4 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-black text-sm disabled:opacity-50">Guardar cambios</button>
              <button onClick={() => setEditDraft(null)} className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
