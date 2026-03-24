import { motion } from 'motion/react';
import {
  Shield, Server, DollarSign, Users, Activity, Terminal,
  Globe, Zap, ArrowUpRight, TrendingUp,
  Clock, AlertCircle, CheckCircle2, LayoutDashboard, UserCircle
} from 'lucide-react';

interface SuperAdminProps {
  onSwitchView?: (view: string) => void;
}

export default function SuperAdmin({ onSwitchView }: SuperAdminProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-[#050505] min-h-screen text-slate-300 selection:bg-yellow-500/30"
    >
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 md:pb-8">
        <div>
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="p-1.5 md:p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Shield className="text-yellow-500" size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
              Omni<span className="text-yellow-500">Control</span>
            </h1>
          </div>
          <p className="text-[10px] md:text-sm font-medium text-slate-500 tracking-wide">
            AXION // INTELIGENCIA CENTRAL
          </p>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 w-full md:w-auto">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Server Status</span>
            <span className="text-[10px] md:text-xs font-mono text-white flex items-center gap-1">
              <Globe size={10} className="text-blue-500" /> ONLINE // PROD
            </span>
          </div>
          <div className="bg-[#111] border border-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 shadow-2xl">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-tighter">System Live</span>
          </div>
        </div>
      </header>

      {/* Switcher Quick Access (NEW) */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <button
          onClick={() => onSwitchView?.('admin-torneo')}
          className="flex flex-col items-center justify-center gap-2 p-4 md:p-6 bg-[#0B0E14] border border-purple-500/20 rounded-2xl md:rounded-3xl hover:bg-purple-500/10 transition-all group"
        >
          <LayoutDashboard className="text-purple-500 group-hover:scale-110 transition-transform" size={24} />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Admin Torneo</span>
        </button>
        <button
          onClick={() => onSwitchView?.('user')}
          className="flex flex-col items-center justify-center gap-2 p-4 md:p-6 bg-[#0B0E14] border border-blue-500/20 rounded-2xl md:rounded-3xl hover:bg-blue-500/10 transition-all group"
        >
          <UserCircle className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Vista Jugador</span>
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">

        {/* System Health Module */}
        <div className="md:col-span-8 bg-[#0B0E14] border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 md:opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} className="text-emerald-500 md:w-[120px] md:h-[120px]" />
          </div>

          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Server size={18} className="text-emerald-500" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-white uppercase tracking-tight">System Health</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2 md:space-y-4">
              <div className="flex items-center justify-between text-[8px] md:text-[10px] font-black text-slate-500 uppercase">
                <span>CPU Load</span>
                <span className="text-emerald-500 italic">Optimal</span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter">
                12<span className="text-sm text-slate-600">%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[12%] shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
              </div>
            </div>

            <div className="space-y-2 md:space-y-4">
              <div className="flex items-center justify-between text-[8px] md:text-[10px] font-black text-slate-500 uppercase">
                <span>Memory usage</span>
                <span className="text-yellow-500 italic">Nominal</span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter">
                45<span className="text-sm text-slate-600">%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-[45%] shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
              </div>
            </div>

            <div className="hidden sm:block space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>API Latency</span>
                <span className="text-emerald-500">High Speed</span>
              </div>
              <div className="text-4xl font-black text-emerald-500 font-mono tracking-tighter">
                24<span className="text-sm text-emerald-900">ms</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 4 ? 'bg-emerald-500' : 'bg-white/5'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Module (Tall Bento) */}
        <div className="md:col-span-4 bg-gradient-to-br from-[#1A1C1E] to-[#0B0E14] border border-yellow-500/20 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl group flex flex-col justify-between min-h-[180px] md:min-h-0">
          <div className="absolute -top-12 -right-12 w-32 h-32 md:w-48 md:h-48 bg-yellow-500/10 rounded-full blur-[60px] md:blur-[80px]" />

          <div>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                <DollarSign size={20} className="text-yellow-500" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                <TrendingUp size={10} /> +12.4%
              </div>
            </div>

            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Revenue</h3>
            <div className="text-4xl md:text-5xl font-black text-white tracking-tighter">
              <span className="text-yellow-500 text-2xl md:text-3xl font-bold">$</span>4,200
            </div>
          </div>

          <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Subs</span>
              <span className="text-[10px] md:text-xs font-black text-white">124 Users</span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden flex gap-1 p-[1px]">
              <div className="h-full bg-yellow-500 w-2/3 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              <div className="h-full bg-yellow-500/20 w-1/3 rounded-full" />
            </div>
          </div>
        </div>

        {/* User Engagement */}
        <div className="md:col-span-4 bg-[#0B0E14] border border-white/5 rounded-3xl p-5 shadow-2xl group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <Users size={18} className="text-blue-500" />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Users</div>
              <div className="text-xl md:text-2xl font-black text-white tracking-tight">1,240</div>
            </div>
          </div>
        </div>

        {/* Database Stats */}
        <div className="md:col-span-4 bg-[#0B0E14] border border-white/5 rounded-3xl p-5 shadow-2xl group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
              <Zap size={18} className="text-purple-500" />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">DB Size</div>
              <div className="text-xl md:text-2xl font-black text-white tracking-tight">57.3 MB</div>
            </div>
          </div>
        </div>

        {/* Terminal Logs (Optimized for Mobile) */}
        <div className="md:col-span-12 bg-[#080A0D] border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <Terminal size={16} className="text-slate-500" />
              <h3 className="text-xs md:text-lg font-bold text-white uppercase tracking-tight">Intelligence Stream</h3>
            </div>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="bg-black/40 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono text-[9px] md:text-[11px] leading-relaxed border border-white/5 max-h-[200px] md:max-h-[300px] overflow-y-auto scrollbar-hide">
            <div className="space-y-2 md:space-y-3">
              {[
                { time: '15:30:22', type: 'INFO', msg: 'Intelligence engine stabilized.', color: 'text-emerald-500' },
                { time: '15:28:10', type: 'WARN', msg: 'Local proxy detected origin mismatch.', color: 'text-yellow-500' },
                { time: '15:25:05', type: 'API', msg: 'Deep OCR scanning Match#1025.', color: 'text-purple-500' },
                { time: '15:25:01', type: 'DB', msg: 'User session validated via encrypted JWT.', color: 'text-blue-500' }
              ].map((log, i) => (
                <div key={i} className="flex gap-2 md:gap-4 group">
                  <span className="text-slate-600 shrink-0">{log.time}</span>
                  <span className={`${log.color} font-black shrink-0 w-8 md:w-12`}>[{log.type}]</span>
                  <span className="text-slate-400 group-hover:text-slate-200 transition-colors uppercase truncate">{log.msg}</span>
                </div>
              ))}
              <div className="flex gap-2 items-center text-emerald-500 animate-pulse mt-2">
                <div className="w-1 h-3 bg-emerald-500" />
                <span>Streaming...</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <footer className="pt-4 flex justify-between items-center text-[7px] md:text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">
        <span>AXION CORE SYSTEM</span>
        <div className="flex gap-3 md:gap-6">
          <span className="flex items-center gap-1"><Clock size={10} /> SYNC: OK</span>
          <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 size={10} /> SECURE</span>
        </div>
      </footer>
    </motion.div>
  );
}
