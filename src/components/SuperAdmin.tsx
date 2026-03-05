import { motion } from 'motion/react';
import { Shield, Server, DollarSign, Users, Activity, Terminal } from 'lucide-react';

export default function SuperAdmin() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="space-y-6 pb-24"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="text-yellow-500" />
          Super Admin (AxisvIA)
        </h2>
        <div className="bg-yellow-500/10 text-yellow-500 text-[10px] font-mono px-2 py-1 rounded border border-yellow-500/20">
          v1.0.0-beta
        </div>
      </div>

      {/* System Health */}
      <div className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Server size={14} /> Estado del Sistema
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-black/20 p-2 rounded-lg border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase font-bold">CPU</div>
            <div className="text-white font-mono font-bold">12%</div>
          </div>
          <div className="bg-black/20 p-2 rounded-lg border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase font-bold">RAM</div>
            <div className="text-white font-mono font-bold">45%</div>
          </div>
          <div className="bg-black/20 p-2 rounded-lg border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase font-bold">API</div>
            <div className="text-emerald-500 font-mono font-bold">24ms</div>
          </div>
        </div>
      </div>

      {/* Revenue / Users */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-purple-500/10 w-24 h-24 rounded-full blur-2xl" />
          <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><Users size={12}/> Usuarios Totales</div>
          <div className="text-2xl font-black text-white">1,240</div>
          <div className="text-[10px] text-emerald-500 mt-1 font-bold">+12% vs mes anterior</div>
        </div>
        <div className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-yellow-500/10 w-24 h-24 rounded-full blur-2xl" />
          <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><DollarSign size={12}/> Ingresos (Est.)</div>
          <div className="text-2xl font-black text-yellow-500">$4,200</div>
          <div className="text-[10px] text-slate-400 mt-1 font-bold">Suscripciones Activas</div>
        </div>
      </div>

      {/* Logs / Activity */}
      <div className="bg-[#0F1115] border border-white/5 p-4 rounded-2xl">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Terminal size={14} /> Logs Recientes
        </h3>
        <div className="space-y-2 font-mono text-[10px]">
          <div className="flex gap-2 text-slate-400">
            <span className="text-slate-600">15:30:22</span>
            <span className="text-emerald-500">[INFO]</span>
            <span>Nuevo usuario registrado: User#9921</span>
          </div>
          <div className="flex gap-2 text-slate-400">
            <span className="text-slate-600">15:28:10</span>
            <span className="text-yellow-500">[WARN]</span>
            <span>Intento de login fallido IP: 192.168.1.1</span>
          </div>
          <div className="flex gap-2 text-slate-400">
            <span className="text-slate-600">15:25:05</span>
            <span className="text-purple-500">[API]</span>
            <span>Procesando captura Match#1025...</span>
          </div>
          <div className="flex gap-2 text-slate-400">
            <span className="text-slate-600">15:25:01</span>
            <span className="text-emerald-500">[INFO]</span>
            <span>Captura procesada correctamente (Gemini)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
