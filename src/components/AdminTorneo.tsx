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
}

interface TournamentRow {
  id: number;
  name: string;
  status: string;
  parent_league_id?: number | null;
  counts_for_league?: number;
  invite_code?: string;
}

export default function AdminTorneo({ currentUser, myCompetitions }: AdminTorneoProps) {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | ''>('');
  const [countsForLeague, setCountsForLeague] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const [leaguesRes, tournamentsRes] = await Promise.all([
      fetch('/api/leagues'),
      fetch('/api/tournaments'),
    ]);

    const [leaguesData, tournamentsData] = await Promise.all([
      leaguesRes.json(),
      tournamentsRes.json(),
    ]);

    setLeagues(Array.isArray(leaguesData) ? leaguesData : []);
    setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
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
          rules: { matches_per_series: 6 },
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Error creando torneo');

      setTournamentName('');
      setFeedback(`Torneo creado: ${data.name}`);
      await loadData();
    } catch (error: any) {
      setFeedback(error.message || 'No se pudo crear el torneo.');
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
            <p className="text-xs text-slate-500">Operacion real de ligas y torneos (sin mock).</p>
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
            <p className="text-xs text-slate-500">POST /api/leagues</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="Nombre de liga"
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
          />
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
            <p className="text-xs text-slate-500">POST /api/tournaments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            placeholder="Nombre de torneo"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
          />
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
          >
            <option value="">Sin liga (independiente)</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
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
            return (
              <div key={tournament.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="text-white font-bold">{tournament.name}</div>
                <div className="text-xs text-slate-400">ID {tournament.id} • {tournament.status}</div>
                <div className="text-xs text-purple-300 font-bold">Codigo: {tournament.invite_code || 'N/A'}</div>
                <div className="text-xs text-slate-400">Liga: {league?.name || 'Independiente'} • Cuenta: {tournament.counts_for_league ? 'Si' : 'No'}</div>
                <div className="flex gap-2">
                  <button onClick={() => copyText(link, 'Link del torneo')} className="px-3 py-2 rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-200 text-xs font-black inline-flex items-center gap-1"><Copy size={13} /> Copiar</button>
                  <button onClick={() => shareText(tournament.name, 'Unete al torneo en AXION', link)} className="px-3 py-2 rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-200 text-xs font-black inline-flex items-center gap-1"><Share2 size={13} /> Compartir</button>
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
    </motion.div>
  );
}
