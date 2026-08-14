import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Thermometer,
  Activity,
  Waves,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  Layers,
  Zap,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface ThermalNoiseSideButtonProps {
  thermalNoiseActive: boolean;
  setThermalNoiseActive: React.Dispatch<React.SetStateAction<boolean>>;
  thermalNoiseIntensity: number;
  setThermalNoiseIntensity: React.Dispatch<React.SetStateAction<number>>;
  baseTempMk?: number;
}

// Stage thermodynamic and noise parameters
const THERMAL_STAGES = [
  {
    id: 'stage-300k',
    name: 'Top Flange (Room Temp)',
    temperature: '300 K',
    tempKelvin: 300,
    color: '#ff3b30',
    colorClass: 'text-red-400 border-red-500/40 bg-red-950/30',
    johnsonNoise: '1.82 nV/√Hz',
    noisePowerDbm: '-174.0 dBm/Hz',
    thermalPhotons: '1,250.4 photons @ 5GHz',
    attenuation: '0 dB',
    shielding: 'Ambient Laboratory Atmosphere',
    description: 'Room temperature vacuum interface experiencing heavy thermal agitation and blackbody radiation.',
  },
  {
    id: 'stage-50k',
    name: '50 K First Stage Shield',
    temperature: '50 K',
    tempKelvin: 50,
    color: '#ff9500',
    colorClass: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
    johnsonNoise: '0.74 nV/√Hz',
    noisePowerDbm: '-181.8 dBm/Hz',
    thermalPhotons: '208.3 photons @ 5GHz',
    attenuation: '-3 dB Attenuator',
    shielding: 'First Outer Radiation Shield',
    description: 'Intercepts >90% of outer infrared blackbody radiation from the laboratory enclosure.',
  },
  {
    id: 'stage-4k',
    name: '4.2 K Pulse Tube Stage',
    temperature: '4.2 K',
    tempKelvin: 4.2,
    color: '#ffcc00',
    colorClass: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30',
    johnsonNoise: '0.21 nV/√Hz',
    noisePowerDbm: '-192.5 dBm/Hz',
    thermalPhotons: '17.5 photons @ 5GHz',
    attenuation: '-10 dB Attenuator + HEMT',
    shielding: 'Helium Condensation Shield',
    description: 'Houses cryogenic low-noise High Electron Mobility Transistor (HEMT) microwave amplifiers.',
  },
  {
    id: 'stage-1k',
    name: '1.0 K Still (Evaporator)',
    temperature: '0.85 K',
    tempKelvin: 0.85,
    color: '#30b0c7',
    colorClass: 'text-teal-400 border-teal-500/40 bg-teal-950/30',
    johnsonNoise: '0.096 nV/√Hz',
    noisePowerDbm: '-199.5 dBm/Hz',
    thermalPhotons: '3.5 photons @ 5GHz',
    attenuation: '-0 dB / Heat Exchanger',
    shielding: 'Vacuum Inner Chamber',
    description: 'Separates 3He vapor via continuous distillation, providing steady precooling to lower plates.',
  },
  {
    id: 'stage-100mk',
    name: '100 mK Cold Plate',
    temperature: '100 mK',
    tempKelvin: 0.1,
    color: '#00f0ff',
    colorClass: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
    johnsonNoise: '0.033 nV/√Hz',
    noisePowerDbm: '-208.8 dBm/Hz',
    thermalPhotons: '0.089 photons @ 5GHz',
    attenuation: '-20 dB Cryo Attenuator',
    shielding: 'Superconducting Magnetic Shield',
    description: 'Thermal photon thermalization stage; strongly attenuates microwave room noise before QPU.',
  },
  {
    id: 'stage-15mk',
    name: '15 mK Mixing Chamber & QPU',
    temperature: '15 mK',
    tempKelvin: 0.015,
    color: '#7b61ff',
    colorClass: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/30',
    johnsonNoise: '0.013 nV/√Hz',
    noisePowerDbm: '-217.0 dBm/Hz',
    thermalPhotons: '1.8 × 10⁻⁷ photons @ 5GHz',
    attenuation: '-20 dB Final Attenuator + Eccosorb',
    shielding: 'Cryoperm + Niobium Superconducting Shield',
    description: 'Quantum ground state floor. Thermal noise is completely frozen out below the zero-point quantum limit (hf/2).',
  },
];

