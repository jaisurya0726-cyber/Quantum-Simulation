import React, { useEffect, useState } from 'react';
import { soundEngine } from '../../utils/audio';
import { Atom, Snowflake, Cpu, Radio, CheckCircle2 } from 'lucide-react';

interface BootSequenceProps {
  onComplete: () => void;
}

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const bootSteps = [
    { text: 'INITIALIZING HARDWARE INTERFACE...', icon: <Atom className="w-4 h-4 text-cyan-400 animate-spin-slow" />, sub: 'Connecting cryogenic telemetry & instrumentation bus...' },
    { text: 'STARTING CRYOGENIC DILUTION...', icon: <Snowflake className="w-4 h-4 text-blue-400 animate-pulse" />, sub: 'Circulating 3He/4He mixture toward 15 millikelvin...' },
    { text: 'CALIBRATING QPU MICROWAVE LINES...', icon: <Cpu className="w-4 h-4 text-fuchsia-400 animate-pulse" />, sub: 'Engaging cryogenic attenuators & HEMT amplifiers...' },
    { text: 'INITIALIZING 8-QUBIT MATRIX...', icon: <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />, sub: 'Transmon qubits relaxed in ground state |0⟩' },
    { text: 'DIGITAL TWIN READY', icon: <CheckCircle2 className="w-4 h-4 text-cyan-300" />, sub: 'Laboratory simulation online. Entering 3D environment...' },
  ];

  useEffect(() => {
    soundEngine.startAmbientHum();
    soundEngine.playClick(600 + currentStepIndex * 150);

    if (currentStepIndex < bootSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 650);
      return () => clearTimeout(timer);
    } else {
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 850);
      return () => clearTimeout(finishTimer);
    }
  }, [currentStepIndex, onComplete]);

  return (
    <div
      id="quantum-boot-sequence"
      className="fixed inset-0 z-50 bg-[#020408] flex flex-col items-center justify-center text-slate-100 font-mono select-none px-4"
    >
      {/* Background Dot Matrix Grid Overlay */}
      <div className="absolute inset-0 bg-grid-immersive opacity-30 pointer-events-none" />

      {/* Central Cyan Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-black/60 border border-white/10 rounded-2xl p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Atom className="w-6 h-6 fill-current animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-[0.25em] text-white uppercase">
                QUANTUM LAB TWIN
              </h1>
              <span className="text-[8px] font-mono px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded uppercase">
                15 mK
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Dilution Refrigerator & Transmon Simulator</p>
          </div>
        </div>

        {/* Diagnostic Boot Sequence Steps */}
        <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
          {bootSteps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            if (idx > currentStepIndex) return null;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 transition-all duration-300 ${
                  isCurrent ? 'text-cyan-300 font-bold scale-[1.01]' : 'text-slate-400 opacity-60'
                }`}
              >
                <div className="mt-0.5 shrink-0">{step.icon}</div>
                <div className="flex-1">
                  <div className="text-xs tracking-wider flex items-center justify-between">
                    <span>{step.text}</span>
                    {isDone && <span className="text-[9px] text-cyan-400 font-mono font-bold">[OK]</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar & Skip Button */}
        <div className="space-y-2.5">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 shadow-[0_0_10px_#06b6d4] transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / bootSteps.length) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-mono uppercase tracking-wider">
            <span className="text-cyan-400/80">Telemetry: Synchronized</span>
            <button
              onClick={() => {
                soundEngine.playClick(900);
                onComplete();
              }}
              className="hover:text-cyan-400 underline transition-colors"
            >
              Skip Diagnostics →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

