import React, { useState, useEffect, useRef } from 'react';
import { QubitState, QuantumGateType } from '../../types';
import { applySingleGate, measureQubit } from '../../utils/quantumMath';
import { BlochSphere } from './BlochSphere';
import { soundEngine } from '../../utils/audio';
import {
  Cpu,
  Sparkles,
  Layers,
  Activity,
  Zap,
  RotateCcw,
  Sliders,
  Radio,
  Clock,
  Shield,
  Maximize2,
  Minimize2,
  X,
  Play,
  Waves,
  Atom,
} from 'lucide-react';

interface ExpandedQpuViewProps {
  qubitStates: QubitState[];
  setQubitStates: React.Dispatch<React.SetStateAction<QubitState[]>>;
  selectedQubitId: number | null;
  setSelectedQubitId: (id: number) => void;
  onClose?: () => void;
}

export const ExpandedQpuView: React.FC<ExpandedQpuViewProps> = ({
  qubitStates,
  setQubitStates,
  selectedQubitId,
  setSelectedQubitId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'gates' | 'entangle' | 'flux' | 'readout' | 'decay'>('layers');
  const [activeLayer, setActiveLayer] = useState<number>(2); // 1: Lid, 2: Transmons, 3: Resonators, 4: Josephson, 5: Base
  const [fluxBias, setFluxBias] = useState<number>(0.0); // Flux in units of Phi_0
  const [customTheta, setCustomTheta] = useState<number>(Math.PI / 2);
  const [isDecaySimulating, setIsDecaySimulating] = useState<boolean>(false);
  const [decayProgress, setDecayProgress] = useState<number>(0);
  const [controlQubitId, setControlQubitId] = useState<number>(0);
  const [targetQubitId, setTargetQubitId] = useState<number>(1);
  const [measurementLog, setMeasurementLog] = useState<{ qubitId: number; outcome: 0 | 1; time: string }[]>([]);

  const pulseCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeQubit = qubitStates.find(q => q.id === (selectedQubitId ?? 0)) || qubitStates[0];

  // Draw real-time microwave Gaussian / DRAG pulse envelope on the canvas
  useEffect(() => {
    const canvas = pulseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Gaussian Envelope (I-quadrature in cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sigma = width * 0.16;
    const center = width * 0.5;
    const amp = (height * 0.38);

    for (let x = 0; x < width; x++) {
      const gauss = Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(sigma, 2)));
      const carrier = Math.cos((x - center) * 0.25);
      const y = height / 2 - gauss * amp * carrier;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // DRAG Envelope (Q-quadrature derivative in fuchsia)
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const dGauss = (-(x - center) / (sigma * sigma)) * Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(sigma, 2)));
      const y = height / 2 - dGauss * amp * sigma * 0.6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [activeQubit, customTheta]);

  // Apply Gate Handler
  const handleApplyGate = (gate: QuantumGateType) => {
    soundEngine.playGateApplication(gate);
    setQubitStates(prev =>
      prev.map(q => {
        if (q.id === activeQubit.id) {
          return applySingleGate(q, gate);
        }
        return q;
      })
    );
  };

  // Custom Rotation Gate RX(theta)
  const handleApplyRx = (theta: number) => {
    soundEngine.playGateApplication('X');
    setQubitStates(prev =>
      prev.map(q => {
        if (q.id === activeQubit.id) {
          const cos = Math.cos(theta / 2);
          const sin = Math.sin(theta / 2);
          const newAlpha = {
            real: q.alpha.real * cos + q.beta.imag * sin,
            imag: q.alpha.imag * cos - q.beta.real * sin,
          };
          const newBeta = {
            real: q.beta.real * cos + q.alpha.imag * sin,
            imag: q.beta.imag * cos - q.alpha.real * sin,
          };
          const p1 = newBeta.real ** 2 + newBeta.imag ** 2;
          const newTheta = 2 * Math.acos(Math.max(0, Math.min(1, Math.sqrt(Math.max(0, 1 - p1)))));
          const newPhi = Math.atan2(newBeta.imag, newBeta.real) - Math.atan2(newAlpha.imag, newAlpha.real);
          return {
            ...q,
            alpha: newAlpha,
            beta: newBeta,
            theta: newTheta,
            phi: newPhi,
            appliedGates: [...q.appliedGates, `Rx(${(theta / Math.PI).toFixed(2)}π)`],
          };
        }
        return q;
      })
    );
  };

  // Apply Two-Qubit Entangler (CNOT / CZ)
  const handleEntangleQubits = (type: 'CNOT' | 'CZ') => {
    soundEngine.playGateApplication('CNOT');
    setQubitStates(prev => {
      const control = prev.find(q => q.id === controlQubitId);
      if (!control) return prev;

      const probControl1 = control.beta.real ** 2 + control.beta.imag ** 2;

      return prev.map(q => {
        if (q.id === targetQubitId) {
          let updated = q;
          if (probControl1 > 0.5) {
            updated = applySingleGate(q, type === 'CNOT' ? 'X' : 'Z');
          }
          return {
            ...updated,
            isEntangledWith: control.id,
            appliedGates: [...updated.appliedGates, `${type}(Q${control.id})`],
          };
        }
        if (q.id === control.id) {
          return {
            ...q,
            isEntangledWith: targetQubitId,
            appliedGates: [...q.appliedGates, `CTRL->Q${targetQubitId}`],
          };
        }
        return q;
      });
    });
  };

  // Projective Microwave Readout Measurement
  const handleMeasure = () => {
    const { updatedQubit, outcome } = measureQubit(activeQubit);
    soundEngine.playReadoutTone(outcome === 1);

    setQubitStates(prev => prev.map(q => (q.id === activeQubit.id ? updatedQubit : q)));

    setMeasurementLog(prev => [
      { qubitId: activeQubit.id, outcome, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9),
    ]);
  };

  // Reset All Qubits to Ground State |0>
  const handleReset = () => {
    soundEngine.playClick(600);
    setQubitStates(prev =>
      prev.map(q => ({
        ...q,
        alpha: { real: 1, imag: 0 },
        beta: { real: 0, imag: 0 },
        theta: 0,
        phi: 0,
        appliedGates: [],
        isEntangledWith: null,
      }))
    );
    setMeasurementLog([]);
    setDecayProgress(0);
    setIsDecaySimulating(false);
  };

  // Run T1 Relaxation Decoherence Decay Simulation
  const runDecaySimulation = () => {
    // First initialize into excited state |1>
    handleApplyGate('X');
    setIsDecaySimulating(true);
    setDecayProgress(0);

    const startTime = Date.now();
    const duration = 4000; // 4 seconds simulates ~250 us of T1 decay

    const decayInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const prog = Math.min(1, elapsed / duration);
      setDecayProgress(prog);

      // Exponential decay amplitude
      const prob1 = Math.exp(-prog * 4.0); // decay from 1 down to ~0.018
      const prob0 = 1 - prob1;

      setQubitStates(prev =>
        prev.map(q => {
          if (q.id === activeQubit.id) {
            const alphaReal = Math.sqrt(prob0);
            const betaReal = Math.sqrt(prob1);
            return {
              ...q,
              alpha: { real: alphaReal, imag: 0 },
              beta: { real: betaReal, imag: 0 },
              theta: 2 * Math.acos(alphaReal),
              phi: 0,
            };
          }
          return q;
        })
      );

      if (prog >= 1) {
        clearInterval(decayInterval);
        setIsDecaySimulating(false);
        soundEngine.playClick(700);
      }
    }, 50);
  };

  // Calculate transmon frequency modulated by magnetic flux Phi/Phi0
  // f_01(Phi) approx sqrt(8 * Ec * Ej * |cos(pi * Phi/Phi0)|) - Ec
  const baseFreq = activeQubit.frequencyGhz;
  const modulatedFreq = baseFreq * Math.sqrt(Math.max(0.08, Math.abs(Math.cos(Math.PI * fluxBias))));
  const ejEnergyGhz = (modulatedFreq + 0.28) ** 2 / (8 * 0.28);

  const prob0 = activeQubit.alpha.real ** 2 + activeQubit.alpha.imag ** 2;
  const prob1 = activeQubit.beta.real ** 2 + activeQubit.beta.imag ** 2;

  return (
    <div
      id="expanded-qpu-suite"
      className="flex flex-col h-full w-full bg-black/80 text-slate-100 border-l border-white/10 backdrop-blur-2xl overflow-hidden font-sans"
    >
      {/* Top Banner Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.3)]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold font-mono tracking-widest text-white uppercase">
                QPU INTERNAL ARCHITECTURE
              </h2>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                3D EXPANDED
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-400">
              8-Transmon Superconducting Lattice @ 14.8 mK
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[10px] font-bold uppercase transition-all"
            title="Reset Lattice to |0>"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Close QPU Suite"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Mode Tabs */}
      <div className="flex border-b border-white/10 text-[9px] uppercase tracking-wider font-bold font-mono bg-black/40 shrink-0 overflow-x-auto">
        {[
          { id: 'layers', label: '3D Layers', icon: <Layers className="w-3 h-3" /> },
          { id: 'gates', label: 'Microwave Gates', icon: <Waves className="w-3 h-3" /> },
          { id: 'entangle', label: 'Couplers & CNOT', icon: <Sparkles className="w-3 h-3" /> },
          { id: 'flux', label: 'Flux Tuning', icon: <Sliders className="w-3 h-3" /> },
          { id: 'readout', label: 'Readout S₂₁', icon: <Radio className="w-3 h-3" /> },
          { id: 'decay', label: 'T₁ Decoherence', icon: <Clock className="w-3 h-3" /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playClick(850);
                setActiveTab(tab.id as any);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-fuchsia-400 text-fuchsia-300 bg-fuchsia-500/10 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 8-Qubit Matrix Selector (Always accessible at top of action pane) */}
      <div className="p-3 border-b border-white/10 bg-black/30 shrink-0">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-2">
          <span>SELECT ACTIVE TRANSMON</span>
          <span className="text-cyan-400 font-bold">
            {activeQubit.label} ({activeQubit.frequencyGhz.toFixed(2)} GHz)
          </span>
        </div>

        <div className="grid grid-cols-8 gap-1">
          {qubitStates.map(q => {
            const isSel = q.id === activeQubit.id;
            const p1 = q.beta.real ** 2 + q.beta.imag ** 2;

            return (
              <button
                key={q.id}
                onClick={() => {
                  soundEngine.playClick(800);
                  setSelectedQubitId(q.id);
                }}
                className={`py-1 px-0.5 rounded-lg border text-center font-mono transition-all ${
                  isSel
                    ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.3)] scale-105'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="text-[10px] font-bold">{q.label}</div>
                <div className="text-[8px] opacity-80">{(p1 * 100).toFixed(0)}%</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Action Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* ==================== 1. 3D LAYERS BREAKDOWN ==================== */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                EXPLODED PHYSICAL LAYERS
              </h3>
              <p className="text-[10px] text-slate-400 mb-3">
                The superconducting quantum processor consists of 5 precision-engineered micro-layers separated in 3D:
              </p>

              <div className="space-y-2">
                {[
                  {
                    id: 1,
                    title: 'Layer 1: Cryoperm & OFHC Gold Lid',
                    badge: 'MAGNETIC SHIELD',
                    desc: 'Shields delicate superconducting qubits from Earth’s magnetic field and stray infrared thermal radiation.',
                    color: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
                  },
                  {
                    id: 2,
                    title: 'Layer 2: 8-Transmon Qubit Matrix',
                    badge: 'COHERENT LATTICE',
                    desc: 'Thin-film Aluminum transmon crosses on high-resistivity silicon. Non-linear artificial two-level quantum systems.',
                    color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
                  },
                  {
                    id: 3,
                    title: 'Layer 3: CPW Readout Resonators & Purcell Filters',
                    badge: 'READOUT BUS',
                    desc: 'Quarter-wave Coplanar Waveguide (CPW) meander cavities coupled to transmons for dispersive microwave readout.',
                    color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
                  },
                  {
                    id: 4,
                    title: 'Layer 4: Al/AlOx/Al Josephson Junctions & SQUIDs',
                    badge: 'NON-LINEAR CORE',
                    desc: 'Sub-micron shadow-evaporated tunnel junctions that provide the anharmonicity needed to isolate states |0⟩ and |1⟩.',
                    color: 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10',
                  },
                  {
                    id: 5,
                    title: 'Layer 5: OFHC Copper Base Puck & SMA Ports',
                    badge: 'MICROWAVE PACKAGE',
                    desc: 'Gold wirebond pads and 8x multi-channel coaxial SMA launchers connecting directly to dilution refrigerator cables.',
                    color: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10',
                  },
                ].map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => {
                      soundEngine.playClick(800);
                      setActiveLayer(layer.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeLayer === layer.id
                        ? `${layer.color} shadow-lg scale-[1.01]`
                        : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs">{layer.title}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white/10 text-slate-300">
                        {layer.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">{layer.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloch Sphere Live Preview */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>ACTIVE STATE VECTOR |ψ⟩</span>
                <span className="text-cyan-400">
                  {activeQubit.alpha.real.toFixed(2)}|0⟩ + {activeQubit.beta.real.toFixed(2)}|1⟩
                </span>
              </div>
              <BlochSphere theta={activeQubit.theta} phi={activeQubit.phi} qubitLabel={activeQubit.label} />
            </div>
          </div>
        )}

        {/* ==================== 2. MICROWAVE GATES ==================== */}
        {activeTab === 'gates' && (
          <div className="space-y-3.5">
            {/* Gate Pulse Toolbar */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-white tracking-wider">
                  DISCRETE QUANTUM GATES
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Target: {activeQubit.label}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleApplyGate('H')}
                  className="p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-center transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                >
                  <div className="text-xs">H (Hadamard)</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Superposition (|0⟩+|1⟩)/√2</div>
                </button>

                <button
                  onClick={() => handleApplyGate('X')}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-center transition-all"
                >
                  <div className="text-xs">X (Pauli-X)</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Bit Flip / π-pulse</div>
                </button>

                <button
                  onClick={() => handleApplyGate('Y')}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-center transition-all"
                >
                  <div className="text-xs">Y (Pauli-Y)</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Y-axis π-rotation</div>
                </button>

                <button
                  onClick={() => handleApplyGate('Z')}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-center transition-all"
                >
                  <div className="text-xs">Z (Pauli-Z)</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Phase-Flip (|1⟩ → -|1⟩)</div>
                </button>

                <button
                  onClick={() => handleApplyGate('S')}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-center transition-all"
                >
                  <div className="text-xs">S (Phase)</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">+π/2 Z-rotation</div>
                </button>

                <button
                  onClick={() => handleApplyGate('T')}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-center transition-all"
                >
                  <div className="text-xs">T (π/4 Gate)</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Non-Clifford Gate</div>
                </button>
              </div>

              {/* Arbitrary Rotation RX(theta) Slider */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-bold">ARBITRARY ROTATION Rx(θ)</span>
                  <span className="text-fuchsia-400 font-bold font-mono">
                    θ = {(customTheta / Math.PI).toFixed(2)}π ({(customTheta * (180 / Math.PI)).toFixed(0)}°)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={Math.PI * 2}
                    step="0.05"
                    value={customTheta}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setCustomTheta(val);
                      handleApplyRx(val);
                    }}
                    className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
                  />
                  <button
                    onClick={() => handleApplyRx(customTheta)}
                    className="px-2.5 py-1 rounded bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold text-[9px] uppercase tracking-wider"
                  >
                    Pulse
                  </button>
                </div>
              </div>
            </div>

            {/* Microwave AWG Pulse Waveform Canvas */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5" />
                  MICROWAVE AWG ENVELOPE (DRAG PULSE)
                </span>
                <span className="text-[9px] text-slate-400">Duration: 20 ns</span>
              </div>

              <div className="w-full h-24 bg-black/60 rounded-lg border border-white/10 overflow-hidden relative">
                <canvas ref={pulseCanvasRef} width={420} height={96} className="w-full h-full" />
                <div className="absolute top-1 right-2 flex items-center gap-3 text-[8px] font-mono">
                  <span className="text-cyan-400">■ I (Envelope)</span>
                  <span className="text-fuchsia-400">■ Q (DRAG Correction)</span>
                </div>
              </div>

              <div className="text-[9px] text-slate-400">
                DRAG (Derivative Removal by Adiabatic Gate) suppresses leakage into the higher |2⟩ non-computational state.
              </div>
            </div>

            {/* State Probabilities */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Probability |0⟩:</span>
                <span className="text-cyan-400 font-bold">{(prob0 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] transition-all duration-300" style={{ width: `${prob0 * 100}%` }} />
              </div>

              <div className="flex justify-between text-slate-300 pt-1">
                <span>Probability |1⟩:</span>
                <span className="text-fuchsia-400 font-bold">{(prob1 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-fuchsia-500 shadow-[0_0_8px_#d946ef] transition-all duration-300" style={{ width: `${prob1 * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. COUPLERS & ENTANGLEMENT ==================== */}
        {activeTab === 'entangle' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                TUNABLE COUPLER ENTANGLEMENT ENGINE
              </h3>
              <p className="text-[10px] text-slate-400">
                Superconducting flux pulses modulate the inter-qubit coupling capacitance to synthesize 2-qubit entangling gates:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">Control Qubit</label>
                  <select
                    value={controlQubitId}
                    onChange={e => setControlQubitId(parseInt(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  >
                    {qubitStates.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.label} ({q.frequencyGhz.toFixed(1)} GHz)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">Target Qubit</label>
                  <select
                    value={targetQubitId}
                    onChange={e => setTargetQubitId(parseInt(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  >
                    {qubitStates.map(q => (
                      <option key={q.id} value={q.id} disabled={q.id === controlQubitId}>
                        {q.label} ({q.frequencyGhz.toFixed(1)} GHz)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleEntangleQubits('CNOT')}
                  className="py-2.5 px-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 font-bold text-center transition-all shadow-[0_0_12px_rgba(217,70,239,0.2)]"
                >
                  <div className="text-xs">Apply CNOT</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Controlled-X Gate</div>
                </button>

                <button
                  onClick={() => handleEntangleQubits('CZ')}
                  className="py-2.5 px-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-center transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                >
                  <div className="text-xs">Apply Controlled-Z</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Phase-Entangling Gate</div>
                </button>
              </div>
            </div>

            {/* Bell State Shortcut */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                PRESET BELL STATE GENERATOR
              </div>
              <p className="text-[10px] text-slate-400">
                Creates maximum bipartite entanglement: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2
              </p>
              <button
                onClick={() => {
                  handleReset();
                  setTimeout(() => {
                    handleApplyGate('H');
                    setTimeout(() => handleEntangleQubits('CNOT'), 100);
                  }, 50);
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-bold uppercase tracking-wider text-[10px] shadow-lg transition-all"
              >
                Synthesize Bell State |Φ⁺⟩ on Q{controlQubitId} & Q{targetQubitId}
              </button>
            </div>
          </div>
        )}

        {/* ==================== 4. FLUX TUNING ==================== */}
        {activeTab === 'flux' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  MAGNETIC FLUX BIAS TUNER
                </h3>
                <span className="text-[9px] text-cyan-400">Φ₀ = h / 2e = 2.067×10⁻¹⁵ Wb</span>
              </div>

              <p className="text-[10px] text-slate-400">
                Adjusting the DC magnetic flux threading the SQUID loop modulates the Josephson inductance LJ(Φ), tuning the transmon frequency:
              </p>

              {/* Flux Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300">Magnetic Flux Bias (Φ / Φ₀):</span>
                  <span className="text-amber-400 font-bold">{fluxBias.toFixed(3)} Φ₀</span>
                </div>
                <input
                  type="range"
                  min="-0.48"
                  max="0.48"
                  step="0.01"
                  value={fluxBias}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setFluxBias(val);
                  }}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[8px] text-slate-500">
                  <span>-0.5 Φ₀ (Sweet Spot)</span>
                  <span>0.0 Φ₀ (Max Freq)</span>
                  <span>+0.5 Φ₀ (Sweet Spot)</span>
                </div>
              </div>

              {/* Physics Readout Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-slate-400">Modulated Frequency:</div>
                  <div className="text-xs font-bold text-cyan-300 mt-0.5">{modulatedFreq.toFixed(3)} GHz</div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-slate-400">Josephson Energy (E_J):</div>
                  <div className="text-xs font-bold text-amber-300 mt-0.5">{ejEnergyGhz.toFixed(2)} GHz</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. DISPERSIVE READOUT ==================== */}
        {activeTab === 'readout' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  DISPERSIVE CPW READOUT
                </h3>
                <button
                  onClick={handleMeasure}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  <Activity className="w-3 h-3" />
                  <span>Measure Now</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                Microwave probe tone reflects off the readout resonator with a state-dependent phase shift χ = g² / Δ:
              </p>

              {/* Simulated S21 Resonance Curve */}
              <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Transmission Dip |S₂₁(ω)|:</span>
                  <span className="text-emerald-400 font-bold">Shift 2χ = 4.2 MHz</span>
                </div>

                <div className="h-16 w-full flex items-center justify-center relative border border-white/10 rounded bg-slate-950/80">
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-white/10" />
                  {/* State 0 Dip */}
                  <div
                    className={`absolute w-3 h-10 rounded-full border-2 transition-all ${
                      prob0 > 0.5 ? 'border-cyan-400 bg-cyan-500/30 scale-110 shadow-[0_0_10px_#06b6d4]' : 'border-slate-700 bg-slate-800/30'
                    }`}
                    style={{ left: '35%' }}
                  />
                  {/* State 1 Dip */}
                  <div
                    className={`absolute w-3 h-10 rounded-full border-2 transition-all ${
                      prob1 > 0.5 ? 'border-fuchsia-400 bg-fuchsia-500/30 scale-110 shadow-[0_0_10px_#d946ef]' : 'border-slate-700 bg-slate-800/30'
                    }`}
                    style={{ left: '65%' }}
                  />
                  <span className="absolute bottom-1 left-4 text-[8px] text-cyan-400 font-mono">f_res(|0⟩) = 6.802 GHz</span>
                  <span className="absolute bottom-1 right-4 text-[8px] text-fuchsia-400 font-mono">f_res(|1⟩) = 6.806 GHz</span>
                </div>
              </div>

              {/* Log */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1.5">RECENT MEASUREMENT OUTCOMES</div>
                {measurementLog.length === 0 ? (
                  <div className="text-[10px] text-slate-500 text-center py-2">Click 'Measure Now' to perform dispersive readout.</div>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {measurementLog.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center px-2.5 py-1 rounded bg-black/40 border border-white/5 text-[10px]">
                        <span className="text-slate-400">Q{m.qubitId} @ {m.time}</span>
                        <span className={`font-bold px-1.5 py-0.2 rounded ${m.outcome === 1 ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                          State: |{m.outcome}⟩
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. DECOHERENCE DECAY ==================== */}
        {activeTab === 'decay' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  T₁ RELAXATION & T₂* DEPHASING
                </h3>

                <button
                  disabled={isDecaySimulating}
                  onClick={runDecaySimulation}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-black font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 disabled:opacity-40 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isDecaySimulating ? 'Simulating...' : 'Run T₁ Decay'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                Observe the exponential decay of excited state population P(1) = exp(-t / T₁) caused by environmental thermal phonon interactions:
              </p>

              {/* Progress and Decay curve */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300">Decoherence Progress:</span>
                  <span className="text-rose-400 font-bold">{(decayProgress * 100).toFixed(0)}% (t ≈ {(decayProgress * 250).toFixed(0)} μs)</span>
                </div>

                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all duration-75"
                    style={{ width: `${decayProgress * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-slate-400">T₁ Relaxation Time:</span>
                    <div className="text-xs font-bold text-cyan-300 mt-0.5">{activeQubit.t1Microseconds} μs</div>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-slate-400">T₂* Dephasing Time:</span>
                    <div className="text-xs font-bold text-fuchsia-300 mt-0.5">{activeQubit.t2Microseconds} μs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