export const ThermalNoiseSideButton: React.FC<ThermalNoiseSideButtonProps> = ({
  thermalNoiseActive,
  setThermalNoiseActive,
  thermalNoiseIntensity,
  setThermalNoiseIntensity,
  baseTempMk = 14.8,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'spectrum' | 'stages' | 'decoherence'>('3d');
  const [isQuenching, setIsQuenching] = useState<boolean>(false);
  const [quenchCountdown, setQuenchCountdown] = useState<number>(0);
  const [activeStageId, setActiveStageId] = useState<string>('stage-15mk');

  // Canvas ref for live thermal waveform oscilloscope
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Toggle thermal noise 3D field
  const handleToggleNoise3D = () => {
    soundEngine.playClick(thermalNoiseActive ? 650 : 950);
    setThermalNoiseActive(prev => !prev);
  };

  // Simulate a thermal quench / fluctuation injection
  const handleInjectThermalQuench = () => {
    soundEngine.playThermalNoiseBurst(2.5);
    setIsQuenching(true);
    setQuenchCountdown(5);

    // Temporarily spike thermal intensity
    const origIntensity = thermalNoiseIntensity;
    setThermalNoiseIntensity(3.2);

    let count = 5;
    const interval = setInterval(() => {
      count -= 1;
      setQuenchCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setIsQuenching(false);
        setThermalNoiseIntensity(origIntensity);
        soundEngine.playCryoCooling();
      }
    }, 1000);
  };

  // Live Oscilloscope Waveform Animation
  useEffect(() => {
    if (!isOpen || activeTab !== 'spectrum') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.08;
      const w = canvas.width;
      const h = canvas.height;

      // Dark background with scanlines
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 149, 0, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center baseline
      ctx.strokeStyle = 'rgba(255, 149, 0, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Stochastic Thermal Johnson-Nyquist Voltage Noise
      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#ff9500';
      ctx.shadowColor = 'rgba(255, 149, 0, 0.6)';
      ctx.shadowBlur = 8;

      const activeStage = THERMAL_STAGES.find(s => s.id === activeStageId) || THERMAL_STAGES[5];
      const stageTempFactor = Math.max(0.04, Math.sqrt(activeStage.tempKelvin / 300)) * thermalNoiseIntensity;

      for (let x = 0; x < w; x++) {
        // Multi-frequency thermal spectral noise
        const n1 = Math.sin(x * 0.15 + time * 3.2) * 0.3;
        const n2 = Math.cos(x * 0.37 - time * 5.1) * 0.25;
        const n3 = Math.sin(x * 0.81 + time * 8.4) * 0.18;
        const rand = (Math.random() - 0.5) * 0.8;

        const noiseVal = (n1 + n2 + n3 + rand) * (h * 0.38) * stageTempFactor;
        const y = h / 2 + noiseVal;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, activeTab, activeStageId, thermalNoiseIntensity]);

  // Selected stage info
  const selectedStage = THERMAL_STAGES.find(s => s.id === activeStageId) || THERMAL_STAGES[5];

  // Calculate live Johnson-Nyquist voltage at 50 ohms: V_rms = sqrt(4 * k_B * T * R * B)
  // for B = 1 GHz, R = 50 ohms:
  const kB = 1.380649e-23;
  const R = 50;
  const B = 1e9; // 1 GHz bandwidth
  const vRmsMicroVolts = (Math.sqrt(4 * kB * selectedStage.tempKelvin * R * B) * 1e6 * thermalNoiseIntensity).toFixed(3);

  return (
    <>
      {/* Docked Left Side Button */}
      <div className="absolute left-4 top-28 z-20 select-none">
        <button
          id="quantum-thermal-noise-side-btn"
          onClick={() => {
            soundEngine.playClick(850);
            setIsOpen(!isOpen);
          }}
          title="Inspect & Control Thermal Noise around the Quantum Computer"
          className={`group flex items-center gap-2.5 px-3 py-2 rounded-2xl backdrop-blur-xl border transition-all duration-300 shadow-xl cursor-pointer ${
            thermalNoiseActive
              ? 'bg-amber-950/80 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.35)] text-amber-200'
              : 'bg-slate-900/80 border-slate-700/50 text-slate-300 hover:border-amber-500/40 hover:bg-slate-800/80'
          }`}
        >
          {/* Animated Thermal Flame Icon with Radial Aura */}
          <div className="relative w-6 h-6 rounded-full bg-gradient-to-tr from-red-950 via-amber-900 to-yellow-600 border border-amber-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.45)]">
            <Flame className={`w-3.5 h-3.5 text-amber-300 ${thermalNoiseActive ? 'animate-pulse' : ''}`} />
            {thermalNoiseActive && (
              <div className="absolute inset-0 rounded-full border border-amber-400/40 animate-ping opacity-30" />
            )}
          </div>

          <div className="flex flex-col items-start text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">
                THERMAL NOISE
              </span>
              <span
                className={`text-[8px] px-1 py-0.2 rounded font-semibold border ${
                  thermalNoiseActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {thermalNoiseActive ? '3D Active' : 'Off'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium">
              Base: {baseTempMk.toFixed(1)} mK | {(thermalNoiseIntensity * 100).toFixed(0)}% Flux
            </span>
          </div>

          <ChevronRight
            className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
              isOpen ? 'rotate-90 text-amber-300' : 'group-hover:translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Expanded Thermal Noise Environment & Control Suite */}
      {isOpen && (
        <div
          id="thermal-noise-suite-panel"
          className="absolute top-2 left-4 md:left-6 bottom-4 w-[94vw] sm:w-[480px] lg:w-[540px] z-30 flex flex-col bg-slate-950/95 border border-amber-500/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] text-slate-200 font-mono overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/60 via-slate-900 to-red-950/60 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider text-amber-300 uppercase flex items-center gap-2">
                  <span>Cryogenic Thermal Noise Field</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    S_V = 4k_B T R
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  3D thermodynamic agitation, blackbody photon emission & thermal dephasing
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick(700);
                setIsOpen(false);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick 3D Field Master Toggle Banner */}
          <div className="px-4 py-2.5 bg-amber-950/30 border-b border-amber-500/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] text-slate-300 font-semibold">
                3D In-Scene Thermal Particle Cloud
              </span>
            </div>
            <button
              onClick={handleToggleNoise3D}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm ${
                thermalNoiseActive
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {thermalNoiseActive ? (
                <>
                  <Eye className="w-3 h-3" /> Visible in 3D
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" /> Enable 3D Field
                </>
              )}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-slate-900/60 p-1 gap-1 text-[11px]">
            <button
              onClick={() => {
                soundEngine.playClick(750);
                setActiveTab('3d');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === '3d'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              3D Cloud & Waves
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(750);
                setActiveTab('spectrum');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'spectrum'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Noise Spectrum
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(750);
                setActiveTab('stages');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'stages'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Stages (300K → 15mK)
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(750);
                setActiveTab('decoherence');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'decoherence'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Decoherence
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text custom-scrollbar">
            {/* TAB 1: 3D CLOUD & WAVES */}
            {activeTab === '3d' && (
              <div className="space-y-4">
                {/* 3D Field Overview Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-900/80 border border-amber-500/25">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Ambient Thermodynamic Agitation Field
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      750 Active Phonon/Photon Particles
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Surrounding the dilution refrigerator is an ambient thermal field. At the upper 300K flange, energetic red thermal photons agitate violently. As signals descend through radiation shields to the 15mK base plate, thermal fluctuations freeze out, reaching quantum ground state purity.
                  </p>
                </div>

                {/* Thermal Intensity Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      Thermal Agitation Intensity
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                      {(thermalNoiseIntensity * 100).toFixed(0)}% Flux
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={thermalNoiseIntensity}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setThermalNoiseIntensity(val);
                      if (!thermalNoiseActive) setThermalNoiseActive(true);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>20% (Deep Cryo Freeze)</span>
                    <span>100% (Standard 15mK Baseline)</span>
                    <span>300% (Thermal Overdrive)</span>
                  </div>
                </div>

                {/* Simulated Thermal Spike / Heat Dissipation Injection */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-950/30 to-amber-950/20 border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <div>
                        <div className="font-bold text-red-300 text-xs">Simulate Thermal Fluctuation Burst</div>
                        <div className="text-[10px] text-slate-400">Inject microwave heating pulse into cryostat</div>
                      </div>
                    </div>

                    <button
                      onClick={handleInjectThermalQuench}
                      disabled={isQuenching}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        isQuenching
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {isQuenching ? `Thermal Spike (${quenchCountdown}s)` : 'Inject Burst'}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Injecting a sudden thermal load causes rapid particle agitation and simulated T1 / T2 dephasing on the QPU qubits before dilution cooling restores 15mK equilibrium.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: NOISE SPECTRUM & POWER */}
            {activeTab === 'spectrum' && (
              <div className="space-y-4">
                {/* Live Real-time Oscilloscope */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      Live Thermal Voltage Fluctuations V_noise(t)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Target: <strong className="text-white">{selectedStage.name}</strong>
                    </span>
                  </div>

                  {/* Oscilloscope Canvas */}
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-amber-500/20 bg-[#050811]">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={128}
                      className="w-full h-full block"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] text-amber-300 font-mono border border-amber-500/30">
                      V_RMS ≈ {vRmsMicroVolts} µV (1 GHz Bandwidth)
                    </div>
                  </div>
                </div>

                {/* Johnson-Nyquist Spectral Density Physics Formula */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Johnson-Nyquist Noise Power</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-mono">
                      S_V(f) = 4 k_B T R
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5">
                      <div className="text-slate-400 text-[10px]">Noise Spectral Density</div>
                      <div className="font-bold text-amber-300 text-sm mt-0.5">{selectedStage.johnsonNoise}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5">
                      <div className="text-slate-400 text-[10px]">Available Noise Power</div>
                      <div className="font-bold text-cyan-300 text-sm mt-0.5">{selectedStage.noisePowerDbm}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[10px]">Thermal Photon Occupation (n_th @ 5 GHz)</div>
                      <div className="font-bold text-indigo-300 text-xs mt-0.5">{selectedStage.thermalPhotons}</div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">n_th = 1/(exp(hf/k_BT) - 1)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STAGES BREAKDOWN */}
            {activeTab === 'stages' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Select a temperature stage to inspect noise level:</span>
                  <span className="text-amber-300 font-bold">6 Stratified Zones</span>
                </div>

                <div className="space-y-2">
                  {THERMAL_STAGES.map(stage => {
                    const isSelected = stage.id === activeStageId;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => {
                          soundEngine.playClick(800);
                          setActiveStageId(stage.id);
                        }}
                        className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? `${stage.colorClass} shadow-[0_0_15px_rgba(0,0,0,0.5)] ring-1 ring-white/20`
                            : 'bg-slate-900/60 border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-3.5 h-3.5" style={{ color: stage.color }} />
                            <span className="font-bold text-xs">{stage.name}</span>
                          </div>
                          <span
                            className="font-bold text-xs px-2 py-0.5 rounded-lg border font-mono"
                            style={{ color: stage.color, borderColor: `${stage.color}40`, backgroundColor: `${stage.color}15` }}
                          >
                            {stage.temperature}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-400 block">Johnson Noise:</span>
                            <strong className="text-slate-200">{stage.johnsonNoise}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Attenuator:</span>
                            <strong className="text-cyan-300">{stage.attenuation}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Photons @ 5GHz:</span>
                            <strong className="text-amber-300">{stage.thermalPhotons.split(' ')[0]}</strong>
                          </div>
                        </div>

                        <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
                          {stage.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: DECOHERENCE IMPACT */}
            {activeTab === 'decoherence' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-indigo-300">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    How Thermal Noise Degrades Qubits
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    At room temperature (300 K), thermal energy is k_B·T ≈ 25.8 meV (6.2 THz), which is 1,200× higher energy than a 5 GHz transmon qubit (h·f ≈ 20.7 µeV). Without extreme cryogenic shielding, thermal photons instantly excite and dephase the qubit into a classical mixed state.
                  </p>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-start gap-2.5">
                      <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 block">Thermal Upward Transitions:</strong>
                        <span className="text-slate-400 text-[10px]">
                          Rate Γ_↑ = n_th · Γ_1. At 15 mK, n_th ≈ 1.8 × 10⁻⁷, rendering unwanted spontaneous thermal excitation negligible.
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-start gap-2.5">
                      <Activity className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-cyan-300 block">Quasiparticle Poisoning:</strong>
                        <span className="text-slate-400 text-[10px]">
                          Superconducting aluminum pairing gap is 2Δ ≈ 340 µeV (Tc = 1.2 K). Temperatures above 150 mK break Cooper pairs into lossy single-electron quasiparticles.
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-start gap-2.5">
                      <Layers className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-red-300 block">Attenuator Thermalization Cascade:</strong>
                        <span className="text-slate-400 text-[10px]">
                          Over 53 dB of cryogenic attenuators (3 dB + 10 dB + 20 dB + 20 dB) absorb room-temperature thermal microwave photons and dissipate heat at the higher-capacity 50K/4K plates.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-950 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Thermal Noise Floor: <strong>-217 dBm/Hz @ 15mK</strong>
            </span>
            <button
              onClick={() => {
                soundEngine.playClick(800);
                setThermalNoiseIntensity(1.0);
                setThermalNoiseActive(true);
              }}
              className="hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset 15mK Baseline
            </button>
          </div>
        </div>
      )}
    </>
  );
};
