import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio';
import {
  Rotate3d,
  Play,
  Pause,
  Split,
  Eye,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Radio,
  MapPin,
  Maximize2,
  ChevronDown,
  Sparkles,
  Search,
} from 'lucide-react';

export interface ZoomLocation {
  id: string;
  name: string;
  shortName: string;
  category: string;
  target: [number, number, number];
  radius: number;
  componentId?: string;
  iconColor: string;
  temp?: string;
}

export const ZOOM_LOCATIONS: ZoomLocation[] = [
  {
    id: 'overview',
    name: 'Full Cryostat Chandelier',
    shortName: 'Full System',
    category: 'System',
    target: [0, 0.4, 0],
    radius: 7.8,
    iconColor: '#38bdf8',
    temp: '300K → 15mK',
  },
  {
    id: 'top-flange',
    name: 'Room Temp Flange & Vacuum Port',
    shortName: '300 K Flange',
    category: 'Stages',
    target: [0, 3.8, 0],
    radius: 3.8,
    componentId: 'top-flange',
    iconColor: '#f1f5f9',
    temp: '300 K',
  },
  {
    id: 'stage-50k',
    name: '50 K Thermal Flange & Shields',
    shortName: '50 K Stage',
    category: 'Stages',
    target: [0, 2.4, 0],
    radius: 3.2,
    componentId: 'stage-50k',
    iconColor: '#38bdf8',
    temp: '50 K',
  },
  {
    id: 'stage-4k',
    name: '4.2 K Main Cold Plate (Liquid He)',
    shortName: '4.2 K Plate',
    category: 'Stages',
    target: [0, 1.0, 0],
    radius: 2.8,
    componentId: 'stage-4k',
    iconColor: '#06b6d4',
    temp: '4.2 K',
  },
  {
    id: 'hemt-amps',
    name: 'Cryogenic HEMT Amplifiers (+40dB)',
    shortName: 'HEMT Amps',
    category: 'Electronics',
    target: [0.65, 1.2, 0.45],
    radius: 1.5,
    componentId: 'hemt-amps',
    iconColor: '#f59e0b',
    temp: '4 K',
  },
  {
    id: 'attenuators',
    name: 'RF Attenuator Cascade (-10 to -30dB)',
    shortName: 'Attenuators',
    category: 'Electronics',
    target: [0, 1.0, 1.1],
    radius: 1.8,
    componentId: 'attenuators',
    iconColor: '#fbbf24',
    temp: '50K - 15mK',
  },
  {
    id: 'stage-1k',
    name: 'Still (1.0 K) Distillation Unit',
    shortName: '1.0 K Still',
    category: 'Stages',
    target: [0, -0.2, 0],
    radius: 2.6,
    componentId: 'stage-1k',
    iconColor: '#22d3ee',
    temp: '0.88 K',
  },
  {
    id: 'stage-100mk',
    name: '100 mK Cold Plate & Exchangers',
    shortName: '100 mK Plate',
    category: 'Stages',
    target: [0, -1.3, 0],
    radius: 2.4,
    componentId: 'stage-100mk',
    iconColor: '#67e8f9',
    temp: '100 mK',
  },
  {
    id: 'circulators',
    name: 'Ferrite Microwave Circulators/Isolators',
    shortName: 'Circulators',
    category: 'Electronics',
    target: [0.45, -1.2, 0.45],
    radius: 1.5,
    componentId: 'circulators',
    iconColor: '#ec4899',
    temp: '100 mK',
  },
  {
    id: 'stage-10mk',
    name: 'Mixing Chamber Base Plate (Coldest Spot)',
    shortName: '15 mK Base',
    category: 'Stages',
    target: [0, -2.3, 0],
    radius: 2.2,
    componentId: 'stage-10mk',
    iconColor: '#a5f3fc',
    temp: '15 mK',
  },
  {
    id: 'qpu-package',
    name: 'QPU Golden Protective Package & Can',
    shortName: 'QPU Can Lid',
    category: 'QPU Core',
    target: [0, -2.7, 0],
    radius: 1.6,
    componentId: 'qpu-chip',
    iconColor: '#c084fc',
    temp: '15 mK',
  },
  {
    id: 'silicon-substrate',
    name: 'Silicon / Sapphire Chip Substrate',
    shortName: 'Silicon Substrate',
    category: 'QPU Core',
    target: [0, -2.7, 0],
    radius: 1.0,
    componentId: 'qpu-chip',
    iconColor: '#38bdf8',
    temp: '15 mK',
  },
  {
    id: 'transmon-qubits',
    name: '8-Transmon Qubit Core Lattice (Q0-Q7)',
    shortName: 'Transmons (Q0-7)',
    category: 'Quantum Micro',
    target: [0, -2.68, 0],
    radius: 0.75,
    componentId: 'qpu-chip',
    iconColor: '#00f0ff',
    temp: '15 mK',
  },
  {
    id: 'josephson-junctions',
    name: 'Sub-Kelvin Josephson SQUID Loops',
    shortName: 'Josephson SQUIDs',
    category: 'Quantum Micro',
    target: [0, -2.68, 0],
    radius: 0.52,
    componentId: 'qpu-chip',
    iconColor: '#e0e7ff',
    temp: '15 mK',
  },
  {
    id: 'cpw-resonators',
    name: 'CPW Readout Resonators & Purcell Filters',
    shortName: 'CPW Resonators',
    category: 'QPU Core',
    target: [0, -2.69, 0],
    radius: 0.9,
    componentId: 'qpu-chip',
    iconColor: '#facc15',
    temp: '15 mK',
  },
  {
    id: 'coax-cables',
    name: 'Superconducting NbTi & Silver Coaxial Lines',
    shortName: 'Coax Cabling',
    category: 'Wiring',
    target: [-0.6, 0.5, 0.6],
    radius: 2.2,
    componentId: 'coax-cables',
    iconColor: '#94a3b8',
    temp: 'Wiring',
  },
];

