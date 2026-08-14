import React, { useState } from 'react';
import { QubitState, QuantumGateType } from '../../types';
import { applySingleGate, measureQubit } from '../../utils/quantumMath';
import { BlochSphere } from './BlochSphere';
import { soundEngine } from '../../utils/audio';
import { Play, RotateCcw, Cpu, Sparkles, Activity, Layers } from 'lucide-react';

interface QpuSimulatorProps {
  qubitStates: QubitState[];
  setQubitStates: React.Dispatch<React.SetStateAction<QubitState[]>>;
  selectedQubitId: number | null;
  setSelectedQubitId: (id: number) => void;
}

export const QpuSimulator: React.FC<QpuSimulatorProps> = ({
  qubitStates,
  setQubitStates,
  selectedQubitId,
  setSelectedQubitId,
}) => {
  const [activeTab, setActiveTab] = useState<'qubits' | 'circuit' | 'workflow'>('qubits');
  const [measurementHistory, setMeasurementHistory] = useState<{ qubitId: number; outcome: 0 | 1; time: string }[]>([]);
  const [isSimulatingWorkflow, setIsSimulatingWorkflow] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(0);

  const activeQubit = qubitStates.find(q => q.id === (selectedQubitId ?? 0)) || qubitStates[0];

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

  const handleApplyCnot = (targetId: number) => {
    soundEngine.playGateApplication('CNOT');
    setQubitStates(prev => {
      const control = prev.find(q => q.id === activeQubit.id);
      if (!control) return prev;

      // If control has amplitude in |1>, invert target
      const probControl1 = control.beta.real * control.beta.real + control.beta.imag * control.beta.imag;

      return prev.map(q => {
        if (q.id === targetId) {
          let updated = q;
          if (probControl1 > 0.5) {
            updated = applySingleGate(q, 'X');
          }
          return {
            ...updated,
            isEntangledWith: control.id,
            appliedGates: [...updated.appliedGates, `CNOT(${control.label})`],
          };
        }
        if (q.id === control.id) {
          return {
            ...q,
            isEntangledWith: targetId,
            appliedGates: [...q.appliedGates, `CTRL->Q${targetId}`],
          };
        }
        return q;
      });
    });
  };

  const handleMeasure = () => {
    const { updatedQubit, outcome } = measureQubit(activeQubit);
    soundEngine.playReadoutTone(outcome === 1);

    setQubitStates(prev => prev.map(q => (q.id === activeQubit.id ? updatedQubit : q)));

    setMeasurementHistory(prev => [
      { qubitId: activeQubit.id, outcome, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9),
    ]);
  };

  const handleResetAll = () => {
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
    setMeasurementHistory([]);
  };

  const runPresetAlgorithm = (algo: 'bell' | 'ghz' | 'superposition' | 'grover') => {
    handleResetAll();
    setTimeout(() => {
      soundEngine.playGateApplication('H');
      if (algo === 'bell') {
        setQubitStates(prev => {
          const q0 = applySingleGate(prev[0], 'H');
          const q1 = {
            ...prev[1],
            alpha: { real: 1 / Math.SQRT2, imag: 0 },
            beta: { real: 1 / Math.SQRT2, imag: 0 },
            theta: Math.PI / 2,
            phi: 0,
            isEntangledWith: 0,
            appliedGates: ['CNOT(Q0)'],
          };
          return prev.map(q => (q.id === 0 ? { ...q0, isEntangledWith: 1 } : q.id === 1 ? q1 : q));
        });
      } else if (algo === 'ghz') {
        setQubitStates(prev =>
          prev.map(q => {
            if (q.id <= 2) {
              return {
                ...applySingleGate(q, 'H'),
                isEntangledWith: q.id === 0 ? 1 : 0,
                appliedGates: q.id === 0 ? ['H', 'CTRL->Q1,Q2'] : ['CNOT(Q0)'],
              };
            }
            return q;
          })
        );
      } else if (algo === 'superposition') {
        setQubitStates(prev => prev.map(q => applySingleGate(q, 'H')));
      } else if (algo === 'grover') {
        setQubitStates(prev => {
          const q0 = applySingleGate(applySingleGate(prev[0], 'H'), 'X');
          const q1 = applySingleGate(applySingleGate(prev[1], 'H'), 'X');
          return prev.map(q => (q.id === 0 ? q0 : q.id === 1 ? q1 : q));
        });
      }
    }, 150);
  };

  const runStepWorkflow = () => {
    setIsSimulatingWorkflow(true);
    setWorkflowStep(1);

    const steps = [
      () => { soundEngine.playClick(700); setWorkflowStep(1); },
      () => { soundEngine.playMicrowavePulse(1100); setWorkflowStep(2); },
      () => { soundEngine.playGateApplication('H'); handleApplyGate('H'); setWorkflowStep(3); },
      () => { soundEngine.playGateApplication('CNOT'); handleApplyCnot((activeQubit.id + 1) % 8); setWorkflowStep(4); },
      () => { soundEngine.playReadoutTone(true); handleMeasure(); setWorkflowStep(5); },
      () => { setIsSimulatingWorkflow(false); setWorkflowStep(6); },
    ];

    steps.forEach((fn, idx) => {
      setTimeout(fn, (idx + 1) * 900);
    });
  };

  const prob0 = activeQubit.alpha.real ** 2 + activeQubit.alpha.imag ** 2;
  const prob1 = activeQubit.beta.real ** 2 + activeQubit.beta.imag ** 2;

  return (
    <div id="qpu-working-mode-panel" className="flex flex-col h-full w-full bg-black/40 text-slate-100 border-l border-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-white uppercase">QPU CONTROLLER</h2>
            <p className="text-[9px] font-mono tracking-wider text-cyan-400">8-Transmon Superconducting Lattice (15 mK)</p>
          </div>
        </div>

        <button
          onClick={handleResetAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase font-bold rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
          title="Reset all qubits to |0>"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="flex border-b border-white/5 text-[10px] uppercase tracking-widest font-semibold font-mono bg-black/20">
        <button
          onClick={() => setActiveTab('qubits')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === 'qubits' ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/10' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Lattice
        </button>
        <button
          onClick={() => setActiveTab('circuit')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === 'circuit' ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/10' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Circuits
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === 'workflow' ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/10' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Pulse Workflow
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === 'qubits' && (
          <>
            {/* 2x4 Qubit Lattice Grid */}
            <div className="space-y-2">
              <div className="text-[9px] font-mono tracking-widest uppercase text-slate-500 flex items-center justify-between">
                <span>CHIP TOPOLOGY (2x4 MATRIX)</span>
                <span className="text-cyan-400">Select target</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {qubitStates.map(q => {
                  const p1 = q.beta.real ** 2 + q.beta.imag ** 2;
                  const isSel = q.id === activeQubit.id;

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        soundEngine.playClick(850);
                        setSelectedQubitId(q.id);
                      }}
                      className={`relative p-2.5 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-mono font-bold ${isSel ? 'text-cyan-300' : 'text-white'}`}>
                          {q.label}
                        </span>
                        {q.isEntangledWith !== null && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                            Q{q.isEntangledWith}
                          </span>
                        )}
                      </div>

                      {/* State preview bar */}
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-300"
                          style={{ width: `${Math.max(6, p1 * 100)}%` }}
                        />
                      </div>

                      <div className="text-[9px] font-mono text-slate-400 flex justify-between">
                        <span>P(1): {(p1 * 100).toFixed(0)}%</span>
                        <span className="text-slate-500">{q.frequencyGhz.toFixed(1)}G</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Qubit Controller */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" />
                    Target Qubit: {activeQubit.label}
                  </h3>
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                    Freq: {activeQubit.frequencyGhz.toFixed(2)} GHz • T₁: {activeQubit.t1Microseconds} μs • T₂: {activeQubit.t2Microseconds} μs
                  </p>
                </div>

                <div className="text-right font-mono text-xs text-cyan-400 font-bold">
                  |ψ⟩ = {activeQubit.alpha.real.toFixed(2)}|0⟩ + {activeQubit.beta.real.toFixed(2)}|1⟩
                </div>
              </div>

              {/* Quantum Gates Toolbar */}
              <div>
                <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase mb-2 block">MICROWAVE PULSE GATES</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleApplyGate('H')}
                    className="py-2 px-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] text-center"
                    title="Hadamard: Creates equal superposition (|0> + |1>)/sqrt(2)"
                  >
                    H (Hadamard)
                  </button>
                  <button
                    onClick={() => handleApplyGate('X')}
                    className="py-2 px-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold transition-all text-center"
                    title="Pauli-X: Bit-flip NOT gate (|0> <-> |1>)"
                  >
                    X (NOT)
                  </button>
                  <button
                    onClick={() => handleApplyGate('Z')}
                    className="py-2 px-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold transition-all text-center"
                    title="Pauli-Z: Phase-flip gate"
                  >
                    Z (Phase)
                  </button>
                  <button
                    onClick={() => handleApplyGate('S')}
                    className="py-2 px-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold transition-all text-center"
                    title="S Gate: +pi/2 phase rotation"
                  >
                    S (π/2)
                  </button>
                </div>

                {/* 2-Qubit Entanglement & Measurement */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => handleApplyCnot((activeQubit.id + 1) % 8)}
                    className="px-3 py-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(217,70,239,0.15)]"
                    title="Apply CNOT with adjacent qubit as target"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>CNOT ⟷ Q{(activeQubit.id + 1) % 8}</span>
                  </button>

                  <button
                    onClick={handleMeasure}
                    className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                    title="Perform projective microwave measurement"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Measure Qubit</span>
                  </button>
                </div>
              </div>

              {/* Bloch Sphere Visualizer */}
              <div className="pt-1">
                <BlochSphere
                  theta={activeQubit.theta}
                  phi={activeQubit.phi}
                  qubitLabel={activeQubit.label}
                />
              </div>

              {/* State Probabilities */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Probability of |0⟩:</span>
                  <span className="text-cyan-400 font-bold">{(prob0 * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] transition-all duration-300" style={{ width: `${prob0 * 100}%` }} />
                </div>

                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Probability of |1⟩:</span>
                  <span className="text-fuchsia-400 font-bold">{(prob1 * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 shadow-[0_0_8px_#d946ef] transition-all duration-300" style={{ width: `${prob1 * 100}%` }} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'circuit' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                PRESET QUANTUM ALGORITHMS
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Load benchmark quantum state circuits directly onto the physical transmon matrix:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => runPresetAlgorithm('bell')}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-left transition-all"
                >
                  <div className="text-xs font-mono font-bold text-white">Bell State |Φ⁺⟩</div>
                  <div className="text-[10px] text-slate-400 mt-1">Entangles Q0 and Q1 into (|00⟩ + |11⟩)/√2</div>
                </button>

                <button
                  onClick={() => runPresetAlgorithm('ghz')}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-left transition-all"
                >
                  <div className="text-xs font-mono font-bold text-white">GHZ 3-Qubit State</div>
                  <div className="text-[10px] text-slate-400 mt-1">Tripartite entanglement: (|000⟩ + |111⟩)/√2</div>
                </button>

                <button
                  onClick={() => runPresetAlgorithm('superposition')}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-left transition-all"
                >
                  <div className="text-xs font-mono font-bold text-white">Superposition Sweep</div>
                  <div className="text-[10px] text-slate-400 mt-1">Applies Hadamard across all 8 qubits (2⁸ = 256 states)</div>
                </button>

                <button
                  onClick={() => runPresetAlgorithm('grover')}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-left transition-all"
                >
                  <div className="text-xs font-mono font-bold text-white">Grover's Oracle</div>
                  <div className="text-[10px] text-slate-400 mt-1">Quantum search phase-inversion demo</div>
                </button>
              </div>
            </div>

            {/* Measurement History Log */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase mb-2">MEASUREMENT READOUT LOG</h3>
              {measurementHistory.length === 0 ? (
                <div className="text-xs font-mono text-slate-500 py-3 text-center">No quantum measurements executed yet.</div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
                  {measurementHistory.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-slate-400">Q{m.qubitId} @ {m.time}</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${m.outcome === 1 ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
                        Outcome: |{m.outcome}⟩
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">QUANTUM CONTROL WORKFLOW</h3>
                  <p className="text-[10px] text-slate-400">Step-by-step physical transmon pulse cycle</p>
                </div>

                <button
                  disabled={isSimulatingWorkflow}
                  onClick={runStepWorkflow}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] tracking-widest uppercase disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSimulatingWorkflow ? 'Running...' : 'Execute Pulse Cycle'}</span>
                </button>
              </div>

              {/* Workflow Flowchart */}
              <div className="space-y-2 font-mono text-xs pt-1">
                {[
                  { step: 1, label: '1. QUBIT INITIALIZATION', desc: 'Thermal relaxation to ground state |0⟩ at 15 mK' },
                  { step: 2, label: '2. MICROWAVE AWG CONTROL PULSE', desc: 'Synthesizing 5.0 GHz π/2 Gaussian pulse envelope' },
                  { step: 3, label: '3. QUANTUM GATE (HADAMARD)', desc: 'Rotating state vector into superposition (|0⟩ + |1⟩)/√2' },
                  { step: 4, label: '4. 2-QUBIT ENTANGLEMENT (CNOT)', desc: 'Flux pulse cross-resonance creates Bell state entanglement' },
                  { step: 5, label: '5. DISPERSIVE READOUT', desc: 'Probe tone reflects off resonator with state-dependent phase shift' },
                  { step: 6, label: '6. MEASUREMENT COMPLETE', desc: 'Classical ADC digitizes IQ quadratures into 0 or 1' },
                ].map(item => {
                  const isCurrent = workflowStep === item.step;
                  const isDone = workflowStep > item.step;

                  return (
                    <div
                      key={item.step}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : isDone
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-white/5 bg-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isCurrent ? 'text-cyan-300' : isDone ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {item.label}
                        </span>
                        {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400 text-black font-bold animate-pulse">ACTIVE</span>}
                        {isDone && <span className="text-[9px] text-emerald-400 font-bold">✓ DONE</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

