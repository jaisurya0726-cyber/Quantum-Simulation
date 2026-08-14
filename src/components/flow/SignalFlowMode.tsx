import React, { useState, useEffect } from 'react';
import { SIGNAL_FLOW_STEPS } from '../../data/flowData';
import { soundEngine } from '../../utils/audio';
import { Play, Pause, SkipForward, RotateCcw, Radio, Info } from 'lucide-react';

interface SignalFlowModeProps {
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectComponent: (id: string) => void;
}

export const SignalFlowMode: React.FC<SignalFlowModeProps> = ({
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  onSelectComponent,
}) => {
  const [autoPlaySpeed] = useState<number>(4000); // 4 seconds per step

  const currentStep = SIGNAL_FLOW_STEPS[currentStepIndex] || SIGNAL_FLOW_STEPS[0];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      onStepChange((currentStepIndex + 1) % SIGNAL_FLOW_STEPS.length);
    }, autoPlaySpeed);

    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, autoPlaySpeed, onStepChange]);

  // Audio cue on step change
  useEffect(() => {
    if (currentStep.direction === 'downward') {
      soundEngine.playMicrowavePulse(1200 - currentStepIndex * 100);
    } else if (currentStep.direction === 'qpu') {
      soundEngine.playGateApplication('H');
    } else {
      soundEngine.playReadoutTone(true);
    }

    if (currentStep.componentId) {
      onSelectComponent(currentStep.componentId);
    }
  }, [currentStepIndex]);

  return (
    <div id="qubit-flow-panel" className="flex flex-col h-full w-full bg-black/40 text-slate-100 border-l border-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-white uppercase">SIGNAL TRAJECTORY</h2>
            <p className="text-[9px] font-mono tracking-wider text-cyan-400">Control Pulse & Readout Signal Flow</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest font-bold transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Flow'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Step Progress Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SIGNAL_FLOW_STEPS.map((st, idx) => (
            <button
              key={st.stepNumber}
              onClick={() => onStepChange(idx)}
              className={`flex-1 min-w-[28px] h-1.5 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]'
                  : idx < currentStepIndex
                  ? 'bg-cyan-700/60'
                  : 'bg-white/10'
              }`}
              title={`Step ${idx + 1}: ${st.title}`}
            />
          ))}
        </div>

        {/* Current Active Stage Card */}
        <div className="p-4 rounded-xl bg-white/5 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                STEP {currentStep.stepNumber} OF {SIGNAL_FLOW_STEPS.length}
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide">{currentStep.title}</h3>
            </div>
            <div className="px-2.5 py-1 rounded bg-black/50 border border-white/10 text-cyan-300 font-mono text-xs font-bold">
              {currentStep.temperature}
            </div>
          </div>

          <div>
            <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase mb-1">PHYSICAL LOCATION</h4>
            <div className="text-xs font-semibold text-white">{currentStep.stageName}</div>
          </div>

          <div>
            <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase mb-1">WHAT IS HAPPENING</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{currentStep.description}</p>
          </div>

          <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-[10px] text-slate-300 font-mono leading-relaxed">
            <span className="text-cyan-400 font-bold block mb-1 uppercase tracking-wider">TECHNICAL SPECIFICATIONS:</span>
            {currentStep.technicalDetails}
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <button
              disabled={currentStepIndex === 0}
              onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-slate-300 disabled:opacity-40 transition-all"
            >
              Previous
            </button>

            <button
              onClick={() => onStepChange(0)}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Restart flow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              disabled={currentStepIndex === SIGNAL_FLOW_STEPS.length - 1}
              onClick={() => onStepChange(Math.min(SIGNAL_FLOW_STEPS.length - 1, currentStepIndex + 1))}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-mono uppercase tracking-widest font-bold text-black disabled:opacity-40 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <span>Next</span>
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Scientific Distinction Callout */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] tracking-widest uppercase font-bold">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            SCIENTIFIC CLARIFICATION
          </div>
          <p className="text-slate-400 leading-relaxed text-xs">
            A qubit itself does <strong className="text-white">not travel</strong> through the refrigerator like a physical particle.
          </p>
          <p className="text-slate-400 leading-relaxed text-xs">
            Instead, <strong className="text-cyan-300">microwave control pulses</strong> travel downwards to address stationary transmon qubits on the QPU chip, and <strong className="text-amber-300">readout photons</strong> travel upwards through low-noise HEMT amplifiers to classical measurement electronics.
          </p>
        </div>
      </div>
    </div>
  );
};