interface RightControlsProps {
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  explodedProgress: number;
  onChangeExplodedProgress: (val: number) => void;
  cutawayActive: boolean;
  onToggleCutaway: () => void;
  flowActive: boolean;
  onToggleFlow: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const RightControls: React.FC<RightControlsProps> = ({
  autoRotate,
  onToggleAutoRotate,
  explodedProgress,
  onChangeExplodedProgress,
  cutawayActive,
  onToggleCutaway,
  flowActive,
  onToggleFlow,
  onResetView,
  onZoomIn,
  onZoomOut,
}) => {
  const [showLocationMenu, setShowLocationMenu] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('overview');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSelectLocation = (loc: ZoomLocation) => {
    setSelectedLocationId(loc.id);
    setShowLocationMenu(false);
    soundEngine.playClick(950);

    // Dispatch focus event
    window.dispatchEvent(
      new CustomEvent('quantum-focus-spot', {
        detail: {
          target: loc.target,
          radius: loc.radius,
          componentId: loc.componentId,
        },
      })
    );
  };

  const filteredLocations = ZOOM_LOCATIONS.filter(
    l =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.temp && l.temp.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div
      id="quantum-right-controls"
      className="absolute right-4 top-20 z-20 flex flex-col gap-2 select-none font-mono text-xs"
    >
      {/* 3D View Modifiers Panel */}
      <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 backdrop-blur-xl shadow-2xl space-y-3 w-64">
        {/* Header */}
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Maximize2 className="w-3 h-3" />
            <span>3D VIEW & ZOOM</span>
          </span>
          <span className="text-[8px] text-slate-500 font-mono">360° PRECISION</span>
        </div>

        {/* 🎯 "ZOOM TO ANY PLACE" Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => {
              soundEngine.playClick(750);
              setShowLocationMenu(!showLocationMenu);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 hover:border-cyan-400 text-cyan-300 text-[10px] font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          >
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-bounce" />
              <span className="truncate">
                {ZOOM_LOCATIONS.find(l => l.id === selectedLocationId)?.shortName || 'Zoom to Place...'}
              </span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 shrink-0 transition-transform ${showLocationMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Location Picker Flyout Menu */}
          {showLocationMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-72 max-h-80 bg-slate-950/95 border border-cyan-500/40 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-2xl flex flex-col gap-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Search Bar */}
              <div className="relative px-1 pt-1 pb-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search any part/stage/chip..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-1">
                SELECT ANY PLACE TO ZOOM DIRECTLY
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto max-h-60 space-y-1 pr-1 custom-scrollbar">
                {filteredLocations.map(loc => {
                  const isSelected = selectedLocationId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 shadow-sm'
                          : 'hover:bg-white/5 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-semibold truncate flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: loc.iconColor }}
                          />
                          <span className="truncate">{loc.name}</span>
                        </span>
                        <span className="text-[8px] text-slate-500">{loc.category}</span>
                      </div>
                      {loc.temp && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 shrink-0">
                          {loc.temp}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Zoom Level Presets */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Zoom Levels</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 text-[9px]">
            <button
              onClick={() => {
                soundEngine.playClick(800);
                window.dispatchEvent(new CustomEvent('quantum-zoom-set', { detail: { radius: 0.8 } }));
              }}
              className="py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 text-center transition-colors"
              title="Microscopic close-up of chips and qubits"
            >
              Macro
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(800);
                window.dispatchEvent(new CustomEvent('quantum-zoom-set', { detail: { radius: 2.0 } }));
              }}
              className="py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 text-center transition-colors"
              title="Close inspection of components"
            >
              Detail
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(800);
                window.dispatchEvent(new CustomEvent('quantum-zoom-set', { detail: { radius: 3.5 } }));
              }}
              className="py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 text-center transition-colors"
              title="Thermal stage overview"
            >
              Stage
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(800);
                window.dispatchEvent(new CustomEvent('quantum-zoom-set', { detail: { radius: 7.8 } }));
              }}
              className="py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 text-center transition-colors"
              title="Whole quantum chandelier"
            >
              Full
            </button>
          </div>
        </div>

