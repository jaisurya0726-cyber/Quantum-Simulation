import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio';
import { ChevronLeft, ChevronRight, Layers, X } from 'lucide-react';

export interface GoldPlateInfo {
  id: string;
  name: string;
  shortName: string;
  temp: string;
  tempK: number;
  stageNumber: number;
  description: string;
  color: string;
}

export const GOLD_PLATES: GoldPlateInfo[] = [
  {
    id: 'top-flange',
    name: 'Room Temperature Flange',
    shortName: '300 K Plate',
    temp: '300 K (27°C)',
    tempK: 300,
    stageNumber: 1,
    description: 'Vacuum seal flange, gas handling ports & room-temp wiring interface.',
    color: '#e2e8f0',
  },
  {
    id: 'stage-50k',
    name: '50 K Thermal Flange',
    shortName: '50 K Plate',
    temp: '50 K (-223°C)',
    tempK: 50,
    stageNumber: 2,
    description: 'First pulse tube cryocooler cooling stage with -10 dB thermal attenuators.',
    color: '#38bdf8',
  },
  {
    id: 'stage-4k',
    name: '4.2 K Cold Plate',
    shortName: '4.2 K Plate',
    temp: '4.2 K (-269°C)',
    tempK: 4.2,
    stageNumber: 3,
    description: 'Liquid Helium temperature stage. Mounts low-noise HEMT microwave amplifiers.',
    color: '#06b6d4',
  },
  {
    id: 'stage-1k',
    name: 'Still (1.0 K) Stage',
    shortName: '1.0 K Still',
    temp: '0.88 K',
    tempK: 0.88,
    stageNumber: 4,
    description: 'Helium-3 distillation still for continuous dilution refrigeration circulation.',
    color: '#22d3ee',
  },
  {
    id: 'stage-100mk',
    name: '100 mK Cold Plate',
    shortName: '100 mK Plate',
    temp: '100 mK',
    tempK: 0.1,
    stageNumber: 5,
    description: 'Pre-cooling heat exchangers and ferrite microwave isolators/circulators.',
    color: '#67e8f9',
  },
  {
    id: 'stage-10mk',
    name: 'Mixing Chamber Base Plate',
    shortName: '15 mK Plate',
    temp: '15 mK (-273.13°C)',
    tempK: 0.015,
    stageNumber: 6,
    description: 'Ultra-cold thermodynamic base plate where 3He-4He phase separation produces millikelvin temperatures.',
    color: '#a5f3fc',
  },
  {
    id: 'qpu-chip',
    name: 'Superconducting QPU Package',
    shortName: 'QPU Core',
    temp: '15 mK Core',
    tempK: 0.015,
    stageNumber: 7,
    description: '8-Transmon superconducting qubit lattice with microwave coplanar waveguide resonators & Josephson junctions.',
    color: '#d946ef',
  },
];

interface GoldPlatesBarProps {
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  onExpandQpu?: () => void;
}

export const GoldPlatesBar: React.FC<GoldPlatesBarProps> = ({
  selectedComponentId,
  onSelectComponent,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const currentIndex = GOLD_PLATES.findIndex(p => p.id === selectedComponentId);
  const activePlate = currentIndex !== -1 ? GOLD_PLATES[currentIndex] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playClick(750);
    const prevIdx = currentIndex <= 0 ? GOLD_PLATES.length - 1 : currentIndex - 1;
    onSelectComponent(GOLD_PLATES[prevIdx].id);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playClick(850);
    const nextIdx = currentIndex === -1 || currentIndex >= GOLD_PLATES.length - 1 ? 0 : currentIndex + 1;
    onSelectComponent(GOLD_PLATES[nextIdx].id);
  };

  return (
    <div
      id="gold-plates-navigator"
      className="absolute top-4 left-4 z-20 font-mono select-none"
    >
      {/* Collapsed Side Button */}
      {!isExpanded ? (
        <div className="flex items-center gap-1.5 p-1 bg-black/75 border border-white/15 rounded-2xl backdrop-blur-xl shadow-2xl transition-all hover:border-amber-400/50 hover:bg-black/90">
          <button
            onClick={() => {
              soundEngine.playClick(900);
              setIsExpanded(true);
            }}
            className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/10 text-slate-200 hover:text-amber-200 transition-all text-xs"
            title="Open Cryo Plates Navigator"
          >
            <div className="w-5 h-5 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_10px_rgba(244,195,74,0.3)]">
              <Layers className="w-3 h-3 text-amber-400" />
            </div>

            <div className="flex flex-col items-start text-left leading-tight">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                CRYO PLATES
              </span>
              <span className="text-[9px] text-amber-300/90 font-medium">
                {activePlate ? `${activePlate.shortName} (${activePlate.temp})` : '7 Thermal Stages'}
              </span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Quick cycle arrows on side button */}
          <div className="flex items-center gap-0.5 border-l border-white/10 pl-1 pr-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all"
              title="Previous Plate"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all"
              title="Next Plate"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Side Bar */
        <div className="flex items-center gap-1.5 p-1.5 bg-black/85 border border-amber-400/30 rounded-2xl backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-left-3 duration-200 max-w-[90vw] overflow-x-auto">
          {/* Header Label + Close Button */}
          <div className="flex items-center gap-2 px-2.5 py-1 text-[10px] uppercase tracking-widest text-amber-300 font-bold border-r border-white/10 shrink-0">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>CRYO PLATES</span>
            <button
              onClick={() => {
                soundEngine.playClick(700);
                setIsExpanded(false);
              }}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all ml-1"
              title="Collapse to Side Button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Prev Arrow */}
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all shrink-0"
            title="Previous Cryo Plate"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* 6 Gold Plates + QPU Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {GOLD_PLATES.map(plate => {
              const isSelected = selectedComponentId === plate.id;
              const isQpu = plate.id === 'qpu-chip';

              return (
                <button
                  key={plate.id}
                  onClick={() => {
                    soundEngine.playClick(isSelected ? 950 : 800);
                    onSelectComponent(plate.id);
                  }}
                  className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? isQpu
                        ? 'border-fuchsia-500/80 bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.4)] scale-105'
                        : 'border-amber-400/80 bg-amber-400/20 text-amber-200 shadow-[0_0_20px_rgba(244,195,74,0.35)] scale-105'
                      : isQpu
                      ? 'border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-300/80 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/10'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-200'
                  }`}
                >
                  {/* Disc Indicator */}
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      isSelected
                        ? isQpu
                          ? 'bg-fuchsia-400 shadow-[0_0_8px_#d946ef] animate-pulse scale-125'
                          : 'bg-amber-400 shadow-[0_0_8px_#f4c34a] animate-pulse scale-125'
                        : isQpu
                        ? 'bg-fuchsia-500/40'
                        : 'bg-amber-400/40'
                    }`}
                  />

                  <div className="flex flex-col items-start leading-none">
                    <span className={`font-bold ${isSelected ? (isQpu ? 'text-fuchsia-100' : 'text-amber-100') : 'text-slate-200'}`}>
                      {plate.shortName}
                    </span>
                    <span className={`text-[8px] mt-0.5 ${isSelected ? (isQpu ? 'text-fuchsia-300 font-semibold' : 'text-amber-300 font-semibold') : 'text-slate-400'}`}>
                      {plate.temp}
                    </span>
                  </div>

                  {isQpu && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[8px] bg-fuchsia-500/30 text-fuchsia-300 font-bold border border-fuchsia-500/40 animate-pulse">
                      EXPAND
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNext}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all shrink-0"
            title="Next Cryo Plate"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
