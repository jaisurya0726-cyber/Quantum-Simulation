import React, { useState } from 'react';
import { CRYO_COMPONENTS } from '../../data/componentsData';
import { soundEngine } from '../../utils/audio';
import { ArrowLeft, Thermometer, Zap, Layers, Cpu, FileText } from 'lucide-react';

interface ComponentInspectorProps {
  componentId: string;
  onClose: () => void;
}

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  componentId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'how' | 'physics' | 'temp' | 'connections'>('overview');

  const comp = CRYO_COMPONENTS[componentId];
  if (!comp) return null;

  return (
    <div
      id="quantum-component-inspector"
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-2xl bg-black/60 border border-white/10 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-slate-100 select-none animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      {/* Header with Back button and Temperature */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-3.5">
        <button
          onClick={() => {
            soundEngine.playClick(750);
            onClose();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono text-[10px] tracking-widest uppercase font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Quantum Computer</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-[9px] font-mono tracking-widest uppercase text-slate-500">{comp.stage || 'Hardware Subsystem'}</span>
          <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-cyan-400 font-mono text-xs font-bold shadow-inner">
            {comp.temperature}
          </span>
        </div>
      </div>

      {/* Component Title */}
      <div className="mb-3.5">
        <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">Component Details</div>
        <h2 className="text-base font-light text-white leading-tight flex items-center gap-2">
          <span>{comp.name}</span>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded uppercase">
            Active
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">{comp.description}</p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-white/5 text-[10px] uppercase tracking-wider font-semibold font-mono mb-3.5">
        {[
          { id: 'overview', label: 'Overview', icon: <FileText className="w-3 h-3" /> },
          { id: 'how', label: 'How It Works', icon: <Zap className="w-3 h-3" /> },
          { id: 'physics', label: 'Physics & Math', icon: <Cpu className="w-3 h-3" /> },
          { id: 'temp', label: 'Thermal Role', icon: <Thermometer className="w-3 h-3" /> },
          { id: 'connections', label: 'Connections', icon: <Layers className="w-3 h-3" /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playClick(900);
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="text-xs font-sans text-slate-300 max-h-48 overflow-y-auto pr-1 space-y-3">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
              <span className="font-mono text-cyan-400 font-semibold block text-[10px] tracking-wider uppercase">PRIMARY PURPOSE</span>
              <p className="leading-relaxed text-slate-300 text-xs">{comp.purpose}</p>
            </div>
            <div>
              <span className="font-mono text-slate-400 block mb-1.5 text-[9px] uppercase tracking-widest">FABRICATION MATERIALS:</span>
              <div className="flex flex-wrap gap-1.5">
                {comp.materials.map((mat, idx) => (
                  <span key={idx} className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                    {mat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'how' && (
          <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
            <span className="font-mono text-cyan-400 font-semibold block text-[10px] tracking-wider uppercase">OPERATIONAL MECHANISM</span>
            <p className="leading-relaxed text-slate-300 text-xs">{comp.howItWorks}</p>
          </div>
        )}

        {activeTab === 'physics' && (
          <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
            <span className="font-mono text-cyan-400 font-semibold block text-[10px] tracking-wider uppercase">QUANTUM & CRYOGENIC THERMODYNAMICS</span>
            <p className="leading-relaxed text-slate-300 text-xs">{comp.physicsDetails}</p>
          </div>
        )}

        {activeTab === 'temp' && (
          <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-2 font-mono">
            <span className="text-cyan-400 font-semibold block text-[10px] tracking-wider uppercase">THERMAL EQUILIBRIUM</span>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="text-slate-400">Nominal Operating Temp:</span>
              <span className="text-cyan-300 font-bold">{comp.temperature}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Absolute Kelvin Value:</span>
              <span className="text-white font-bold">{comp.tempKelvin} K</span>
            </div>
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-2">
            <span className="font-mono text-slate-400 block text-[9px] uppercase tracking-widest">INTERFACED HARDWARE:</span>
            <div className="grid grid-cols-2 gap-2">
              {comp.connectedTo.map((c, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono text-slate-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#06b6d4]" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

