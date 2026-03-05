import { useState, useEffect } from 'react';
import { Trophy, User, History, Search, Menu, Settings, Users, Shield, LayoutGrid, Box, X, LogOut, Bell, Moon, Languages, HelpCircle, ScanLine, Camera, Plus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'motion/react';
import Equipos from './components/Equipos';
import Individual from './components/Individual';
import Partidas from './components/Partidas';
import AdminTorneo from './components/AdminTorneo';
import SuperAdmin from './components/SuperAdmin';
import EscanearPartida from './components/EscanearPartida';

type ViewMode = 'user' | 'admin-torneo';

interface UserData {
  google_id: string;
  email: string;
  gamertag: string;
  avatar_url?: string;
  role: 'PLAYER' | 'ADMIN' | 'SUPER_ADMIN';
  phone?: string;
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'equipos' | 'individual' | 'partidas'>('equipos');
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

  const handleGoogleLogin = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;

    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const google_id = decoded.sub;
      const email = decoded.email;
      const gamertag = decoded.name;
      const avatar_url = decoded.picture;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_id, email, gamertag, avatar_url })
      });

      if (!res.ok) throw new Error('Error de conexión');

      const data = await res.json();
      setUser(data);

      if (data.gamertag === gamertag || data.gamertag.includes('PLAYER') || data.gamertag.includes('temp-')) {
        setIsProfileSetupOpen(true);
      } else {
        fetchSquadData(data.google_id);
        fetchInvitations(data.google_id);
      }
    } catch (e) {
      console.error("Login failed", e);
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
      const updatedUser = await res.json();
      setUser(updatedUser);
      setIsProfileSetupOpen(false);

      // Intentar cargar squad después de configurar perfil
      fetchSquadData(user.google_id);
    } catch (e) {
      console.error("Profile update failed", e);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const createSquad = async (name: string) => {
    if (!user) return;
    try {
      await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, leader_id: user.google_id, competition_id: 1 })
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

  // SaaS Admin check (Direct by role)
  if (user.role === 'SUPER_ADMIN') {
    return <SuperAdmin />;
  }

  const viewMode: ViewMode = user.role === 'ADMIN' ? 'admin-torneo' : 'user';
  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-purple-500/30 pb-24 transition-colors duration-300 relative overflow-hidden">

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-[#0B0E14] border-r border-white/10 z-[70] p-6 flex flex-col shadow-2xl"
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
                  <button onClick={() => { setActiveTab('equipos'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Users size={18} className="text-purple-500" /> Equipos
                  </button>
                  <button onClick={() => { setActiveTab('individual'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <User size={18} className="text-purple-500" /> Individual
                  </button>
                  <button onClick={() => { setActiveTab('partidas'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <History size={18} className="text-purple-500" /> Partidas
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Torneos</h3>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Trophy size={18} className="text-yellow-500" /> Mis Torneos
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Search size={18} className="text-slate-500" /> Buscar Torneo
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
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

      {/* Escanear Partida Modal */}
      <EscanearPartida isOpen={isScanOpen} onClose={() => setIsScanOpen(false)} />

      {/* Profile Setup Modal */}
      <AnimatePresence>
        {isProfileSetupOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-y-auto">
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
                {/* Avatar Upload */}
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

                {/* Gamertag Input */}
                <div className="w-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Activision ID (Gamertag#1234)</label>
                  <input
                    id="gamertag-input"
                    type="text"
                    placeholder="Ej: SoapMactavish#117"
                    defaultValue={user?.gamertag.includes('PLAYER') ? '' : user?.gamertag}
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
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=OPBorked" alt="Avatar" referrerPolicy="no-referrer" />
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

        {/* Tabs Superiores (Only in User Mode) */}
        {viewMode === 'user' && (
          <div className="flex gap-6 overflow-x-auto no-scrollbar border-b border-white/5 w-full max-w-7xl mx-auto">
            {['equipos', 'individual', 'partidas'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-yellow-500 rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 mt-4 space-y-6">

        {/* Invitations Alert */}
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

        {/* Squad Area */}
        {squad ? (
          <div className="bg-[#0B0E14] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">{squad.name}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tu Squad Actual</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full uppercase border border-green-500/20">Activo</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {squad.members.map((member: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex-shrink-0 relative overflow-hidden">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800" />
                    )}
                    {member.status === 'PENDING' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <History size={16} className="text-slate-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${member.status === 'PENDING' ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                      {member.gamertag}
                    </p>
                    <p className="text-[10px] text-slate-500">{member.status === 'PENDING' ? 'Invitado...' : 'Miembro'}</p>
                  </div>
                </div>
              ))}

              {/* Invitation Search (Only for Leader) */}
              {squad.members.length < (squad.max_members || 4) && squad.leader_id === user.google_id && (
                <div className="relative col-span-2 mt-2">
                  <div className="flex items-center gap-2 bg-white/5 border border-dashed border-white/10 rounded-2xl p-2 px-3">
                    <Search size={14} className="text-slate-500" />
                    <input
                      type="text"
                      placeholder="Invitar jugador por Gamertag..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none text-[12px] text-white focus:outline-none w-full"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#161B22] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        {searchResults.map((res) => (
                          <button
                            key={res.google_id}
                            onClick={() => inviteUser(res.google_id)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-all border-b border-white/5 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden">
                              {res.avatar_url && <img src={res.avatar_url} className="w-full h-full object-cover" />}
                            </div>
                            <span className="text-xs font-bold text-white">{res.gamertag}</span>
                            <span className="ml-auto text-[10px] text-purple-400 font-bold uppercase">Invitar</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* No Squad State */
          <div className="bg-[#0B0E14] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600">
              <Users size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">No tienes Squad</h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">Únete a uno o crea el tuyo para empezar a sumar puntos en equipo.</p>
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
        )}

        {/* Dashboards Components */}
        {viewMode === 'user' && (
          <>
            {activeTab === 'equipos' && <Equipos />}
            {activeTab === 'individual' && <Individual />}
            {activeTab === 'partidas' && <Partidas />}
          </>
        )}

        {viewMode === 'admin-torneo' && <AdminTorneo />}
      </main>

      {/* Logout Floating Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <button
          onClick={() => setUser(null)}
          className="p-3 rounded-full shadow-lg border bg-[#151921] border-white/10 text-red-400 hover:bg-red-500/10 transition-all"
          title="Cerrar Sesión"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Bottom Nav (Only in User Mode) */}
      {viewMode === 'user' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0B0E14]/90 backdrop-blur-xl border-t border-white/5 px-6 py-2 flex justify-between items-end z-40 w-full max-w-7xl mx-auto rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-6 md:hidden">
          <button onClick={() => setActiveTab('equipos')} className={`flex flex-col items-center gap-1.5 transition-colors w-16 ${activeTab === 'equipos' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Users size={20} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Equipos</span>
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

          <button onClick={() => setActiveTab('partidas')} className={`flex flex-col items-center gap-1.5 transition-colors w-16 ${activeTab === 'partidas' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <History size={20} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Partidas</span>
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
    </div>
  );
}

