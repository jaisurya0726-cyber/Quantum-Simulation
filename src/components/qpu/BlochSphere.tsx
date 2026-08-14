import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BlochSphereProps {
  theta: number; // 0 to PI
  phi: number;   // 0 to 2*PI
  qubitLabel: string;
}

export const BlochSphere: React.FC<BlochSphereProps> = ({ theta, phi, qubitLabel }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const vectorArrowRef = useRef<THREE.ArrowHelper | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20);
    camera.position.set(2.4, 1.8, 2.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Sphere wireframe
    const sphereGeo = new THREE.SphereGeometry(1.0, 24, 16);
    const sphereWireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#334155'),
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereWireMat);
    scene.add(sphere);

    // Coordinate Axes (X: Red, Y: Green, Z: Cyan)
    const axesGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#64748b'), transparent: true, opacity: 0.6 });

    // Z-axis (|0> to |1>)
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.3, 0), new THREE.Vector3(0, 1.3, 0)]);
    axesGroup.add(new THREE.Line(zGeo, lineMat));

    // X-axis (|+> to |->)
    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.3, 0, 0), new THREE.Vector3(1.3, 0, 0)]);
    axesGroup.add(new THREE.Line(xGeo, lineMat));

    // Y-axis (|i> to |-i>)
    const yGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1.3), new THREE.Vector3(0, 0, 1.3)]);
    axesGroup.add(new THREE.Line(yGeo, lineMat));

    // Equator ring
    const ringGeo = new THREE.RingGeometry(0.99, 1.01, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#0284c7'), side: THREE.DoubleSide, opacity: 0.4, transparent: true }));
    axesGroup.add(ring);

    scene.add(axesGroup);

    // State Vector Arrow
    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    ).normalize();

    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 1.0, 0x00f0ff, 0.2, 0.12);
    scene.add(arrow);
    vectorArrowRef.current = arrow;

    // Glowing tip sphere
    const tipGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const tipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#38bdf8') });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.copy(dir);
    scene.add(tip);

    let animationId: number;
    let currentDir = dir.clone();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Target vector from props
      const targetDir = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      ).normalize();

      currentDir.lerp(targetDir, 0.12);

      if (vectorArrowRef.current) {
        vectorArrowRef.current.setDirection(currentDir.clone().normalize());
        vectorArrowRef.current.setLength(1.0, 0.18, 0.1);
        tip.position.copy(currentDir);
      }

      axesGroup.rotation.y += 0.003;
      sphere.rotation.y += 0.003;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [theta, phi]);

  return (
    <div className="relative flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/80 border border-slate-700/60">
      <div className="text-xs font-mono font-medium text-cyan-300 flex items-center justify-between w-full px-2 mb-1">
        <span>Bloch Sphere ({qubitLabel})</span>
        <span className="text-[10px] text-slate-400">|ψ⟩ = α|0⟩ + β|1⟩</span>
      </div>

      <div ref={mountRef} className="w-48 h-48 relative" />

      {/* Axis Pole Labels */}
      <div className="absolute top-8 text-[11px] font-mono font-bold text-cyan-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
        |0⟩
      </div>
      <div className="absolute bottom-8 text-[11px] font-mono font-bold text-magenta-400 text-fuchsia-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-fuchsia-500/30">
        |1⟩
      </div>

      {/* Numerical Angles */}
      <div className="flex items-center justify-between w-full px-2 mt-1 text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-1.5">
        <span>θ: {(theta * (180 / Math.PI)).toFixed(1)}°</span>
        <span>φ: {(phi * (180 / Math.PI)).toFixed(1)}°</span>
      </div>
    </div>
  );
};
