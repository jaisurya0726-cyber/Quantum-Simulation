import React, { useState, useEffect } from 'react';
import { QuantumCanvas } from './components/canvas/QuantumCanvas';
import { TopNav } from './components/hud/TopNav';
import { LeftToolbar } from './components/hud/LeftToolbar';
import { RightControls } from './components/hud/RightControls';
import { ComponentInspector } from './components/hud/ComponentInspector';
import { GoldPlatesBar } from './components/hud/GoldPlatesBar';
import { BlochSphereSideButton } from './components/qpu/BlochSphereSideButton';
import { ThermalNoiseSideButton } from './components/dilution/ThermalNoiseSideButton';
import { ExpandedQpuView } from './components/qpu/ExpandedQpuView';
import { QpuSimulator } from './components/qpu/QpuSimulator';
import { DilutionExplorer } from './components/dilution/DilutionExplorer';
import { SignalFlowMode } from './components/flow/SignalFlowMode';
import { LearningTour } from './components/lessons/LearningTour';
import { BootSequence } from './components/boot/BootSequence';
import { AppMode, QubitState, TelemetryData } from './types';
import { createDefaultQubit } from './utils/quantumMath';
import { soundEngine } from './utils/audio';

export default function App() {
  const [isBooted, setIsBooted] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<AppMode>('explore');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // 3D View Modifiers
  const [explodedProgress, setExplodedProgress] = useState<number>(0);
  const [cutawayActive, setCutawayActive] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [flowActive, setFlowActive] = useState<boolean>(true);

  // Qubit State Simulation
  const [qubitStates, setQubitStates] = useState<QubitState[]>(() =>
    Array.from({ length: 8 }, (_, i) => createDefaultQubit(i))
  );
  const [selectedQubitId, setSelectedQubitId] = useState<number | null>(0);

  // Thermal Noise 3D State
  const [thermalNoiseActive, setThermalNoiseActive] = useState<boolean>(false);
  const [thermalNoiseIntensity, setThermalNoiseIntensity] = useState<number>(1.0);

  // Signal Flow Sub-State
  const [signalFlowStep, setSignalFlowStep] = useState<number>(0);
  const [isFlowPlaying, setIsFlowPlaying] = useState<boolean>(false);

  // Sound Engine state
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Simulated Laboratory Telemetry
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    baseTempMk: 14.82,
    plate50kTempK: 48.6,
    plate4kTempK: 4.15,
    stillTempK: 0.88,
    coldPlateMk: 98.4,
    vacuumMbar: 1.2e-7,
    helium3FlowMmol: 480,
    qpuCoherenceFidelity: 99.72,
    qubitCount: 8,
    qubitsOnline: 8,
  });

  // Telemetry real-time micro-fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        baseTempMk: 14.8 + (Math.random() - 0.5) * 0.08,
        plate50kTempK: 48.5 + (Math.random() - 0.5) * 0.2,
        plate4kTempK: 4.15 + (Math.random() - 0.5) * 0.04,
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSelectComponent = (id: string | null) => {
    setSelectedComponentId(id);
    if (id) {
      setAutoRotate(false); // Pause auto-rotation when focusing on component
    }
  };

  const handleToggleAutoRotate = () => {
    setAutoRotate(prev => !prev);
  };

  const handleToggleCutaway = () => {
    setCutawayActive(prev => !prev);
  };

  const handleToggleFlow = () => {
    setFlowActive(prev => !prev);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleResetView = () => {
    setSelectedComponentId(null);
    setExplodedProgress(0);
    setAutoRotate(true);
    setCurrentMode('explore');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020408] text-slate-100 flex flex-col font-sans select-none">
      {/* Background Dot Matrix Grid */}
      <div className="absolute inset-0 bg-grid-immersive opacity-25 pointer-events-none z-0" />

      {/* Boot Initialization Screen */}
      {!isBooted && (
        <BootSequence
          onComplete={() => {
            setIsBooted(true);
            soundEngine.startAmbientHum();
          }}
        />
      )}

      {/* Top Navigation Bar with Laboratory Telemetry */}
      <TopNav
        currentMode={currentMode}
        onSelectMode={mode => {
          setCurrentMode(mode);
          if (mode === 'explore') {
            setSelectedComponentId(null);
          } else if (mode === 'dilution') {
            setSelectedComponentId('stage-10mk');
          } else if (mode === 'qpu') {
            setSelectedComponentId('qpu-chip');
          } else if (mode === 'flow') {
            setIsFlowPlaying(true);
          }
        }}
        telemetry={telemetry}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Workspace Body */}
      <div className="relative flex-1 flex overflow-hidden z-10">
        {/* Left Toolbar (Component Tree & Explorer) */}
        {currentMode === 'explore' && (
          <LeftToolbar
            selectedComponentId={selectedComponentId}
            onSelectComponent={handleSelectComponent}
          />
        )}

        {/* 3D WebGL Quantum Computer Chandelier Scene */}
        <main className="flex-1 relative h-full">
          {/* Gold Cryogenic Plates Quick Selector Bar */}
          <GoldPlatesBar
            selectedComponentId={selectedComponentId}
            onSelectComponent={handleSelectComponent}
          />

          {/* Bloch Sphere State & Actions Side Button Suite */}
          <BlochSphereSideButton
            qubitStates={qubitStates}
            setQubitStates={setQubitStates}
            selectedQubitId={selectedQubitId ?? 0}
            setSelectedQubitId={id => setSelectedQubitId(id)}
          />

          {/* Thermal Noise 3D Field & Spectrometry Side Button Suite */}
          <ThermalNoiseSideButton
            thermalNoiseActive={thermalNoiseActive}
            setThermalNoiseActive={setThermalNoiseActive}
            thermalNoiseIntensity={thermalNoiseIntensity}
            setThermalNoiseIntensity={setThermalNoiseIntensity}
            baseTempMk={telemetry.baseTempMk}
          />

          <QuantumCanvas
            currentMode={currentMode}
            selectedComponentId={selectedComponentId}
            onSelectComponent={handleSelectComponent}
            explodedProgress={explodedProgress}
            cutawayActive={cutawayActive}
            autoRotate={autoRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
            flowActive={flowActive}
            qubitStates={qubitStates}
            selectedQubitId={selectedQubitId}
            onSelectQubit={id => {
              setSelectedQubitId(id);
              setSelectedComponentId('qpu-chip');
            }}
            thermalNoiseActive={thermalNoiseActive}
            thermalNoiseIntensity={thermalNoiseIntensity}
          />

          {/* Right Floating 3D View Modifiers (Available across all modes) */}
          <RightControls
            autoRotate={autoRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
            explodedProgress={explodedProgress}
            onChangeExplodedProgress={setExplodedProgress}
            cutawayActive={cutawayActive}
            onToggleCutaway={handleToggleCutaway}
            flowActive={flowActive}
            onToggleFlow={handleToggleFlow}
            onResetView={handleResetView}
            onZoomIn={() => {
              window.dispatchEvent(new CustomEvent('quantum-zoom', { detail: { delta: -1.2 } }));
            }}
            onZoomOut={() => {
              window.dispatchEvent(new CustomEvent('quantum-zoom', { detail: { delta: 1.2 } }));
            }}
          />

          {/* Component Inspector Modal / Drawer for non-QPU hardware */}
          {selectedComponentId && selectedComponentId !== 'qpu-chip' && currentMode === 'explore' && (
            <ComponentInspector
              componentId={selectedComponentId}
              onClose={() => setSelectedComponentId(null)}
            />
          )}
        </main>

        {/* Right Side Specialized Panels for Dedicated Modes & Expanded QPU */}
        {((selectedComponentId === 'qpu-chip' && currentMode === 'explore') || currentMode === 'qpu') && (
          <div className="w-full md:w-[480px] lg:w-[540px] h-full shrink-0 z-20 animate-in slide-in-from-right duration-300">
            <ExpandedQpuView
              qubitStates={qubitStates}
              setQubitStates={setQubitStates}
              selectedQubitId={selectedQubitId}
              setSelectedQubitId={id => setSelectedQubitId(id)}
              onClose={() => {
                setSelectedComponentId(null);
                if (currentMode === 'qpu') setCurrentMode('explore');
              }}
            />
          </div>
        )}

        {currentMode === 'dilution' && (
          <div className="w-full md:w-[440px] lg:w-[480px] h-full shrink-0 z-20">
            <DilutionExplorer
              selectedComponentId={selectedComponentId}
              onSelectComponent={handleSelectComponent}
            />
          </div>
        )}

        {currentMode === 'flow' && (
          <div className="w-full md:w-[440px] lg:w-[480px] h-full shrink-0 z-20">
            <SignalFlowMode
              currentStepIndex={signalFlowStep}
              onStepChange={setSignalFlowStep}
              isPlaying={isFlowPlaying}
              onTogglePlay={() => setIsFlowPlaying(prev => !prev)}
              onSelectComponent={handleSelectComponent}
            />
          </div>
        )}

        {currentMode === 'tour' && (
          <div className="w-full md:w-[460px] lg:w-[500px] h-full shrink-0 z-20">
            <LearningTour
              onSelectComponent={handleSelectComponent}
              onSwitchMode={setCurrentMode}
              onExitTour={() => setCurrentMode('explore')}
            />
          </div>
        )}
      </div>

      {/* Bottom Telemetry Status Bar */}
      <footer className="h-8 bg-black/60 border-t border-white/5 flex items-center justify-between px-6 z-30 select-none text-[9px] uppercase font-mono tracking-widest text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4] inline-block animate-pulse" />
            EQUILIBRIUM: 14.8 mK
          </span>
          <span className="text-white/10">•</span>
          <span>HE-3/HE-4 MIX: 480 mmol/s</span>
          <span className="text-white/10">•</span>
          <span>VACUUM: 1.2e-7 mbar</span>
          <span className="text-white/10">•</span>
          <span>T₁: 84.2 μs</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">DIGITAL TWIN V2.4</span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
            8 QUBITS ONLINE
          </span>
        </div>
      </footer>
    </div>
  );
}
