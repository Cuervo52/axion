import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Share2, Shuffle, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

interface MockPlayer {
  id: string;
  gamertag: string;
  avatar_url: string;
  state: 'LOBBY' | 'ESPERA';
}

const mockLeague = {
  name: 'Liga Comunidad Rebirth',
  mode: 'RANDOM',
  inviteCode: 'LIGA26',
};

const mockTournament = {
  name: 'Jueves 31',
  date: '2026-03-31',
  matches: 6,
  inviteCode: 'TOR31X',
  squadSize: 4,
};

const mockPlayers: MockPlayer[] = [
  { id: '1', gamertag: 'CuervoGhost', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=CuervoGhost', state: 'LOBBY' },
  { id: '2', gamertag: 'NicoRbz', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=NicoRbz', state: 'LOBBY' },
  { id: '3', gamertag: 'BetoAim', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=BetoAim', state: 'LOBBY' },
  { id: '4', gamertag: 'LunaKill', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=LunaKill', state: 'LOBBY' },
  { id: '5', gamertag: 'MajoRush', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=MajoRush', state: 'LOBBY' },
  { id: '6', gamertag: 'RuloZone', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=RuloZone', state: 'LOBBY' },
  { id: '7', gamertag: 'TonaShot', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=TonaShot', state: 'LOBBY' },
  { id: '8', gamertag: 'IrisDrop', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=IrisDrop', state: 'LOBBY' },
  { id: '9', gamertag: 'AxelPing', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=AxelPing', state: 'LOBBY' },
  { id: '10', gamertag: 'ZoeStorm', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=ZoeStorm', state: 'LOBBY' },
  { id: '11', gamertag: 'PakoFlex', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=PakoFlex', state: 'LOBBY' },
  { id: '12', gamertag: 'MaraSnap', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=MaraSnap', state: 'LOBBY' },
  { id: '13', gamertag: 'KikeTap', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=KikeTap', state: 'ESPERA' },
  { id: '14', gamertag: 'ValeZone', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=ValeZone', state: 'ESPERA' },
  { id: '15', gamertag: 'SantiLoot', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=SantiLoot', state: 'ESPERA' },
  { id: '16', gamertag: 'MilaBurst', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=MilaBurst', state: 'ESPERA' },
];

const mockLobby = mockPlayers.filter((player) => player.state === 'LOBBY');
const mockWaiting = mockPlayers.filter((player) => player.state === 'ESPERA');

export default function AdminTorneo({ currentUser }: AdminTorneoProps) {
  const [squadSize, setSquadSize] = useState(() => {
    const saved = window.localStorage.getItem('axion_mock_squad_size');
    return saved ? Math.min(4, Math.max(2, Number(saved) || 4)) : 4;
  });
  const [isSorting, setIsSorting] = useState(false);
  const [isLobbyClosed, setIsLobbyClosed] = useState(() => window.localStorage.getItem('axion_mock_lobby_closed') === '1');
  const [sortedTeams, setSortedTeams] = useState<MockPlayer[][]>(() => {
    try {
      const raw = window.localStorage.getItem('axion_mock_tournament_teams');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const tournamentLink = `${window.location.origin}/?join=${mockTournament.inviteCode}`;
  const leagueLink = `${window.location.origin}/?join=${mockLeague.inviteCode}`;
  const playersForLobby = useMemo(() => {
    const currentPlayer: MockPlayer = {
      id: currentUser.google_id,
      gamertag: currentUser.gamertag || currentUser.google_id.slice(-6),
      avatar_url: currentUser.avatar_url || `https://api.dicebear.com/9.x/thumbs/svg?seed=${currentUser.google_id}`,
      state: 'LOBBY',
    };

    const withoutCurrent = mockPlayers.filter((player) => player.id !== currentPlayer.id);
    return [currentPlayer, ...withoutCurrent];
  }, [currentUser.google_id]);

  const lobbyPlayers = playersForLobby.filter((player) => player.state === 'LOBBY');
  const waitingPlayers = playersForLobby.filter((player) => player.state === 'ESPERA');
  const readyPlayers = lobbyPlayers.length;
  const expectedTeams = Math.floor(readyPlayers / squadSize);

  const sortingPreview = useMemo(() => {
    if (!isSorting) return [];
    const shuffled = [...lobbyPlayers].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [isSorting, lobbyPlayers]);

  useEffect(() => {
    window.localStorage.setItem('axion_mock_squad_size', String(squadSize));
  }, [squadSize]);

  useEffect(() => {
    window.localStorage.setItem('axion_mock_lobby_closed', isLobbyClosed ? '1' : '0');
  }, [isLobbyClosed]);

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

  const decreaseSquadSize = () => {
    setSquadSize((value) => Math.max(2, value - 1));
  };

  const increaseSquadSize = () => {
    setSquadSize((value) => Math.min(4, value + 1));
  };

  const handleSortLobby = () => {
    if (isSorting) return;
    setIsLobbyClosed(true);
    setIsSorting(true);

    window.setTimeout(() => {
      const shuffled = [...lobbyPlayers].sort(() => Math.random() - 0.5);
      const teams: MockPlayer[][] = [];
      for (let index = 0; index < shuffled.length; index += squadSize) {
        const chunk = shuffled.slice(index, index + squadSize);
        if (chunk.length === squadSize) {
          teams.push(chunk);
        }
      }
      window.localStorage.setItem('axion_mock_tournament_teams', JSON.stringify(teams));
      window.dispatchEvent(new Event('axion-mock-tournament-updated'));
      setSortedTeams(teams);
      setIsSorting(false);
    }, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="bg-[#0B0E14] border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white">Admin Torneo</h1>
            <p className="text-xs text-slate-500">Liga, torneo, lobby y sorteo.</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200">
            16 jugadores
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 p-3">
          <ArrowDown className="text-slate-400" size={18} />
        </div>
      </div>

      <section className="bg-[#0B0E14] border border-cyan-400/20 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-cyan-300" size={20} />
          <div>
            <h2 className="text-lg font-black text-white">Liga activa</h2>
            <p className="text-xs text-slate-500">Link base para unirse a la liga.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Nombre</div>
            <div className="mt-2 text-base font-bold text-white">{mockLeague.name}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Modo</div>
            <div className="mt-2 text-base font-bold text-white">{mockLeague.mode}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Codigo</div>
            <div className="mt-2 text-base font-bold text-cyan-300">{mockLeague.inviteCode}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Link de liga</div>
            <div className="mt-2 text-[11px] text-slate-300 break-all">{leagueLink}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => copyText(leagueLink, 'Link de liga')}
            className="px-4 py-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 text-cyan-200 text-sm font-black flex items-center gap-2"
          >
            <Copy size={16} /> Copiar link de liga
          </button>
          <button
            onClick={() => shareText(mockLeague.name, 'Unete a la liga en AXION', leagueLink)}
            className="px-4 py-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 text-cyan-200 text-sm font-black flex items-center gap-2"
          >
            <Share2 size={16} /> Compartir liga
          </button>
        </div>
      </section>

      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 p-3">
          <ArrowDown className="text-slate-400" size={18} />
        </div>
      </div>

      <section className="bg-[#0B0E14] border border-purple-400/20 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-purple-300" size={20} />
          <div>
            <h2 className="text-lg font-black text-white">Torneo del día</h2>
            <p className="text-xs text-slate-500">Link propio del torneo para meter jugadores al lobby.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Nombre</div>
            <div className="mt-2 text-base font-bold text-white">{mockTournament.name}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Fecha</div>
            <div className="mt-2 text-base font-bold text-white">{mockTournament.date}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Partidas</div>
            <div className="mt-2 text-base font-bold text-white">{mockTournament.matches}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Codigo</div>
            <div className="mt-2 text-base font-bold text-purple-300">{mockTournament.inviteCode}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Link del torneo</div>
          <div className="mt-2 text-sm text-slate-200 break-all">{tournamentLink}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => copyText(tournamentLink, 'Link del torneo')}
              className="px-4 py-3 rounded-2xl bg-purple-500/15 border border-purple-400/20 text-purple-200 text-sm font-black flex items-center gap-2"
            >
              <Copy size={16} /> Copiar torneo
            </button>
            <button
              onClick={() => shareText(mockTournament.name, 'Unete al torneo en AXION', tournamentLink)}
              className="px-4 py-3 rounded-2xl bg-purple-500/15 border border-purple-400/20 text-purple-200 text-sm font-black flex items-center gap-2"
            >
              <Share2 size={16} /> Compartir torneo
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 p-3">
          <ArrowDown className="text-slate-400" size={18} />
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="bg-[#0B0E14] border border-emerald-400/20 rounded-3xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Users className="text-emerald-300" size={20} />
              <div>
                <h2 className="text-lg font-black text-white">Lobby del torneo</h2>
                <p className="text-xs text-slate-500">Grid visual de los que van entrando en tiempo real.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-200">
              {mockLobby.length} listos para sorteo
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {lobbyPlayers.map((player) => (
              <div key={player.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                  <img src={player.avatar_url} alt={player.gamertag} className="w-full h-full object-cover" />
                </div>
                <div className="mt-3 text-sm font-bold text-white truncate">{player.gamertag}</div>
                <div className="mt-1 text-[10px] font-bold text-emerald-300 uppercase tracking-widest">En lobby</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0B0E14] border border-amber-400/20 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">En espera</h2>
                <p className="text-xs text-slate-500">Jugadores que ya pidieron entrar pero aún no pasan al sorteo.</p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs font-black text-amber-200">
                {mockWaiting.length} esperando
              </div>
            </div>

            <div className="space-y-2">
                      {waitingPlayers.map((player) => (
                <div key={player.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <img src={player.avatar_url} alt={player.gamertag} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{player.gamertag}</div>
                    <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">En espera</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0B0E14] border border-purple-400/20 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shuffle className="text-purple-300" size={18} />
              <div>
                <h2 className="text-lg font-black text-white">Acción del admin</h2>
                <p className="text-xs text-slate-500">Cuando ya hay suficientes aptos, se cierra el lobby y se lanza el sorteo.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Formato sugerido</span>
                <span className="font-black text-white">Editable</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Jugadores listos</span>
                <span className="font-black text-emerald-300">{mockLobby.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Resultado esperado</span>
                <span className="font-black text-white">{expectedTeams} squads</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3">Tamaño del squad</div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={decreaseSquadSize}
                    className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 text-white flex items-center justify-center"
                  >
                    <ArrowDown size={28} />
                  </button>
                  <div className="w-24 h-24 rounded-3xl border border-purple-400/20 bg-purple-500/10 flex flex-col items-center justify-center">
                    <div className="text-4xl font-black text-white">{squadSize}</div>
                    <div className="text-[10px] uppercase tracking-widest text-purple-200 font-bold">jugadores</div>
                  </div>
                  <button
                    onClick={increaseSquadSize}
                    className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 text-white flex items-center justify-center"
                  >
                    <ArrowUp size={28} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSortLobby}
              disabled={isSorting}
              className="w-full py-4 rounded-2xl bg-purple-500 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Shuffle size={16} /> {isSorting ? 'Sorteando...' : 'Cerrar lobby y sortear'}
            </button>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100 flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              Después del sorteo, cada jugador debe ver su squad del torneo.
            </div>
          </div>
        </div>
      </section>

      {(isLobbyClosed || isSorting || sortedTeams.length > 0) && (
        <>
          <div className="flex justify-center">
            <div className="rounded-full border border-white/10 bg-white/5 p-3">
              <ArrowDown className="text-slate-400" size={18} />
            </div>
          </div>

          <section className="bg-[#0B0E14] border border-fuchsia-400/20 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shuffle className="text-fuchsia-300" size={20} />
              <div>
                <h2 className="text-lg font-black text-white">Sorteo de squads</h2>
                <p className="text-xs text-slate-500">Animación simple del movimiento aleatorio antes de formar equipos.</p>
              </div>
            </div>

            {isSorting ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {sortingPreview.map((player, index) => (
                  <motion.div
                    key={`${player.id}-${index}`}
                    initial={{ opacity: 0.4, scale: 0.92, y: 10 }}
                    animate={{
                      opacity: [0.5, 1, 0.6, 1],
                      scale: [0.95, 1.04, 0.98, 1],
                      y: [0, -8, 6, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: index * 0.04,
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                      <img src={player.avatar_url} alt={player.gamertag} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{player.gamertag}</div>
                      <div className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold">mezclando</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : sortedTeams.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100">
                  Sorteo cerrado con squads de {squadSize}. Se formaron {sortedTeams.length} equipos.
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedTeams.map((team, teamIndex) => (
                    <div key={`team-${teamIndex}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-lg font-black text-white">Equipo {teamIndex + 1}</div>
                      <div className="mt-4 space-y-3">
                        {team.map((player, playerIndex) => (
                          <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-sm font-black text-fuchsia-300 w-5">{playerIndex + 1}</div>
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                              <img src={player.avatar_url} alt={player.gamertag} className="w-full h-full object-cover" />
                            </div>
                            <div className="text-sm font-bold text-white truncate">{player.gamertag}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}

      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 p-3">
          <ArrowDown className="text-slate-400" size={18} />
        </div>
      </div>

      <section className="bg-[#0B0E14] border border-blue-400/20 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="text-blue-300" size={20} />
          <div>
            <h2 className="text-lg font-black text-white">Siguiente vista: player</h2>
            <p className="text-xs text-slate-500">El resultado del sorteo ya queda guardado localmente para mostrar el squad del torneo al jugador.</p>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
