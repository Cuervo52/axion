import { useState, useEffect } from 'react';
import { Trophy, User, History, Search, Menu, Settings, Users, Shield, LayoutGrid, Box, X, LogOut, Bell, Moon, Languages, HelpCircle, ScanLine, Camera, Plus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'motion/react';
import AdminTorneo from './components/AdminTorneo';
import SuperAdmin from './components/SuperAdmin';
import EscanearPartida from './components/EscanearPartida';
import PlayerDashboard from './components/PlayerDashboard';

type ViewMode = 'user' | 'admin-torneo';
type PlayerTab = 'league' | 'career';

interface UserData {
  google_id: string;
  email: string;
  gamertag: string;
  avatar_url?: string;
  role: 'PLAYER' | 'ADMIN' | 'SUPER_ADMIN';
  phone?: string;
}

interface CompetitionMembership {
  id: number;
  name: string;
  type: 'LIGA' | 'TORNEO';
  status: string;
  parent_league_id?: number | null;
  invite_code?: string;
  role: 'ADMIN' | 'ORGANIZER' | 'PLAYER';
  member_status: 'ACTIVE' | 'LEFT' | 'BANNED';
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('axion_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<PlayerTab>('career');
  const [forceView, setForceView] = useState<string | null>(() => localStorage.getItem('axion_force_view'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [squad, setSquad] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isCreatingSquad, setIsCreatingSquad] = useState(false);
  const [myCompetitions, setMyCompetitions] = useState<CompetitionMembership[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningCompetition, setIsJoiningCompetition] = useState(false);
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);
  const [handledJoinCode, setHandledJoinCode] = useState<string | null>(null);

  const fallbackCompetitionId = myCompetitions.find((competition) => competition.type === 'TORNEO' && competition.member_status === 'ACTIVE')?.id
    || myCompetitions.find((competition) => competition.type === 'LIGA' && competition.member_status === 'ACTIVE')?.id
    || null;

  const activeCompetitionId = squad?.competition_id ? Number(squad.competition_id) : fallbackCompetitionId;

  const fetchMyCompetitions = async (google_id: string) => {
    try {
      const res = await fetch(`/api/users/${google_id}/competitions`);
      const data = await res.json();
      setMyCompetitions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Competitions fetch error', e);
    }
  };

  const joinCompetitionByCode = async (rawCode: string) => {
    if (!user) return;
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    setIsJoiningCompetition(true);
    setJoinFeedback(null);
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.google_id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await fetchMyCompetitions(user.google_id);
      setJoinFeedback(`Listo: ya entraste a ${data.competition?.name || 'la competencia'}.`);
      setJoinCode('');
      fetchSquadData(user.google_id);
    } catch (e: any) {
      setJoinFeedback(e.message || 'No se pudo unir a la competencia.');
    } finally {
      setIsJoiningCompetition(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse: any) => {
    console.log("[AUTH] Google Login response received:", credentialResponse);
    if (!credentialResponse.credential) {
      console.error("[AUTH] No credential in response");
      return;
    }

    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      console.log("[AUTH] Decoded JWT:", decoded);
      const google_id = decoded.sub;
      const email = decoded.email;
      const gamertag = decoded.name;
      const avatar_url = decoded.picture;

      console.log(`[AUTH] Sending login request to backend for ${email}...`);
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ google_id, email, gamertag, avatar_url }),
      });

      const loginData = await loginRes.json();
      if (loginData.error) throw new Error(loginData.error);

      setUser(loginData);
      localStorage.setItem('axion_user', JSON.stringify(loginData));

      if (loginData.gamertag === gamertag || loginData.gamertag.includes('PLAYER') || loginData.gamertag.includes('temp-')) {
        console.log("[AUTH] Profile setup required");
        setIsProfileSetupOpen(true);
      } else {
        console.log("[AUTH] Proceeding to dashboard");
        fetchSquadData(loginData.google_id);
        fetchInvitations(loginData.google_id);
        fetchMyCompetitions(loginData.google_id);
      }
    } catch (e) {
      console.error("[AUTH] Login process failed:", e);
    }
  };

  const fetchSquadData = async (google_id: string) => {
    try {
      const res = await fetch(`/api/users/${google_id}/squad`);
      const data = await res.json();
      setSquad(data);
    } catch (e) { console.error("Squad fetch error", e); }
  };

  const fetchInvitations = async (google_id: string) => {
    try {
      const res = await fetch(`/api/users/${google_id}/invitations`);
      const data = await res.json();
      setInvitations(data);
    } catch (e) { console.error("Invites fetch error", e); }
  };

  const handleAcceptInvite = async (squad_id: number) => {
    if (!user) return;
    try {
      await fetch('/api/squads/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad_id, user_id: user.google_id })
      });
      fetchSquadData(user.google_id);
      fetchInvitations(user.google_id);
    } catch (e) { console.error("Accept error", e); }
  };

  const handleProfileUpdate = async (tag: string, avatar: string | null) => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_id: user.google_id, gamertag: tag, avatar_url: avatar })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUser(data);
      localStorage.setItem('axion_user', JSON.stringify(data));
      setIsProfileSetupOpen(false);

      // Intentar cargar squad después de configurar perfil
      fetchSquadData(user.google_id);
      fetchMyCompetitions(user.google_id);
    } catch (e) {
      console.error("Profile update failed", e);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const createSquad = async (name: string) => {
    if (!user) return;
    if (!activeCompetitionId) {
      alert('Primero unete a una liga o torneo para crear un squad en el contexto correcto.');
      return;
    }
    try {
      await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, leader_id: user.google_id, competition_id: activeCompetitionId })
      });
      fetchSquadData(user.google_id);
      setIsCreatingSquad(false);
    } catch (e) { console.error("Create squad error", e); }
  };

  const inviteUser = async (targetId: string) => {
    if (!squad) return;
    try {
      await fetch('/api/squads/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad_id: squad.id, user_id: targetId })
      });
      fetchSquadData(user.google_id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) { console.error("Invite error", e); }
  };

  useEffect(() => {
    if (searchQuery.length > 2) {
      fetch(`/api/users/search?q=${searchQuery}`)
        .then(res => res.json())
        .then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      if (!user.gamertag || user.gamertag.includes('PLAYER') || user.gamertag.includes('temp-')) {
        setIsProfileSetupOpen(true);
      } else {
        fetchSquadData(user.google_id);
        fetchInvitations(user.google_id);
        fetchMyCompetitions(user.google_id);
      }
    }
  }, []); // Run once on mount to load initial data if user is stored in localStorage

  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    const code = (url.searchParams.get('join') || '').trim().toUpperCase();
    if (!code || handledJoinCode === code) return;

    setHandledJoinCode(code);
    joinCompetitionByCode(code);
  }, [user, handledJoinCode]);

  useEffect(() => {
    if (forceView) {
      localStorage.setItem('axion_force_view', forceView);
    } else {
      localStorage.removeItem('axion_force_view');
    }
  }, [forceView]);

  const activeTournament = myCompetitions.find((competition) => competition.type === 'TORNEO' && competition.member_status === 'ACTIVE') || null;
  const activeLeague = myCompetitions.find((competition) => competition.type === 'LIGA' && competition.member_status === 'ACTIVE') || null;
  const hasRealTournamentSquad = Boolean(activeTournament && squad && Number(squad.competition_id) === activeTournament.id);
  const tournamentSquadMembers = hasRealTournamentSquad ? (squad?.members || null) : null;
  const playerState = tournamentSquadMembers
    ? 'tournament_sorted'
    : activeTournament
      ? 'tournament_lobby'
      : activeLeague
        ? 'league_member'
        : 'idle';
  const playerStateTitle = playerState === 'tournament_sorted'
    ? (activeTournament?.name || 'Torneo en curso')
    : playerState === 'tournament_lobby'
      ? (activeTournament?.name || 'Lobby del torneo')
      : playerState === 'league_member'
        ? (activeLeague?.name || 'Liga activa')
        : 'Sin torneo activo';
  const playerStateHint = playerState === 'tournament_sorted'
    ? 'Tu squad ya esta armado. Lo importante es jugar y subir resultados.'
    : playerState === 'tournament_lobby'
      ? 'Ya entraste al torneo. Falta que cierren lobby y hagan el sorteo.'
      : playerState === 'league_member'
        ? 'Sigues dentro de tu liga. Cuando abran torneo, aqui mismo avanzas.'
        : 'Puedes consultar tu historial o entrar con un codigo de invitacion.';
  const showJoinInput = playerState === 'idle' || playerState === 'league_member';

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full space-y-8"
        >
          <div>
            <span className="text-5xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400 uppercase drop-shadow-lg">
              AXION
            </span>
            <p className="mt-4 text-slate-400 text-sm font-medium tracking-wide">Plataforma de Torneos Inteligente</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center justify-center space-y-6">
            <p className="text-slate-300 text-sm">Inicia sesión para continuar</p>
            <div className="w-full flex justify-center transform hover:scale-105 transition-transform duration-300">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => console.log('Login Failed')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const viewMode: ViewMode = (forceView as any) || (user.role === 'ADMIN' ? 'admin-torneo' : 'user');

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-purple-500/30 pb-24 transition-colors duration-300 relative overflow-hidden">

      {user.role === 'SUPER_ADMIN' && !forceView ? (
        <SuperAdmin onSwitchView={(v: string) => setForceView(v)} />
      ) : (
        <>
          {/* Header AXION */}
          <header className="bg-[#0B0E14]/80 backdrop-blur-md border-b border-white/5 pt-4 pb-2 px-4 sticky top-0 z-50">
            <div className="flex items-center justify-between mb-4 w-full max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400 uppercase">
                  AXION
                </span>
                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-bold px-1.5 py-0.5 rounded">BETA</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMenuOpen(true)}>
                  <Menu size={20} className="text-slate-400 hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* User Profile Section (Only visible in User Mode) */}
            {viewMode === 'user' && (
              <div className="flex items-center gap-4 mb-4 w-full max-w-7xl mx-auto">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-yellow-500 p-[1px] shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                  <div className="w-full h-full rounded-xl bg-[#0B0E14] flex items-center justify-center overflow-hidden">
                    <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.gamertag}`} alt="Avatar" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold tracking-tight text-white">{user.gamertag}</h1>
                    <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">#{user.google_id.slice(-6)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                    <Trophy size={10} className="text-yellow-500" /> {user.role}
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Settings size={16} className="text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Admin Headers */}
            {viewMode === 'admin-torneo' && (
              <div className="mb-4 w-full max-w-7xl mx-auto">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Modo</div>
                <div className="text-xl font-black text-white">Organizador</div>
              </div>
            )}

          </header>

          {/* Sidebar Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-[#0B0E14] border-r border-white/10 z-[110] p-6 flex flex-col shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400 uppercase">
                      AXION
                    </span>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Navegación</h3>
                      <button onClick={() => { setForceView('user'); setActiveTab('league'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <LayoutGrid size={18} className="text-cyan-400" /> Liga
                      </button>
                      <button onClick={() => { setForceView('user'); setActiveTab('career'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <User size={18} className="text-purple-500" /> Carrera
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Vistas</h3>
                      <button
                        onClick={() => { setForceView('admin-torneo'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Trophy size={18} className="text-yellow-500" /> Admin torneo
                      </button>
                      <button
                        onClick={() => { setForceView('user'); setActiveTab('league'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Users size={18} className="text-blue-400" /> Vista player
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <button onClick={() => { setUser(null); localStorage.removeItem('axion_user'); localStorage.removeItem('axion_force_view'); }} className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                      <LogOut size={18} /> Cerrar Sesión
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <main className="w-full max-w-7xl mx-auto px-4 mt-4 space-y-6">
            {viewMode === 'admin-torneo' ? (
              <AdminTorneo
                currentUser={user}
                myCompetitions={myCompetitions}
              />
            ) : (
              <>
                {(showJoinInput || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <section className="px-1 pt-1 pb-2 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      {showJoinInput ? (
                        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-2 flex-1">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={joinCode}
                              onChange={(e) => setJoinCode(e.target.value)}
                              placeholder="Entrar con codigo"
                              className="flex-1 bg-transparent rounded-[1.2rem] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                            />
                            <button
                              onClick={() => joinCompetitionByCode(joinCode)}
                              disabled={!joinCode.trim() || isJoiningCompetition}
                              className="px-5 py-3 rounded-[1.2rem] bg-emerald-600 text-sm font-black text-white disabled:opacity-50 whitespace-nowrap"
                            >
                              {isJoiningCompetition ? 'Entrando...' : 'Entrar'}
                            </button>
                          </div>
                        </div>
                      ) : <div />}

                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <button
                          onClick={() => setForceView('admin-torneo')}
                          className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-[11px] font-bold text-white shrink-0"
                        >
                          Admin
                        </button>
                      )}
                    </div>

                    {joinFeedback && <div className="text-xs text-emerald-300">{joinFeedback}</div>}
                  </section>
                )}

                <AnimatePresence>
                  {invitations.length > 0 && invitations.map((inv) => (
                    <motion.div
                      key={inv.squad_id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-purple-600/20 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Bell className="text-purple-400" size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">¡Invitación a Squad!</p>
                          <p className="text-[12px] text-purple-300"><b>{inv.leader_name}</b> te invitó a unirte a <b>{inv.squad_name}</b></p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(inv.squad_id)}
                          className="px-4 py-2 bg-purple-600 rounded-xl text-[12px] font-bold hover:bg-purple-500 transition-all shadow-lg"
                        >
                          Aceptar
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {playerState === 'idle' && squad ? (
                  <div className="bg-[#0B0E14] border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                          <Users size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-white uppercase tracking-tight">{squad.name}</h2>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Squad actual legacy</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {squad.members.map((member: any, i: number) => (
                        <div key={`${member.id || member.gamertag}-${i}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex-shrink-0 relative overflow-hidden">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate text-slate-200">{member.gamertag}</p>
                            <p className="text-[10px] text-slate-500">Miembro</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : playerState === 'idle' && myCompetitions.some((item) => item.type === 'TORNEO') ? (
                  <div className="bg-[#0B0E14] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600">
                      <Users size={32} />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Aún no tienes Squad</h2>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto">Créalo sólo si ya estás dentro de un torneo y necesitas equipo.</p>
                    </div>

                    {isCreatingSquad ? (
                      <div className="w-full max-w-xs flex gap-2">
                        <input
                          id="new-squad-name"
                          type="text"
                          autoFocus
                          placeholder="Nombre de tu Squad"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('new-squad-name') as HTMLInputElement;
                            createSquad(input.value);
                          }}
                          className="px-4 py-2 bg-purple-600 rounded-xl text-xs font-bold text-white hover:bg-purple-500 transition-all"
                        >
                          Crear
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreatingSquad(true)}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white transition-all flex items-center gap-2"
                      >
                        <Plus size={18} className="text-purple-400" /> Crear mi propio Squad
                      </button>
                    )}
                  </div>
                ) : null}

                <PlayerDashboard
                  userId={user.google_id}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </>
            )}
          </main>

          {/* Logout Floating Button */}
          <div className="fixed bottom-24 right-4 z-50">
            <button
              onClick={() => {
                setUser(null);
                localStorage.removeItem('axion_user');
              }}
              className="p-3 rounded-full shadow-lg border bg-[#151921] border-white/10 text-red-400 hover:bg-red-500/10 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Bottom Nav (Only in User Mode) */}
          {viewMode === 'user' && (
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0B0E14]/90 backdrop-blur-xl border-t border-white/5 px-6 py-2 flex justify-between items-end z-40 w-full max-w-7xl mx-auto rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-6 md:hidden">
              <button onClick={() => setActiveTab('league')} className={`flex flex-col items-center gap-1.5 transition-colors w-16 ${activeTab === 'league' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutGrid size={20} />
                <span className="text-[8px] font-bold uppercase tracking-widest">Ligas</span>
              </button>

              {/* Central Scan Button */}
              <div className="relative -top-6">
                <button
                  onClick={() => setIsScanOpen(true)}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-yellow-500 p-[2px] shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:scale-105 transition-transform active:scale-95 flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full bg-[#151921] flex items-center justify-center">
                    <ScanLine size={28} className="text-white" />
                  </div>
                </button>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-widest text-white">Escanear</span>
              </div>

              <button onClick={() => setActiveTab('career')} className={`flex flex-col items-center gap-1.5 transition-colors w-16 ${activeTab === 'career' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
                <User size={20} />
                <span className="text-[8px] font-bold uppercase tracking-widest">Carrera</span>
              </button>
            </nav>
          )}

          {/* Desktop Scan Button (Floating) */}
          {viewMode === 'user' && (
            <div className="hidden md:block fixed bottom-8 right-8 z-40">
              <button
                onClick={() => setIsScanOpen(true)}
                className="flex items-center gap-3 px-6 py-4 rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 text-white font-bold shadow-2xl hover:scale-105 transition-transform"
              >
                <ScanLine size={24} />
                ESCANEAR PARTIDA
              </button>
            </div>
          )}
        </>
      )}

      {/* GLOBAL MODALS ALWAYS RENDERED AT ROOT */}

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0B0E14] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings size={20} className="text-slate-400" /> Configuración
                  </h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Bell size={18} /></div>
                      <div>
                        <div className="text-sm font-bold text-white">Notificaciones</div>
                        <div className="text-[10px] text-slate-400">Alertas de partidas y torneos</div>
                      </div>
                    </div>
                    <div className="w-10 h-5 bg-purple-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Moon size={18} /></div>
                      <div>
                        <div className="text-sm font-bold text-white">Modo Oscuro</div>
                        <div className="text-[10px] text-slate-400">Siempre activo en AXION</div>
                      </div>
                    </div>
                    <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-not-allowed opacity-50">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-slate-400 rounded-full shadow-sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Languages size={18} /></div>
                      <div>
                        <div className="text-sm font-bold text-white">Idioma</div>
                        <div className="text-[10px] text-slate-400">Español (MX)</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">ES</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><HelpCircle size={18} /></div>
                      <div>
                        <div className="text-sm font-bold text-white">Ayuda y Soporte</div>
                        <div className="text-[10px] text-slate-400">Contactar a soporte</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-black/20 text-center text-[10px] text-slate-600 font-mono">
                  AXION v1.0.2-beta • Build 2026.03.04
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <EscanearPartida
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        submittedBy={user?.google_id}
        competitionId={activeCompetitionId}
      />

      <AnimatePresence>
        {isProfileSetupOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full bg-[#0B0E14] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">Completa tu Perfil</h2>
                <p className="text-slate-400 text-sm">Tu identidad en el campo de batalla</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-yellow-500 p-[1px] relative overflow-hidden">
                    <div className="w-full h-full rounded-2xl bg-[#0B0E14] flex items-center justify-center relative">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="Avatar Preview" />
                      ) : (
                        <Camera size={32} className="text-slate-500" />
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file);
                        setUser(prev => prev ? { ...prev, avatar_url: compressed } : null);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <div className="w-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Activision ID (Gamertag#1234)</label>
                  <input
                    id="gamertag-input"
                    type="text"
                    placeholder="Ej: SoapMactavish#117"
                    defaultValue={user?.gamertag?.includes('PLAYER') ? '' : user?.gamertag}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all font-mono"
                  />
                </div>

                <button
                  disabled={isUpdatingProfile}
                  onClick={() => {
                    const input = document.getElementById('gamertag-input') as HTMLInputElement;
                    handleProfileUpdate(input.value, user?.avatar_url || null);
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Guardando...' : 'Empezar a Competir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
