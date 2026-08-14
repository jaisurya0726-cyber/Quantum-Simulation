import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildQuantumComputerModel, GeneratedQuantumModel } from './quantumModelBuilder';
import { ParticleFlowSystem } from './ParticleFlowSystem';
import { AppMode, QubitState } from '../../types';
import { soundEngine } from '../../utils/audio';

interface QuantumCanvasProps {
  currentMode: AppMode;
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  explodedProgress: number; // 0.0 to 1.0
  cutawayActive: boolean;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  flowActive: boolean;
  qubitStates: QubitState[];
  selectedQubitId: number | null;
  onSelectQubit: (id: number | null) => void;
  thermalNoiseActive?: boolean;
  thermalNoiseIntensity?: number;
}

export const QuantumCanvas: React.FC<QuantumCanvasProps> = ({
  currentMode,
  selectedComponentId,
  onSelectComponent,
  explodedProgress,
  cutawayActive,
  autoRotate,
  flowActive,
  qubitStates,
  selectedQubitId,
  onSelectQubit,
  thermalNoiseActive = false,
  thermalNoiseIntensity = 1.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelDataRef = useRef<GeneratedQuantumModel | null>(null);
  const particleSystemRef = useRef<ParticleFlowSystem | null>(null);

  // Hover tooltip state
  const [hoverInfo, setHoverInfo] = useState<{ name: string; x: number; y: number } | null>(null);
  const [activeQpuLayerName, setActiveQpuLayerName] = useState<string | null>(null);

  // Camera animation target refs
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.8, 7.8));
  const cameraLookAtTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.4, 0));
  const cameraCurrentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.4, 0));

  // QPU expansion animation ref
  const currentQpuExpandProgress = useRef<number>(0);
  const isQpuExpandedRef = useRef<boolean>(false);

  // Selected plate highlight tracker
  const currentlyHighlightedPlate = useRef<{ mesh: THREE.Mesh; originalEmissive: THREE.Color } | null>(null);

  // Interaction controls
  const isDragging = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const sphericalCoords = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 7.8,
    theta: Math.PI / 4,
    phi: Math.PI / 2.3,
  });

  // Dynamic props refs for animation loop
  const autoRotateRef = useRef<boolean>(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const selectedComponentIdRef = useRef<string | null>(selectedComponentId);
  useEffect(() => {
    selectedComponentIdRef.current = selectedComponentId;
  }, [selectedComponentId]);

  const flowActiveRef = useRef<boolean>(flowActive);
  useEffect(() => {
    flowActiveRef.current = flowActive;
  }, [flowActive]);

  const currentModeRef = useRef<AppMode>(currentMode);
  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let animationFrameId: number;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07090e');
    scene.fog = new THREE.FogExp2('#07090e', 0.035);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.8, 7.8);
    camera.lookAt(0, 0.4, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 4. Studio & Volumetric Lighting
    const ambientLight = new THREE.AmbientLight(new THREE.Color('#38465c'), 1.1);
    scene.add(ambientLight);

    // Golden specular key light
    const keyLight = new THREE.DirectionalLight(new THREE.Color('#fff4db'), 2.4);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Cyan cool rim light
    const rimLight = new THREE.DirectionalLight(new THREE.Color('#00c8ff'), 1.8);
    rimLight.position.set(-6, -2, -5);
    scene.add(rimLight);

    // Soft warm fill light
    const fillLight = new THREE.DirectionalLight(new THREE.Color('#ffd180'), 1.4);
    fillLight.position.set(-4, 6, 4);
    scene.add(fillLight);

    // QPU base glow spotlight
    const qpuSpot = new THREE.SpotLight(new THREE.Color('#00f0ff'), 2.0, 6, Math.PI / 4, 0.4);
    qpuSpot.position.set(0, -5, 0);
    qpuSpot.target.position.set(0, -2.7, 0);
    scene.add(qpuSpot);
    scene.add(qpuSpot.target);

    // 5. Grid floor in laboratory
    const grid = new THREE.GridHelper(24, 24, new THREE.Color('#1e293b'), new THREE.Color('#0f172a'));
    grid.position.y = -4.5;
    scene.add(grid);

    // 6. Build the Procedural Quantum Computer 3D Model
    const model = buildQuantumComputerModel();
    scene.add(model.rootGroup);
    modelDataRef.current = model;

    // 7. Particle Flow System
    const particleSys = new ParticleFlowSystem();
    particleSys.setupSignalPulses(model.cableCurves);
    scene.add(particleSys.getGroup());
    particleSystemRef.current = particleSys;

    // 8. Raycaster & Mouse Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh: THREE.Mesh | null = null;
    let originalEmissive: THREE.Color | null = null;

    // 3D Visual Focus Ring Marker
    const focusRingGeo = new THREE.RingGeometry(0.04, 0.08, 32);
    const focusRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00f0ff'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    const focusRing = new THREE.Mesh(focusRingGeo, focusRingMat);
    focusRing.renderOrder = 999;
    scene.add(focusRing);
    let focusRingAnimTime = 0;

    const triggerFocusRing = (point: THREE.Vector3) => {
      focusRing.position.copy(point);
      focusRing.quaternion.copy(camera.quaternion);
      focusRing.scale.set(1, 1, 1);
      focusRingMat.opacity = 1.0;
      focusRingAnimTime = 1.0;
    };

    // Pan & Drag state trackers
    let isPanning = false;
    let touchStartDist = 0;
    let touchStartMidpoint = { x: 0, y: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle Pan (Right click, Middle click, or Shift + Left click)
      if (isPanning) {
        const deltaX = e.clientX - previousMousePosition.current.x;
        const deltaY = e.clientY - previousMousePosition.current.y;

        const forward = new THREE.Vector3().subVectors(cameraCurrentLookAt.current, camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const panSpeed = sphericalCoords.current.radius * 0.0018;

        cameraLookAtTarget.current.addScaledVector(right, -deltaX * panSpeed);
        cameraLookAtTarget.current.addScaledVector(up, deltaY * panSpeed);

        previousMousePosition.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Handle Orbit Drag (Left click without shift)
      if (isDragging.current) {
        const deltaX = e.clientX - previousMousePosition.current.x;
        const deltaY = e.clientY - previousMousePosition.current.y;

        sphericalCoords.current.theta -= deltaX * 0.006;
        sphericalCoords.current.phi = Math.max(0.08, Math.min(Math.PI - 0.08, sphericalCoords.current.phi - deltaY * 0.006));

        previousMousePosition.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Raycast hover detection
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(model.interactiveObjects, true);

      if (intersects.length > 0) {
        let topInteractive: THREE.Object3D | null = intersects[0].object;
        while (topInteractive && !topInteractive.userData.isInteractive && !topInteractive.userData.isQubit && topInteractive.parent) {
          topInteractive = topInteractive.parent;
        }

        if (topInteractive && (topInteractive.userData.isInteractive || topInteractive.userData.isQubit)) {
          const hitObj = topInteractive;
          setHoverInfo({
            name: hitObj.userData.name || 'Cryogenic Component',
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });

          if (intersects[0].object instanceof THREE.Mesh) {
            if (hoveredMesh !== intersects[0].object) {
              // Restore old
              if (hoveredMesh && hoveredMesh.material && 'emissive' in hoveredMesh.material && originalEmissive) {
                (hoveredMesh.material as THREE.MeshStandardMaterial).emissive.copy(originalEmissive);
              }
              hoveredMesh = intersects[0].object;
              if (hoveredMesh.material && 'emissive' in hoveredMesh.material) {
                originalEmissive = (hoveredMesh.material as THREE.MeshStandardMaterial).emissive.clone();
                (hoveredMesh.material as THREE.MeshStandardMaterial).emissive.set('#00e5ff');
              }
            }
          }
          container.style.cursor = 'pointer';
          return;
        }
      }

      // No hover
      setHoverInfo(null);
      if (hoveredMesh && hoveredMesh.material && 'emissive' in hoveredMesh.material && originalEmissive) {
        (hoveredMesh.material as THREE.MeshStandardMaterial).emissive.copy(originalEmissive);
        hoveredMesh = null;
        originalEmissive = null;
      }
      container.style.cursor = 'default';
    };

    const onPointerDown = (e: PointerEvent) => {
      // Check if panning (right click, middle click, or shift + left click)
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        isPanning = true;
      } else {
        isDragging.current = true;
      }
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent native right-click menu to allow panning
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      isPanning = false;
      const rect = container.getBoundingClientRect();
      const clickDist = Math.hypot(e.clientX - previousMousePosition.current.x, e.clientY - previousMousePosition.current.y);

      // Clean single click (not drag or pan)
      if (clickDist < 5 && e.button === 0 && !e.shiftKey) {
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        
        // Raycast against interactive objects first, then rootGroup
        let intersects = raycaster.intersectObjects(model.interactiveObjects, true);
        if (intersects.length === 0) {
          intersects = raycaster.intersectObjects(model.rootGroup.children, true);
        }

        if (intersects.length > 0) {
          const hitPoint = intersects[0].point;
          triggerFocusRing(hitPoint);

          let topInteractive: THREE.Object3D | null = intersects[0].object;
          while (topInteractive && !topInteractive.userData.isInteractive && !topInteractive.userData.isQubit && topInteractive.parent) {
            topInteractive = topInteractive.parent;
          }

          if (topInteractive) {
            if (topInteractive.userData.isQubit) {
              soundEngine.playGateApplication('H');
              onSelectQubit(topInteractive.userData.qubitId);
              onSelectComponent('qpu-chip');
              cameraLookAtTarget.current.set(hitPoint.x, hitPoint.y, hitPoint.z);
              sphericalCoords.current.radius = Math.max(0.7, Math.min(sphericalCoords.current.radius, 1.4));
            } else if (topInteractive.userData.componentId) {
              soundEngine.playClick(900);
              onSelectComponent(topInteractive.userData.componentId);
              cameraLookAtTarget.current.set(hitPoint.x, hitPoint.y, hitPoint.z);
              sphericalCoords.current.radius = Math.max(0.8, Math.min(sphericalCoords.current.radius, 2.5));
            } else {
              // Zoom directly into the clicked 3D point
              cameraLookAtTarget.current.set(hitPoint.x, hitPoint.y, hitPoint.z);
              sphericalCoords.current.radius = Math.max(0.6, Math.min(sphericalCoords.current.radius, 2.2));
            }
          } else {
            // General structure point focus
            cameraLookAtTarget.current.set(hitPoint.x, hitPoint.y, hitPoint.z);
            sphericalCoords.current.radius = Math.max(0.6, Math.min(sphericalCoords.current.radius, 2.2));
          }
        }
      }
    };

    // Double-click to instantly zoom in deep to any specific point
    const onDoubleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(model.rootGroup.children, true);

      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        triggerFocusRing(hitPoint);
        soundEngine.playClick(1100);

        // Center on exact clicked point and zoom deep in (Macro inspection)
        cameraLookAtTarget.current.set(hitPoint.x, hitPoint.y, hitPoint.z);
        sphericalCoords.current.radius = Math.max(0.5, sphericalCoords.current.radius * 0.45);
      }
    };

    // Touch Event Handlers (Pinch-to-zoom & two-finger pan)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isDragging.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.hypot(dx, dy);
        touchStartMidpoint = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      } else if (e.touches.length === 1) {
        isDragging.current = true;
        previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDist > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const distDelta = currentDist - touchStartDist;

        // Pinch zoom
        sphericalCoords.current.radius = Math.max(
          0.4,
          Math.min(16.0, sphericalCoords.current.radius - distDelta * 0.01)
        );
        touchStartDist = currentDist;

        // Two-finger pan
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const panDx = midX - touchStartMidpoint.x;
        const panDy = midY - touchStartMidpoint.y;

        const forward = new THREE.Vector3().subVectors(cameraCurrentLookAt.current, camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const panSpeed = sphericalCoords.current.radius * 0.0018;

        cameraLookAtTarget.current.addScaledVector(right, -panDx * panSpeed);
        cameraLookAtTarget.current.addScaledVector(up, panDy * panSpeed);

        touchStartMidpoint = { x: midX, y: midY };
      } else if (e.touches.length === 1 && isDragging.current) {
        const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

        sphericalCoords.current.theta -= deltaX * 0.006;
        sphericalCoords.current.phi = Math.max(0.08, Math.min(Math.PI - 0.08, sphericalCoords.current.phi - deltaY * 0.006));

        previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = () => {
      isDragging.current = false;
      touchStartDist = 0;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalCoords.current.radius = Math.max(0.4, Math.min(16.0, sphericalCoords.current.radius + e.deltaY * 0.005));
    };

    const onCustomZoom = (e: Event) => {
      const customEvent = e as CustomEvent<{ delta: number }>;
      if (customEvent.detail && typeof customEvent.detail.delta === 'number') {
        sphericalCoords.current.radius = Math.max(
          0.4,
          Math.min(16.0, sphericalCoords.current.radius + customEvent.detail.delta)
        );
      }
    };

    const onCustomZoomSet = (e: Event) => {
      const customEvent = e as CustomEvent<{ radius: number }>;
      if (customEvent.detail && typeof customEvent.detail.radius === 'number') {
        sphericalCoords.current.radius = Math.max(0.4, Math.min(16.0, customEvent.detail.radius));
      }
    };

    const onCustomFocusSpot = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: [number, number, number]; radius?: number; componentId?: string }>;
      if (customEvent.detail && customEvent.detail.target) {
        const [tx, ty, tz] = customEvent.detail.target;
        cameraLookAtTarget.current.set(tx, ty, tz);
        if (typeof customEvent.detail.radius === 'number') {
          sphericalCoords.current.radius = Math.max(0.4, Math.min(16.0, customEvent.detail.radius));
        }
        triggerFocusRing(new THREE.Vector3(tx, ty, tz));
        if (customEvent.detail.componentId) {
          onSelectComponent(customEvent.detail.componentId);
        }
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('contextmenu', onContextMenu);
    container.addEventListener('dblclick', onDoubleClick);
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('quantum-zoom', onCustomZoom);
    window.addEventListener('quantum-zoom-set', onCustomZoomSet);
    window.addEventListener('quantum-focus-spot', onCustomFocusSpot);

    // Handle window resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Auto-rotation when enabled and not user dragging
      if (autoRotateRef.current && !isDragging.current) {
        sphericalCoords.current.theta += delta * 0.35;
      }

      // Convert spherical coordinates to camera target position around the look-at focus point
      const r = sphericalCoords.current.radius;
      const theta = sphericalCoords.current.theta;
      const phi = sphericalCoords.current.phi;

      const targetX = cameraLookAtTarget.current.x + r * Math.sin(phi) * Math.sin(theta);
      const targetY = cameraLookAtTarget.current.y + r * Math.cos(phi);
      const targetZ = cameraLookAtTarget.current.z + r * Math.sin(phi) * Math.cos(theta);

      cameraTargetPos.current.set(targetX, targetY, targetZ);

      // Smooth camera interpolation (lerp)
      camera.position.lerp(cameraTargetPos.current, 0.08);
      cameraCurrentLookAt.current.lerp(cameraLookAtTarget.current, 0.08);
      camera.lookAt(cameraCurrentLookAt.current);

      // Smoothly animate 3D QPU exploded layer expansion
      const targetQpuExpand = isQpuExpandedRef.current ? 1.0 : 0.0;
      currentQpuExpandProgress.current = THREE.MathUtils.lerp(
        currentQpuExpandProgress.current,
        targetQpuExpand,
        0.08
      );

      if (modelDataRef.current?.qpuParts) {
        const p = currentQpuExpandProgress.current;
        const qp = modelDataRef.current.qpuParts;
        qp.lidGroup.position.y = 0.12 + p * 0.45;
        qp.lidGroup.rotation.y = p * 0.25;
        qp.qubitsGroup.position.y = p * 0.22;
        qp.resonatorsGroup.position.y = p * 0.08;
        qp.baseGroup.position.y = -0.10 - p * 0.35;
      }

      // Pulse selected gold plate emissive glow
      if (currentlyHighlightedPlate.current?.mesh) {
        const hMesh = currentlyHighlightedPlate.current.mesh;
        if (hMesh.material && 'emissive' in hMesh.material) {
          const pulse = 0.6 + 0.4 * Math.sin(time * 4);
          (hMesh.material as THREE.MeshStandardMaterial).emissive.setRGB(0.9 * pulse, 0.7 * pulse, 0.2 * pulse);
        }
      }

      // Update particle flows and thermal agitation
      particleSys.update(delta, flowActiveRef.current || currentModeRef.current === 'flow', time);

      // Animate 3D Focus Marker Ring
      if (focusRingAnimTime > 0) {
        focusRingAnimTime -= delta * 1.5;
        const scaleVal = 1 + (1 - Math.max(0, focusRingAnimTime)) * 2.2;
        focusRing.scale.set(scaleVal, scaleVal, scaleVal);
        focusRing.quaternion.copy(camera.quaternion);
        focusRingMat.opacity = Math.max(0, focusRingAnimTime);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('dblclick', onDoubleClick);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('quantum-zoom', onCustomZoom);
      window.removeEventListener('quantum-zoom-set', onCustomZoomSet);
      window.removeEventListener('quantum-focus-spot', onCustomFocusSpot);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update exploded view offsets smoothly
  useEffect(() => {
    if (!modelDataRef.current) return;
    const model = modelDataRef.current;
    model.stages.forEach(s => {
      s.group.position.y = s.baseOffsetY + s.explodedOffsetMultiplier * explodedProgress * 1.5;
    });
  }, [explodedProgress]);

  // Update cutaway radiation shields visibility
  useEffect(() => {
    if (!modelDataRef.current) return;
    modelDataRef.current.shieldsGroup.visible = cutawayActive;
  }, [cutawayActive]);

  // Update mode-specific camera and particle visibility
  useEffect(() => {
    if (!particleSystemRef.current) return;
    const particleSys = particleSystemRef.current;

    particleSys.setThermalIntensity(thermalNoiseIntensity);

    if (thermalNoiseActive || currentMode === 'dilution') {
      particleSys.setThermalParticlesVisible(true);
      particleSys.setSignalPulsesVisible(flowActive);
      if (currentMode === 'dilution') {
        cameraTargetPos.current.set(0, 0.6, 6.2);
        cameraLookAtTarget.current.set(0, 0.5, 0);
      }
    } else if (currentMode === 'qpu') {
      particleSys.setThermalParticlesVisible(false);
      particleSys.setSignalPulsesVisible(true);
      cameraTargetPos.current.set(0, -2.2, 1.2);
      cameraLookAtTarget.current.set(0, -2.7, 0);
    } else if (currentMode === 'flow') {
      particleSys.setThermalParticlesVisible(false);
      particleSys.setSignalPulsesVisible(true);
      cameraTargetPos.current.set(2.5, 1.2, 5.5);
      cameraLookAtTarget.current.set(0, 0.2, 0);
    } else {
      particleSys.setThermalParticlesVisible(false);
      particleSys.setSignalPulsesVisible(flowActive);
      if (!selectedComponentId) {
        cameraLookAtTarget.current.set(0, 0.4, 0);
      }
    }
  }, [currentMode, flowActive, thermalNoiseActive, thermalNoiseIntensity, selectedComponentId]);

  // Update camera and plate highlight on component selection
  useEffect(() => {
    isQpuExpandedRef.current = selectedComponentId === 'qpu-chip' || currentMode === 'qpu';

    // Restore previous plate emissive
    if (currentlyHighlightedPlate.current) {
      const { mesh, originalEmissive } = currentlyHighlightedPlate.current;
      if (mesh.material && 'emissive' in mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).emissive.copy(originalEmissive);
      }
      currentlyHighlightedPlate.current = null;
    }

    // Set new plate highlight if selected
    if (selectedComponentId && modelDataRef.current?.plateMeshes[selectedComponentId]) {
      const pMesh = modelDataRef.current.plateMeshes[selectedComponentId];
      if (pMesh.material && 'emissive' in pMesh.material) {
        currentlyHighlightedPlate.current = {
          mesh: pMesh,
          originalEmissive: (pMesh.material as THREE.MeshStandardMaterial).emissive.clone(),
        };
      }
    }

    if (!selectedComponentId) {
      cameraLookAtTarget.current.set(0, 0.4, 0);
      sphericalCoords.current.radius = 7.8;
      sphericalCoords.current.phi = Math.PI / 2.3;
      return;
    }

    if (selectedComponentId === 'qpu-chip') {
      cameraLookAtTarget.current.set(0, -2.7, 0);
      sphericalCoords.current.radius = 2.4;
      sphericalCoords.current.phi = Math.PI / 2.5;
    } else if (selectedComponentId === 'top-flange') {
      cameraLookAtTarget.current.set(0, 3.8, 0);
      sphericalCoords.current.radius = 4.2;
      sphericalCoords.current.phi = Math.PI / 2.4;
    } else if (selectedComponentId === 'stage-50k') {
      cameraLookAtTarget.current.set(0, 2.4, 0);
      sphericalCoords.current.radius = 3.6;
      sphericalCoords.current.phi = Math.PI / 2.4;
    } else if (selectedComponentId === 'stage-4k' || selectedComponentId === 'hemt-amps') {
      cameraLookAtTarget.current.set(0, 1.0, 0);
      sphericalCoords.current.radius = 3.2;
      sphericalCoords.current.phi = Math.PI / 2.4;
    } else if (selectedComponentId === 'stage-1k') {
      cameraLookAtTarget.current.set(0, -0.2, 0);
      sphericalCoords.current.radius = 3.0;
      sphericalCoords.current.phi = Math.PI / 2.4;
    } else if (selectedComponentId === 'stage-100mk' || selectedComponentId === 'circulators') {
      cameraLookAtTarget.current.set(0, -1.3, 0);
      sphericalCoords.current.radius = 2.8;
      sphericalCoords.current.phi = Math.PI / 2.4;
    } else if (selectedComponentId === 'stage-10mk') {
      cameraLookAtTarget.current.set(0, -2.3, 0);
      sphericalCoords.current.radius = 2.6;
      sphericalCoords.current.phi = Math.PI / 2.4;
    } else if (selectedComponentId === 'attenuators') {
      cameraLookAtTarget.current.set(0, 1.0, 0);
      sphericalCoords.current.radius = 3.2;
      sphericalCoords.current.phi = Math.PI / 2.4;
    }
  }, [selectedComponentId, currentMode]);

  // Update Qubit glow colors in real-time based on simulation state
  useEffect(() => {
    if (!modelDataRef.current) return;
    const { qubitMeshes } = modelDataRef.current;

    qubitMeshes.forEach(qm => {
      const qState = qubitStates.find(q => q.id === qm.id);
      if (!qState) return;

      const prob1 = qState.beta.real * qState.beta.real + qState.beta.imag * qState.beta.imag;
      const isSelected = selectedQubitId === qm.id;

      // Color shifts from cyan (|0>) to bright magenta/violet (|1>)
      const col = new THREE.Color('#00f0ff').lerp(new THREE.Color('#d946ef'), prob1);
      if (isSelected) {
        col.set('#ffe600'); // Gold when selected
      }

      const mat = qm.mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(col);
      mat.emissive.copy(col);
      mat.emissiveIntensity = isSelected ? 3.5 : 1.8 + prob1 * 1.5;

      qm.light.color.copy(col);
      qm.light.intensity = isSelected ? 0.9 : 0.4 + prob1 * 0.4;
    });
  }, [qubitStates, selectedQubitId]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 3D Hover Tooltip */}
      {hoverInfo && (
        <div
          id="quantum-hover-tooltip"
          className="pointer-events-none absolute z-20 px-3 py-1.5 rounded-md bg-slate-900/90 text-cyan-300 text-xs font-mono border border-cyan-500/40 shadow-lg backdrop-blur-md transition-opacity duration-150"
          style={{
            left: `${hoverInfo.x + 16}px`,
            top: `${hoverInfo.y + 16}px`,
            transform: 'translate(0, 0)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-slate-100">{hoverInfo.name}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Click to inspect in detail</div>
        </div>
      )}

      {/* Floating Expanded QPU 3D Layer HUD Tag */}
      {(selectedComponentId === 'qpu-chip' || currentMode === 'qpu') && (
        <div
          id="qpu-expanded-3d-tag"
          className="absolute bottom-6 left-6 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/70 border border-fuchsia-500/50 backdrop-blur-xl shadow-[0_0_25px_rgba(217,70,239,0.25)] font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-ping" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-fuchsia-300 tracking-wider uppercase flex items-center gap-1.5">
              QPU 3D LAYER EXPLODED VIEW
            </span>
            <span className="text-[9px] text-slate-400">
              Lid ↑ | Transmons | CPW Resonators | Copper Base ↓
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
