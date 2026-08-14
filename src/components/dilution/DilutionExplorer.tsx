import React from 'react';
import { CRYO_COMPONENTS } from '../../data/componentsData';
import { soundEngine } from '../../utils/audio';
import { Snowflake, ArrowDown, Shield, Thermometer } from 'lucide-react';

interface DilutionExplorerProps {
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

export const DilutionExplorer: React.FC<DilutionExplorerProps> = ({
  selectedComponentId,
  onSelectComponent,
}) => {
  const stagesList = [
    { id: 'top-flange', name: 'Room Temp Flange', temp: '300 K', tempNum: 300, color: 'from-amber-500 to-amber-600' },
    { id: 'stage-50k', name: '50 K Thermal Stage', temp: '50 K', tempNum: 50, color: 'from-amber-400 to-yellow-400' },
    { id: 'stage-4k', name: '4 K Cold Plate', temp: '4.2 K', tempNum: 4.2, color: 'from-cyan-400 to-blue-400' },
    { id: 'stage-1k', name: 'Still 1 K Stage', temp: '1.0 K', tempNum: 1.0, color: 'from-blue-400 to-indigo-400' },
    { id: 'stage-100mk', name: '100 mK Cold Plate', temp: '100 mK', tempNum: 0.1, color: 'from-indigo-400 to-purple-400' },
    { id: 'stage-10mk', name: 'Base Stage (QPU)', temp: '15 mK', tempNum: 0.015, color: 'from-cyan-300 to-teal-400' },
  ];

  const currentSelected = selectedComponentId ? CRYO_COMPONENTS[selectedComponentId] : CRYO_COMPONENTS['stage-10mk'];

  return (
    <div id="dilution-explorer-panel" className="flex flex-col h-full w-full bg-black/40 text-slate-100 border-l border-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Snowflake className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-white uppercase">DILUTION CRYOGENICS</h2>
            <p className="text-[9px] font-mono tracking-wider text-cyan-400">3He/4He Dilution Cooling Cascade (300K → 15mK)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Vertical Temperature Descent Indicator */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              TEMPERATURE DESCENT GRADIENT
            </span>
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-wider">
              Cascade
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {stagesList.map((st, idx) => {
              const isSelected = selectedComponentId === st.id;

              return (
                <React.Fragment key={st.id}>
                  <button
                    onClick={() => {
                      soundEngine.playCryoCooling();
                      onSelectComponent(st.id);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-500 text-[10px]">0{idx + 1}</span>
                      <span className={`font-semibold text-xs ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        {st.name}
                      </span>
                    </div>

                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                      isSelected ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/20' : 'border-white/5 text-slate-400 bg-black/40'
                    }`}>
                      {st.temp}
                    </span>
                  </button>

                  {idx < stagesList.length - 1 && (
                    <div className="flex justify-center my-0.5">
                      <ArrowDown className="w-3 h-3 text-slate-600 animate-bounce" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Cryogenic Stage Deep-Dive */}
        {currentSelected && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div>
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">{currentSelected.stage}</span>
                <h3 className="text-sm font-bold text-white tracking-wide">{currentSelected.name}</h3>
              </div>
              <div className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                {currentSelected.temperature}
              </div>
            </div>

            <div>
              <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase mb-1">PURPOSE</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{currentSelected.purpose}</p>
            </div>

            <div>
              <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase mb-1">THERMAL ROLE & PHYSICS</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{currentSelected.physicsDetails}</p>
            </div>

            <div>
              <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase mb-1">MATERIALS & HARDWARE</h4>
              <div className="flex flex-wrap gap-1.5">
                {currentSelected.materials.map((mat, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                    {mat}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase mb-1">CONNECTED SUBSYSTEMS</h4>
              <div className="flex flex-wrap gap-1.5">
                {currentSelected.connectedTo.map((conn, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {conn}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3He/4He Quantum Dilution Physics Callout */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] tracking-widest uppercase font-bold">
            <Shield className="w-3.5 h-3.5" />
            HOW DILUTION COOLING WORKS
          </div>
          <p className="text-slate-400 leading-relaxed text-xs">
            Below 0.87 K, a mixture of liquid Helium-3 and Helium-4 spontaneously separates into two phases: a lighter, concentrated Helium-3 phase floating on a heavier dilute phase.
          </p>
          <p className="text-slate-400 leading-relaxed text-xs">
            As Helium-3 atoms are pumped across the phase boundary into the dilute phase, they absorb the latent <span className="text-cyan-300 font-mono">enthalpy of mixing</span>—cooling the mixing chamber down to 15 millikelvin continuously without moving mechanical parts!
          </p>
        </div>
      </div>
    </div>
  );
};

