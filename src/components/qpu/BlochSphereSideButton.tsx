import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { QubitState, QuantumGateType } from '../../types';
import {
  applySingleGate,
  applyRotationGate,
  setQubitAngles,
  measureQubit,
  cAbsSq,
} from '../../utils/quantumMath';
import { soundEngine } from '../../utils/audio';
import {
  CircleDot,
  X,
  RotateCw,
  RotateCcw,
  Zap,
  Play,
  Pause,
  Activity,
  Maximize2,
  RefreshCw,
  ChevronRight,
  Info,
  Sparkles,
  Sliders,
  Radio,
  Layers,
} from 'lucide-react';

interface ActionLogItem {
  id: string;
  name: string;
  gate: string;
  time: string;
  desc: string;
  axis: 'X' | 'Y' | 'Z' | 'Hadamard' | 'Measurement' | 'Preset';
  prevTheta: number;
  prevPhi: number;
  newTheta: number;
  newPhi: number;
}

interface BlochSphereSideButtonProps {
  qubitStates: QubitState[];
  setQubitStates: React.Dispatch<React.SetStateAction<QubitState[]>>;
  selectedQubitId: number;
  setSelectedQubitId: (id: number) => void;
}

export const BlochSphereSideButton: React.FC<BlochSphereSideButtonProps> = ({
  qubitStates,
  setQubitStates,
  selectedQubitId,
  setSelectedQubitId,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'gates' | 'rotations' | 'presets' | 'dynamics' | 'history'>('gates');
  const [isPrecessing, setIsPrecessing] = useState<boolean>(false);
  const [actionLog, setActionLog] = useState<ActionLogItem[]>([]);
  const [activeActionNotification, setActiveActionNotification] = useState<string | null>(null);

  // Custom Rotation Sliders
  const [customThetaAngle, setCustomThetaAngle] = useState<number>(Math.PI / 2);
  const [customAxis, setCustomAxis] = useState<'X' | 'Y' | 'Z'>('X');

  const currentQubit = qubitStates.find(q => q.id === selectedQubitId) || qubitStates[0];

  // 3D Canvas Mount Ref
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vectorArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const tipRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const targetDirRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const currentDirRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));

  // Trajectory points history for visual action arc
  const trajectoryPointsRef = useRef<THREE.Vector3[]>([]);

  // Log an action to history
  const logAction = (
    name: string,
    gate: string,
    desc: string,
    axis: ActionLogItem['axis'],
    prevTheta: number,
    prevPhi: number,
    newTheta: number,
    newPhi: number
  ) => {
    const newItem: ActionLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      gate,
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      desc,
      axis,
      prevTheta,
      prevPhi,
      newTheta,
      newPhi,
    };
    setActionLog(prev => [newItem, ...prev.slice(0, 24)]);
    setActiveActionNotification(`${name} [${gate}]`);
    setTimeout(() => {
      setActiveActionNotification(null);
    }, 2200);
  };

  // Perform a gate action
  const handleApplyGate = (gate: QuantumGateType, name: string, desc: string, axis: ActionLogItem['axis']) => {
    soundEngine.playGateApplication(gate);
    const prevTheta = currentQubit.theta;
    const prevPhi = currentQubit.phi;
    const updated = applySingleGate(currentQubit, gate);

    setQubitStates(prev => prev.map(q => (q.id === selectedQubitId ? updated : q)));
    logAction(name, gate, desc, axis, prevTheta, prevPhi, updated.theta, updated.phi);
  };

  // Perform rotation action
  const handleApplyRotation = (axis: 'X' | 'Y' | 'Z', angle: number, angleName: string) => {
    soundEngine.playClick(900);
    const prevTheta = currentQubit.theta;
    const prevPhi = currentQubit.phi;
    const updated = applyRotationGate(currentQubit, axis, angle);

    setQubitStates(prev => prev.map(q => (q.id === selectedQubitId ? updated : q)));
    logAction(
      `Rotation R_${axis}`,
      `R_${axis}(${angleName})`,
      `Rotated by ${angleName} around the ${axis}-axis on the Bloch Sphere.`,
      axis,
      prevTheta,
      prevPhi,
      updated.theta,
      updated.phi
    );
  };

  // Set specific state preset
  const handleApplyPreset = (theta: number, phi: number, label: string, desc: string) => {
    soundEngine.playClick(800);
    const prevTheta = currentQubit.theta;
    const prevPhi = currentQubit.phi;
    const updated = setQubitAngles(currentQubit, theta, phi);

    setQubitStates(prev => prev.map(q => (q.id === selectedQubitId ? updated : q)));
    logAction(`Preset State`, label, desc, 'Preset', prevTheta, prevPhi, updated.theta, updated.phi);
  };

  // Projective measurement
  const handleMeasure = () => {
    const prevTheta = currentQubit.theta;
    const prevPhi = currentQubit.phi;

    const { updatedQubit, outcome, prob0, prob1 } = measureQubit(currentQubit);
    soundEngine.playReadoutTone(outcome === 1);
    setQubitStates(prev => prev.map(q => (q.id === selectedQubitId ? updatedQubit : q)));

    logAction(
      `Projective Measurement`,
      `|${outcome}⟩ Outcome`,
      `Wavefunction collapsed to computational basis state |${outcome}⟩ (Prior: P(0)=${(prob0 * 100).toFixed(1)}%, P(1)=${(prob1 * 100).toFixed(1)}%)`,
      'Measurement',
      prevTheta,
      prevPhi,
      updatedQubit.theta,
      updatedQubit.phi
    );
  };

  // Free Precession Animation Loop
  useEffect(() => {
    if (!isPrecessing) return;
    const interval = setInterval(() => {
      setQubitStates(prev =>
        prev.map(q => {
          if (q.id === selectedQubitId) {
            const nextPhi = (q.phi + 0.08) % (2 * Math.PI);
            return setQubitAngles(q, q.theta, nextPhi);
          }
          return q;
        })
      );
    }, 40);

    return () => clearInterval(interval);
  }, [isPrecessing, selectedQubitId, setQubitStates]);

  // Three.js 3D Bloch Sphere Initialization and Render loop
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;
    const container = mountRef.current;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(2.8, 2.2, 3.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Coordinate Sphere Main Body
    const sphereGeo = new THREE.SphereGeometry(1.0, 32, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0284c7'),
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Inner subtle semi-transparent solid sphere core
    const innerSphereGeo = new THREE.SphereGeometry(0.98, 32, 24);
    const innerSphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0f172a'),
      transparent: true,
      opacity: 0.65,
    });
    const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
    scene.add(innerSphere);

    // Axes Group
    const axesGroup = new THREE.Group();
    const axisMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#94a3b8'), transparent: true, opacity: 0.7 });

    // Z-Axis (|0> to |1>)
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.45, 0), new THREE.Vector3(0, 1.45, 0)]);
    axesGroup.add(new THREE.Line(zGeo, axisMat));

    // X-Axis (|+> to |->)
    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.45, 0, 0), new THREE.Vector3(1.45, 0, 0)]);
    axesGroup.add(new THREE.Line(xGeo, axisMat));

    // Y-Axis (|+i> to |-i>)
    const yGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1.45), new THREE.Vector3(0, 0, 1.45)]);
    axesGroup.add(new THREE.Line(yGeo, axisMat));

    // Equator ring (Z = 0 plane)
    const ringGeo = new THREE.RingGeometry(0.99, 1.01, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    axesGroup.add(new THREE.Mesh(ringGeo, ringMat));

    // Meridian rings (XZ and YZ planes)
    const meridianGeo1 = new THREE.RingGeometry(0.99, 1.01, 64);
    const meridian1 = new THREE.Mesh(meridianGeo1, new THREE.MeshBasicMaterial({ color: new THREE.Color('#64748b'), side: THREE.DoubleSide, transparent: true, opacity: 0.25 }));
    axesGroup.add(meridian1);

    const meridianGeo2 = new THREE.RingGeometry(0.99, 1.01, 64);
    meridianGeo2.rotateY(Math.PI / 2);
    const meridian2 = new THREE.Mesh(meridianGeo2, new THREE.MeshBasicMaterial({ color: new THREE.Color('#64748b'), side: THREE.DoubleSide, transparent: true, opacity: 0.25 }));
    axesGroup.add(meridian2);

    scene.add(axesGroup);

    // State Vector Arrow
    const initialDir = new THREE.Vector3(
      Math.sin(currentQubit.theta) * Math.cos(currentQubit.phi),
      Math.cos(currentQubit.theta),
      Math.sin(currentQubit.theta) * Math.sin(currentQubit.phi)
    ).normalize();

    currentDirRef.current.copy(initialDir);
    targetDirRef.current.copy(initialDir);

    const arrow = new THREE.ArrowHelper(initialDir, new THREE.Vector3(0, 0, 0), 1.0, 0x38bdf8, 0.22, 0.14);
    scene.add(arrow);
    vectorArrowRef.current = arrow;

    // Glowing tip sphere
    const tipGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const tipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#00f0ff') });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.copy(initialDir);
    scene.add(tip);
    tipRef.current = tip;

    // Trajectory arc line
    const trajGeo = new THREE.BufferGeometry();
    const trajMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#f43f5e'),
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajLine);
    trajectoryLineRef.current = trajLine;

    // Interactive Drag Orbit Handling
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      axesGroup.rotation.y += deltaX * 0.01;
      sphere.rotation.y += deltaX * 0.01;
      axesGroup.rotation.x += deltaY * 0.01;
      sphere.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Render Loop
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Smoothly interpolate current vector towards target
      currentDirRef.current.lerp(targetDirRef.current, 0.15);

      if (vectorArrowRef.current) {
        vectorArrowRef.current.setDirection(currentDirRef.current.clone().normalize());
        vectorArrowRef.current.setLength(1.0, 0.22, 0.14);
      }

      if (tipRef.current) {
        tipRef.current.position.copy(currentDirRef.current);
      }

      // Record trajectory history
      const currentPoint = currentDirRef.current.clone().normalize();
      const points = trajectoryPointsRef.current;
      if (points.length === 0 || points[points.length - 1].distanceTo(currentPoint) > 0.04) {
        points.push(currentPoint);
        if (points.length > 50) points.shift();

        if (trajectoryLineRef.current) {
          trajectoryLineRef.current.geometry.setFromPoints(points);
        }
      }

      // Gentle auto-rotation when not dragging
      if (!isDragging) {
        axesGroup.rotation.y += 0.002;
        sphere.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isOpen]);

  // Update target vector when qubit state angles change
  useEffect(() => {
    const targetDir = new THREE.Vector3(
      Math.sin(currentQubit.theta) * Math.cos(currentQubit.phi),
      Math.cos(currentQubit.theta),
      Math.sin(currentQubit.theta) * Math.sin(currentQubit.phi)
    ).normalize();

    targetDirRef.current.copy(targetDir);
  }, [currentQubit.theta, currentQubit.phi]);

  // Expectation values & Probabilities
  const prob0 = cAbsSq(currentQubit.alpha);
  const prob1 = cAbsSq(currentQubit.beta);
  const expX = Math.sin(currentQubit.theta) * Math.cos(currentQubit.phi);
  const expY = Math.sin(currentQubit.theta) * Math.sin(currentQubit.phi);
  const expZ = Math.cos(currentQubit.theta);

  return (
    <>
      {/* Docked Floating Side Button (Top-Left under Cryo Navigator) */}
      <div
        id="bloch-sphere-side-button"
        className="absolute top-16 left-4 z-20 font-mono select-none"
      >
        <button
          onClick={() => {
            soundEngine.playClick(900);
            setIsOpen(!isOpen);
          }}
          className={`group flex items-center gap-2.5 px-3 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all ${
            isOpen
              ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              : 'border-white/15 bg-black/75 hover:border-cyan-400/60 hover:bg-black/90 text-slate-200'
          }`}
          title="Open Bloch Sphere Suite & Action Controls"
        >
          {/* Animated Glowing Sphere Icon */}
          <div className="relative w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-900 to-blue-600 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.5)]">
            <CircleDot className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping opacity-30" />
          </div>

          <div className="flex flex-col items-start text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">
                BLOCH SPHERE
              </span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                {currentQubit.label}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium">
              θ: {(currentQubit.theta * (180 / Math.PI)).toFixed(0)}° | φ: {(currentQubit.phi * (180 / Math.PI)).toFixed(0)}°
            </span>
          </div>

          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${isOpen ? 'rotate-90 text-cyan-300' : 'group-hover:translate-x-0.5'}`} />
        </button>
      </div>

      {/* Expanded Full Bloch Sphere Actions Suite (Slide-out Flyout / Modal) */}
      {isOpen && (
        <div
          id="bloch-sphere-suite-panel"
          className="absolute top-2 left-4 md:left-6 bottom-4 w-[94vw] sm:w-[480px] lg:w-[540px] z-30 flex flex-col bg-slate-950/95 border border-cyan-500/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] text-slate-200 font-mono overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border-b border-cyan-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <CircleDot className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-2">
                  <span>Bloch Sphere State Visualizer</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    Live Operations
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Unitary rotations & state actions on |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick(700);
                setIsOpen(false);
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-all"
              title="Close Bloch Sphere Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Qubit Selector Tabs (Q0 to Q7) */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-black/40 border-b border-white/5 overflow-x-auto scrollbar-none">
            <span className="text-[9px] uppercase font-bold text-slate-500 mr-1 shrink-0">TARGET QUBIT:</span>
            {qubitStates.map(q => {
              const isSelected = q.id === selectedQubitId;
              const p0 = cAbsSq(q.alpha);
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    soundEngine.playClick(900);
                    setSelectedQubitId(q.id);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[10px] transition-all shrink-0 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:text-white hover:border-white/15'
                  }`}
                >
                  <span>{q.label}</span>
                  <span className={`text-[8px] px-1 rounded ${isSelected ? 'bg-cyan-400/30 text-cyan-100' : 'bg-black/30 text-slate-500'}`}>
                    {(p0 * 100).toFixed(0)}% |0⟩
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Notification Banner */}
          {activeActionNotification && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-cyan-500/20 border-b border-cyan-400/30 text-cyan-300 text-xs animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="font-bold">Executing Action:</span>
                <span>{activeActionNotification}</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono">Quantum Unitary Applied</span>
            </div>
          )}

          {/* Body Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 3D Canvas + State Readout Header */}
            <div className="relative rounded-2xl bg-black/60 border border-cyan-500/30 p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner">
              {/* Top Corner State Mathematical Formulation */}
              <div className="w-full flex items-center justify-between text-[11px] mb-1 z-10 px-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-cyan-300">{currentQubit.label} State Vector</span>
                  <span className="text-[9px] text-slate-400">|ψ⟩</span>
                </div>
                <div className="text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                  Purity: <span className="text-emerald-400 font-bold">1.00 (Pure)</span>
                </div>
              </div>

              {/* 3D WebGL Canvas Viewport */}
              <div className="relative w-full h-56 sm:h-64 flex items-center justify-center cursor-grab active:cursor-grabbing">
                <div ref={mountRef} className="w-full h-full" />

                {/* Pole Overlay Indicators */}
                <div className="absolute top-2 text-[10px] font-bold text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-cyan-400/40 shadow-lg pointer-events-none">
                  |0⟩ Ground (+Z)
                </div>
                <div className="absolute bottom-2 text-[10px] font-bold text-fuchsia-300 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-fuchsia-400/40 shadow-lg pointer-events-none">
                  |1⟩ Excited (-Z)
                </div>
                <div className="absolute left-2 text-[10px] font-bold text-emerald-300 bg-slate-950/80 px-1.5 py-0.5 rounded-lg border border-emerald-400/40 shadow-lg pointer-events-none">
                  |+⟩ (+X)
                </div>
                <div className="absolute right-2 text-[10px] font-bold text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded-lg border border-amber-400/40 shadow-lg pointer-events-none">
                  |+i⟩ (+Y)
                </div>

                {/* Interactive Drag Hint */}
                <div className="absolute bottom-2 right-2 text-[8px] text-slate-500 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
                  Drag 3D to rotate view
                </div>
              </div>

              {/* Live Quantum Amplitudes & Probabilities Bar */}
              <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-xs">
                {/* |0> probability */}
                <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-cyan-300 font-bold">|0⟩ Population (α)</span>
                    <span className="text-cyan-200 font-bold">{(prob0 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${prob0 * 100}%` }} />
                  </div>
                  <span className="text-[8px] text-slate-400">
                    Amp: {currentQubit.alpha.real.toFixed(3)} + {currentQubit.alpha.imag.toFixed(3)}i
                  </span>
                </div>

                {/* |1> probability */}
                <div className="p-2 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/20 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-fuchsia-300 font-bold">|1⟩ Population (β)</span>
                    <span className="text-fuchsia-200 font-bold">{(prob1 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-fuchsia-400 transition-all duration-300" style={{ width: `${prob1 * 100}%` }} />
                  </div>
                  <span className="text-[8px] text-slate-400">
                    Amp: {currentQubit.beta.real.toFixed(3)} + {currentQubit.beta.imag.toFixed(3)}i
                  </span>
                </div>
              </div>

              {/* Pauli Expectation Coordinates (X, Y, Z) */}
              <div className="w-full grid grid-cols-3 gap-2 mt-2 text-center text-[10px]">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[8px]">⟨σ_x⟩ = sinθ cosφ</span>
                  <span className="font-bold text-emerald-400">{expX.toFixed(3)}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[8px]">⟨σ_y⟩ = sinθ sinφ</span>
                  <span className="font-bold text-amber-400">{expY.toFixed(3)}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[8px]">⟨σ_z⟩ = cosθ</span>
                  <span className="font-bold text-cyan-400">{expZ.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Action Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-2xl overflow-x-auto text-[10px]">
              <button
                onClick={() => { soundEngine.playClick(750); setActiveTab('gates'); }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all whitespace-nowrap font-bold ${
                  activeTab === 'gates' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quantum Gates
              </button>
              <button
                onClick={() => { soundEngine.playClick(750); setActiveTab('rotations'); }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all whitespace-nowrap font-bold ${
                  activeTab === 'rotations' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Parametric Rotations
              </button>
              <button
                onClick={() => { soundEngine.playClick(750); setActiveTab('presets'); }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all whitespace-nowrap font-bold ${
                  activeTab === 'presets' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Basis Presets
              </button>
              <button
                onClick={() => { soundEngine.playClick(750); setActiveTab('dynamics'); }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all whitespace-nowrap font-bold ${
                  activeTab === 'dynamics' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dynamics & Readout
              </button>
              <button
                onClick={() => { soundEngine.playClick(750); setActiveTab('history'); }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all whitespace-nowrap font-bold ${
                  activeTab === 'history' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Action Log ({actionLog.length})
              </button>
            </div>

            {/* TAB 1: QUANTUM GATES */}
            {activeTab === 'gates' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span className="font-bold text-slate-300">SINGLE QUBIT UNITARY OPERATORS</span>
                  <span>Click to execute gate on Bloch sphere</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                  {/* Hadamard H */}
                  <button
                    onClick={() => handleApplyGate('H', 'Hadamard Gate', 'Creates equal superposition (|0>+|1>)/√2 by rotating π around (X+Z)/√2 axis.', 'Hadamard')}
                    className="p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400 text-left transition-all group shadow-sm hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-cyan-300 group-hover:text-cyan-200">H</span>
                      <span className="text-[8px] px-1 rounded bg-cyan-400/20 text-cyan-300">Superpose</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Hadamard Gate
                    </p>
                  </button>

                  {/* Pauli X */}
                  <button
                    onClick={() => handleApplyGate('X', 'Pauli-X Gate', 'Bit flip NOT gate. Rotates state by 180° (π) around the X-axis.', 'X')}
                    className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-500/20 border border-red-500/40 hover:border-red-400 text-left transition-all group shadow-sm hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-red-400 group-hover:text-red-300">X</span>
                      <span className="text-[8px] px-1 rounded bg-red-400/20 text-red-300">NOT</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Pauli-X (Bit Flip)
                    </p>
                  </button>

                  {/* Pauli Y */}
                  <button
                    onClick={() => handleApplyGate('Y', 'Pauli-Y Gate', 'Rotates state by 180° (π) around the Y-axis (Bit & phase flip).', 'Y')}
                    className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-left transition-all group shadow-sm hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-amber-400 group-hover:text-amber-300">Y</span>
                      <span className="text-[8px] px-1 rounded bg-amber-400/20 text-amber-300">π on Y</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Pauli-Y Gate
                    </p>
                  </button>

                  {/* Pauli Z */}
                  <button
                    onClick={() => handleApplyGate('Z', 'Pauli-Z Gate', 'Phase flip gate. Rotates state by 180° (π) around the Z-axis.', 'Z')}
                    className="p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400 text-left transition-all group shadow-sm hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-blue-400 group-hover:text-blue-300">Z</span>
                      <span className="text-[8px] px-1 rounded bg-blue-400/20 text-blue-300">Phase</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Pauli-Z (Phase Flip)
                    </p>
                  </button>

                  {/* Phase S Gate */}
                  <button
                    onClick={() => handleApplyGate('S', 'Phase S Gate', 'Rotates state by +90° (+π/2) around the Z-axis (Square root of Z).', 'Z')}
                    className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-500/20 border border-purple-500/40 hover:border-purple-400 text-left transition-all group shadow-sm hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-purple-300 group-hover:text-purple-200">S</span>
                      <span className="text-[8px] px-1 rounded bg-purple-400/20 text-purple-300">+π/2</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Phase S (√Z)
                    </p>
                  </button>

                  {/* T Gate */}
                  <button
                    onClick={() => handleApplyGate('T', 'T Gate', 'Non-Clifford gate. Rotates state by +45° (+π/4) around the Z-axis.', 'Z')}
                    className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group shadow-sm hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-emerald-300 group-hover:text-emerald-200">T</span>
                      <span className="text-[8px] px-1 rounded bg-emerald-400/20 text-emerald-300">+π/4</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      T Gate (π/4)
                    </p>
                  </button>

                  {/* Reset */}
                  <button
                    onClick={() => handleApplyGate('RESET', 'Ground State Reset', 'Re-initializes qubit to pure computational ground state |0>.', 'Preset')}
                    className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-left transition-all group shadow-sm col-span-2 hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        <span>RESET TO |0⟩</span>
                      </span>
                      <span className="text-[8px] px-1 rounded bg-white/10 text-slate-300">Ground</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Re-initialize to North Pole |0⟩
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PARAMETRIC ROTATIONS */}
            {activeTab === 'rotations' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Custom Rotation Generator: R_{customAxis}(θ)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      θ = {((customThetaAngle * 180) / Math.PI).toFixed(0)}° ({(customThetaAngle / Math.PI).toFixed(2)}π rad)
                    </span>
                  </div>

                  {/* Axis Selection */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['X', 'Y', 'Z'] as const).map(axis => (
                      <button
                        key={axis}
                        onClick={() => { soundEngine.playClick(800); setCustomAxis(axis); }}
                        className={`py-1.5 rounded-xl border font-bold transition-all ${
                          customAxis === axis
                            ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-md'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {axis}-Axis
                      </button>
                    ))}
                  </div>

                  {/* Angle Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={2 * Math.PI}
                      step={0.05}
                      value={customThetaAngle}
                      onChange={e => setCustomThetaAngle(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>0°</span>
                      <span>90° (π/2)</span>
                      <span>180° (π)</span>
                      <span>270° (3π/2)</span>
                      <span>360° (2π)</span>
                    </div>
                  </div>

                  {/* Quick Preset Angles */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[9px]">
                    {[
                      { label: '+π/4 (45°)', val: Math.PI / 4 },
                      { label: '+π/2 (90°)', val: Math.PI / 2 },
                      { label: '+π (180°)', val: Math.PI },
                      { label: '-π/2 (-90°)', val: -Math.PI / 2 },
                    ].map((step, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleApplyRotation(customAxis, step.val, step.label);
                        }}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-200 transition-all shrink-0"
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>

                  {/* Apply Custom Rotation Button */}
                  <button
                    onClick={() => {
                      handleApplyRotation(
                        customAxis,
                        customThetaAngle,
                        `${((customThetaAngle * 180) / Math.PI).toFixed(0)}°`
                      );
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Apply R_{customAxis}({((customThetaAngle * 180) / Math.PI).toFixed(0)}°) Rotation</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: BASIS PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="text-[10px] text-slate-400 px-1">
                  Instant snap to canonical quantum basis states on the Bloch sphere:
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* |0> */}
                  <button
                    onClick={() => handleApplyPreset(0, 0, '|0⟩ Ground State', 'North Pole: Pure ground state |0>')}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300 text-sm">|0⟩</span>
                      <span className="text-[8px] text-slate-400">θ=0°, φ=0°</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Ground state (North pole)</p>
                  </button>

                  {/* |1> */}
                  <button
                    onClick={() => handleApplyPreset(Math.PI, 0, '|1⟩ Excited State', 'South Pole: Pure excited state |1>')}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 hover:border-fuchsia-400 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-fuchsia-300 text-sm">|1⟩</span>
                      <span className="text-[8px] text-slate-400">θ=180°, φ=0°</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Excited state (South pole)</p>
                  </button>

                  {/* |+> */}
                  <button
                    onClick={() => handleApplyPreset(Math.PI / 2, 0, '|+⟩ Superposition', 'Positive X-axis: (|0> + |1>)/√2')}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-300 text-sm">|+⟩</span>
                      <span className="text-[8px] text-slate-400">θ=90°, φ=0°</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">(|0⟩ + |1⟩)/√2 (+X Axis)</p>
                  </button>

                  {/* |-> */}
                  <button
                    onClick={() => handleApplyPreset(Math.PI / 2, Math.PI, '|-⟩ Superposition', 'Negative X-axis: (|0> - |1>)/√2')}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-400 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-orange-300 text-sm">|-⟩</span>
                      <span className="text-[8px] text-slate-400">θ=90°, φ=180°</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">(|0⟩ - |1⟩)/√2 (-X Axis)</p>
                  </button>

                  {/* |+i> */}
                  <button
                    onClick={() => handleApplyPreset(Math.PI / 2, Math.PI / 2, '|+i⟩ Circular State', 'Positive Y-axis: (|0> + i|1>)/√2')}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-300 text-sm">|+i⟩</span>
                      <span className="text-[8px] text-slate-400">θ=90°, φ=90°</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">(|0⟩ + i|1⟩)/√2 (+Y Axis)</p>
                  </button>

                  {/* |-i> */}
                  <button
                    onClick={() => handleApplyPreset(Math.PI / 2, (3 * Math.PI) / 2, '|-i⟩ Circular State', 'Negative Y-axis: (|0> - i|1>)/√2')}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-300 text-sm">|-i⟩</span>
                      <span className="text-[8px] text-slate-400">θ=90°, φ=270°</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">(|0⟩ - i|1⟩)/√2 (-Y Axis)</p>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: DYNAMICS & READOUT */}
            {activeTab === 'dynamics' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Projective Measurement */}
                <div className="p-3 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Projective Measurement In Z-Basis</span>
                    </span>
                    <span className="text-[9px] text-slate-400">Dispersive Cavity</span>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Collapse the quantum superposition state vector randomly to |0⟩ or |1⟩ according to Born's probability rule:
                  </p>

                  <button
                    onClick={handleMeasure}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Perform Quantum Measurement</span>
                  </button>
                </div>

                {/* Larmor Free Precession */}
                <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                      <span>Larmor Free Precession</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${isPrecessing ? 'bg-purple-500/30 text-purple-200 animate-pulse' : 'bg-white/5 text-slate-400'}`}>
                      {isPrecessing ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Simulate continuous dynamical phase rotation around the Z-axis due to the transmon qubit frequency:
                  </p>

                  <button
                    onClick={() => {
                      soundEngine.playClick(900);
                      setIsPrecessing(!isPrecessing);
                    }}
                    className={`w-full py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isPrecessing
                        ? 'border-purple-400 bg-purple-500/20 text-purple-200'
                        : 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-500/10'
                    }`}
                  >
                    {isPrecessing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPrecessing ? 'Pause Precession' : 'Start Larmor Precession'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: ACTION LOG & HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span className="font-bold text-slate-300">CHRONOLOGICAL ACTION LOG</span>
                  {actionLog.length > 0 && (
                    <button
                      onClick={() => setActionLog([])}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                {actionLog.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-black/30 border border-dashed border-white/10 text-center text-slate-500 text-xs">
                    No actions performed yet. Apply a gate, rotation, or preset to record operations.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {actionLog.map(item => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs hover:border-cyan-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {item.gate}
                          </span>
                          <div>
                            <span className="font-bold text-slate-200 block text-[11px]">{item.name}</span>
                            <span className="text-[9px] text-slate-400 line-clamp-1">{item.desc}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-500 block">{item.time}</span>
                          <span className="text-[8px] text-cyan-400">
                            θ: {((item.newTheta * 180) / Math.PI).toFixed(0)}° | φ: {((item.newPhi * 180) / Math.PI).toFixed(0)}°
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>Bloch coordinates: (θ: {(currentQubit.theta * (180 / Math.PI)).toFixed(1)}°, φ: {(currentQubit.phi * (180 / Math.PI)).toFixed(1)}°)</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-bold">Transmon {currentQubit.frequencyGhz.toFixed(2)} GHz</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
