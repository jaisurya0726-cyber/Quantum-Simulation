import React, { useState } from 'react';
import { CRYO_COMPONENTS } from '../../data/componentsData';
import { soundEngine } from '../../utils/audio';
import { Layers, ChevronRight, ChevronDown, Cpu, Disc, Zap, Shield, Cable } from 'lucide-react';

interface LeftToolbarProps {
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  selectedComponentId,
  onSelectComponent,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const componentCategories = [
    {
      title: 'Cryogenic Plates',
      icon: <Disc className="w-3 h-3 text-amber-400" />,
      items: [
        { id: 'top-flange', label: 'Room Temp Flange (300 K)', temp: '300 K' },
        { id: 'stage-50k', label: '50 K Flange', temp: '50 K' },
        { id: 'stage-4k', label: '4 K Plate', temp: '4.2 K' },
        { id: 'stage-1k', label: 'Still 1 K Stage', temp: '1.0 K' },
        { id: 'stage-100mk', label: '100 mK Cold Plate', temp: '100 mK' },
        { id: 'stage-10mk', label: 'Mixing Chamber (15 mK)', temp: '15 mK' },
      ],
    },
    {
      title: 'Quantum Processor',
      icon: <Cpu className="w-3 h-3 text-cyan-400" />,
      items: [
        { id: 'qpu-chip', label: 'QPU Superconducting Chip', temp: '15 mK' },
      ],
    },
    {
      title: 'Microwave Electronics',
      icon: <Zap className="w-3 h-3 text-yellow-400" />,
      items: [
        { id: 'hemt-amps', label: 'HEMT Low-Noise Amps', temp: '4 K' },
        { id: 'attenuators', label: 'Cryogenic Attenuators', temp: '50K - 15mK' },
        { id: 'circulators', label: 'Ferrite Circulators', temp: '100 mK' },
      ],
    },
    {
      title: 'Cables & Shielding',
      icon: <Cable className="w-3 h-3 text-slate-400" />,
      items: [
        { id: 'coax-cables', label: 'Superconducting Coax Lines', temp: 'Gradient' },
        { id: 'radiation-shield', label: 'Radiation & Magnetic Shield', temp: 'Nested' },
      ],
    },
  ];

  return (
    <div
      id="quantum-left-toolbar"
      className={`absolute left-4 top-40 z-20 transition-all duration-300 select-none ${
        isOpen ? 'w-64' : 'w-10'
      }`}
    >
      <div className="bg-black/40 border border-white/5 rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Toolbar Header */}
        <button
          onClick={() => {
            soundEngine.playClick(750);
            setIsOpen(!isOpen);
          }}
          className="w-full flex items-center justify-between p-3 bg-white/5 text-[10px] tracking-widest uppercase font-bold text-white border-b border-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            {isOpen && <span>Hardware Tree</span>}
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {/* Tree List Content */}
        {isOpen && (
          <div className="p-2.5 space-y-3.5 max-h-[calc(100vh-210px)] overflow-y-auto font-mono text-xs">
            {componentCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] uppercase tracking-widest text-slate-500 font-semibold">
                  {cat.icon}
                  <span>{cat.title}</span>
                </div>

                <div className="space-y-1">
                  {cat.items.map(item => {
                    const isSelected = selectedComponentId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          soundEngine.playClick(900);
                          onSelectComponent(item.id);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all border ${
                          isSelected
                            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                            : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/5'
                        }`}
                      >
                        <span className="truncate pr-1 text-[11px]">{item.label}</span>
                        <span className={`text-[9px] shrink-0 font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-500'
                        }`}>
                          {item.temp}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