        {/* Action Buttons: Auto-Rotate, Shields, Signals */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          {/* Auto Rotate Button */}
          <button
            onClick={() => {
              soundEngine.playClick(800);
              onToggleAutoRotate();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-widest transition-all ${
              autoRotate
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>Rotate</span>
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${autoRotate ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-500'}`}>
              {autoRotate ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Cutaway Radiation Shielding Toggle */}
          <button
            onClick={() => {
              soundEngine.playClick(800);
              onToggleCutaway();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-widest transition-all ${
              cutawayActive
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              <span>Shields</span>
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${cutawayActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'}`}>
              {cutawayActive ? 'SHOW' : 'HIDE'}
            </span>
          </button>

          {/* ⚛ Qubit Signal Pulse Flow Toggle */}
          <button
            onClick={() => {
              soundEngine.playClick(850);
              onToggleFlow();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-widest transition-all ${
              flowActive
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Signals</span>
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${flowActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-500'}`}>
              {flowActive ? 'ACTIVE' : 'IDLE'}
            </span>
          </button>
        </div>

        {/* Exploded View Slider */}
        <div className="space-y-1.5 pt-1.5 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-1">
              <Split className="w-3 h-3 text-cyan-400" />
              <span>Exploded View</span>
            </span>
            <span className="text-cyan-400 font-bold">{(explodedProgress * 100).toFixed(0)}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={explodedProgress}
            onChange={e => onChangeExplodedProgress(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Fine Zoom In / Zoom Out / Reset Buttons */}
        <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-white/10">
          <button
            onClick={() => {
              soundEngine.playClick(700);
              onZoomIn();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center border border-white/10 transition-colors gap-1 text-[10px]"
            title="Zoom In (or scroll wheel up)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
            <span>In</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick(700);
              onZoomOut();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center border border-white/10 transition-colors gap-1 text-[10px]"
            title="Zoom Out (or scroll wheel down)"
          >
            <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
            <span>Out</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick(700);
              setSelectedLocationId('overview');
              onResetView();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center border border-white/10 transition-colors gap-1 text-[10px]"
            title="Reset Camera to default chandelier view"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset</span>
          </button>
        </div>

        {/* Helpful Interaction Tip */}
        <div className="text-[8px] text-slate-500 leading-relaxed pt-1 border-t border-white/5 font-sans">
          💡 <strong className="text-slate-400">Click / Double-click</strong> any spot to zoom into it. <strong className="text-slate-400">Right-click or 2-finger drag</strong> to pan up & down.
        </div>
      </div>
    </div>
  );
};

