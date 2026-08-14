import React from 'react';
import { AppMode, TelemetryData } from '../../types';
import { soundEngine } from '../../utils/audio';
import { Atom, Snowflake, Cpu, Radio, BookOpen, Volume2, VolumeX, ShieldCheck } from 'lucide-react';

interface TopNavProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  telemetry: TelemetryData;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentMode,
  onSelectMode,
  telemetry,
  isMuted,
  onToggleMute,
}) => {
  const modes: { id: AppMode; label: string; icon: React.ReactNode }[] = [
    { id: 'explore', label: '3D Explorer', icon: <Atom className="w-3.5 h-3.5" /> },
    { id: 'dilution', label: 'Dilution Stages', icon: <Snowflake className="w-3.5 h-3.5" /> },
    { id: 'qpu', label: 'QPU Core', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'flow', label: '⚛ Qubit Flow', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'tour', label: 'Learning Tour', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-16 w-full bg-black/40 border-b border-white/5 px-6 lg:px-8 flex items-center justify-between backdrop-blur-md z-40 select-none">
      {/* Brand Title with Glowing Pulsing Core Indicator */}
      <div className="flex items-center gap-3.5">
        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xs uppercase tracking-[0.35em] font-bold text-white">
              QUANTUM COMPUTER EXPLORER
            </h1>
            <span className="hidden sm:inline-block text-[8px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-semibold">
              DIGITAL TWIN
            </span>
          </div>
          <p className="text-[9px] font-mono tracking-wider text-slate-400">
            Cryogenic Dilution Refrigerator Simulator
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 bg-black/30 rounded-xl border border-white/5">
        {modes.map(m => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                soundEngine.playClick(900);
                onSelectMode(m.id);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] tracking-widest uppercase font-semibold transition-all ${
                isActive
                  ? 'border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Laboratory Live Telemetry Badges & Audio Toggle */}
      <div className="flex items-center gap-5 text-[10px] tracking-widest uppercase font-semibold">
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex flex-col items-end font-mono">
            <span className="text-cyan-400 text-[9px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              SYSTEM STATUS
            </span>
            <span className="text-white font-bold">{telemetry.baseTempMk.toFixed(1)} mK / ONLINE</span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex flex-col items-end font-mono">
            <span className="text-slate-400 text-[9px]">QUBIT FIDELITY</span>
            <span className="text-slate-200 font-bold">{telemetry.qpuCoherenceFidelity.toFixed(2)}%</span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex flex-col items-end font-mono">
            <span className="text-slate-400 text-[9px]">VACUUM</span>
            <span className="text-slate-300">1.2×10⁻⁷ mbar</span>
          </div>
        </div>

        <button
          onClick={onToggleMute}
          className={`p-2 rounded-lg border transition-all ${
            isMuted
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              : 'border-white/10 bg-white/5 text-cyan-400 hover:bg-white/10 hover:border-cyan-500/30'
          }`}
          title={isMuted ? 'Unmute Audio Engine' : 'Mute Sound Effects'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

