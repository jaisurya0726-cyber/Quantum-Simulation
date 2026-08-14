import * as THREE from 'three';

export class ParticleFlowSystem {
  private particlesGroup: THREE.Group;
  private pulsePoints: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; progress: number; speed: number; type: 'downward' | 'upward' }[] = [];
  private thermalParticles: THREE.Points | null = null;
  private thermalVelocities: Float32Array | null = null;
  private thermalBasePositions: Float32Array | null = null;

  constructor() {
    this.particlesGroup = new THREE.Group();
    this.particlesGroup.name = 'ParticleFlow_Group';
  }

  public getGroup(): THREE.Group {
    return this.particlesGroup;
  }

  // Initialize microwave/readout pulses along cable curves
  public setupSignalPulses(cableCurves: { curve: THREE.CatmullRomCurve3; type: 'downward' | 'upward'; color: string }[]) {
    // Clear old
    while (this.particlesGroup.children.length > 0) {
      this.particlesGroup.remove(this.particlesGroup.children[0]);
    }
    this.pulsePoints = [];

    const pulseGeo = new THREE.SphereGeometry(0.038, 12, 12);

    const downMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00f0ff'),
    });

    const upMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffd54f'),
    });

    cableCurves.forEach((item, index) => {
      // 2 pulses per cable at staggered offsets
      for (let p = 0; p < 2; p++) {
        const mesh = new THREE.Mesh(pulseGeo, item.type === 'downward' ? downMat : upMat);
        const progress = (p * 0.5 + (index * 0.07)) % 1.0;
        const pt = item.curve.getPoint(progress);
        mesh.position.copy(pt);
        this.particlesGroup.add(mesh);

        this.pulsePoints.push({
          mesh,
          curve: item.curve,
          progress,
          speed: 0.35 + Math.random() * 0.15,
          type: item.type,
        });
      }
    });

    this.setupThermalParticleField();
  }

  private thermalIntensity: number = 1.0;
  private thermalRings: THREE.LineLoop[] = [];

  // Setup thermal particle agitation column to show cooling gradient
  private setupThermalParticleField() {
    const count = 750;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.thermalVelocities = new Float32Array(count * 3);
    this.thermalBasePositions = new Float32Array(count * 3);

    const colorHot = new THREE.Color('#ff3b30');   // 300K Deep Red
    const colorWarm = new THREE.Color('#ff9500');  // 50K Amber Orange
    const colorMid = new THREE.Color('#ffcc00');   // 4K Golden Yellow
    const colorCool = new THREE.Color('#30b0c7');  // 1K Turquoise
    const colorCold = new THREE.Color('#00f0ff');  // 100mK Cyan
    const colorUltra = new THREE.Color('#7b61ff'); // 15mK Quantum Frozen Indigo

    for (let i = 0; i < count; i++) {
      // Stratified thermal volume
      const y = (Math.random() * 6.8) - 2.8; // From -2.8 (QPU) to +4.0 (Flange)
      
      // Radius expands near plates and outer vacuum envelope
      const baseRadius = 0.45 + (y + 3.0) * 0.32;
      const radius = baseRadius * (0.4 + Math.random() * 0.9);
      const angle = Math.random() * Math.PI * 2;

      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.thermalBasePositions[i * 3] = x;
      this.thermalBasePositions[i * 3 + 1] = y;
      this.thermalBasePositions[i * 3 + 2] = z;

      this.thermalVelocities[i * 3] = (Math.random() - 0.5) * 0.08;
      this.thermalVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      this.thermalVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;

      // Physically accurate gradient coloring based on height/temperature
      const normalizedHeight = Math.max(0, Math.min(1, (y + 2.8) / 6.8)); // 0 (15mK) to 1 (300K)
      let c = new THREE.Color();
      
      if (normalizedHeight > 0.8) {
        c.copy(colorHot).lerp(colorWarm, (1.0 - normalizedHeight) / 0.2);
      } else if (normalizedHeight > 0.55) {
        c.copy(colorWarm).lerp(colorMid, (0.8 - normalizedHeight) / 0.25);
      } else if (normalizedHeight > 0.35) {
        c.copy(colorMid).lerp(colorCool, (0.55 - normalizedHeight) / 0.2);
      } else if (normalizedHeight > 0.15) {
        c.copy(colorCool).lerp(colorCold, (0.35 - normalizedHeight) / 0.2);
      } else {
        c.copy(colorCold).lerp(colorUltra, (0.15 - normalizedHeight) / 0.15);
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.048,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.thermalParticles = new THREE.Points(geo, mat);
    this.thermalParticles.visible = false; // Enabled via Thermal Side Button or Dilution mode
    this.particlesGroup.add(this.thermalParticles);

    // Add thermal radiation wave rings at key temperature stages
    const ringHeights = [
      { y: 3.8, radius: 2.1, color: '#ff3b30', opacity: 0.25 }, // 300K
      { y: 2.4, radius: 1.8, color: '#ff9500', opacity: 0.22 }, // 50K
      { y: 1.1, radius: 1.5, color: '#ffcc00', opacity: 0.18 }, // 4K
      { y: -0.2, radius: 1.2, color: '#30b0c7', opacity: 0.15 }, // 1K
      { y: -1.3, radius: 0.95, color: '#00f0ff', opacity: 0.12 }, // 100mK
      { y: -2.3, radius: 0.75, color: '#7b61ff', opacity: 0.09 }, // 15mK
    ];

    this.thermalRings = [];
    ringHeights.forEach(ring => {
      const ringGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const segments = 48;
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * ring.radius, 0, Math.sin(theta) * ring.radius));
      }
      ringGeo.setFromPoints(points);
      const ringMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(ring.color),
        transparent: true,
        opacity: ring.opacity,
      });
      const lineLoop = new THREE.LineLoop(ringGeo, ringMat);
      lineLoop.position.y = ring.y;
      lineLoop.visible = false;
      this.thermalRings.push(lineLoop);
      this.particlesGroup.add(lineLoop);
    });
  }

  public setThermalParticlesVisible(visible: boolean) {
    if (this.thermalParticles) {
      this.thermalParticles.visible = visible;
    }
    this.thermalRings.forEach(ring => {
      ring.visible = visible;
    });
  }

  public setThermalIntensity(intensity: number) {
    this.thermalIntensity = Math.max(0.1, Math.min(4.0, intensity));
    if (this.thermalParticles && this.thermalParticles.material instanceof THREE.PointsMaterial) {
      this.thermalParticles.material.opacity = Math.min(0.95, 0.45 + 0.3 * this.thermalIntensity);
      this.thermalParticles.material.size = 0.035 * Math.min(2.0, 0.7 + 0.3 * this.thermalIntensity);
    }
  }

  public setSignalPulsesVisible(visible: boolean) {
    this.pulsePoints.forEach(p => {
      p.mesh.visible = visible;
    });
  }

  // Update pulse positions along splines and thermal agitation
  public update(delta: number, flowActive: boolean, time: number) {
    if (flowActive) {
      for (let i = 0; i < this.pulsePoints.length; i++) {
        const p = this.pulsePoints[i];
        p.progress = (p.progress + p.speed * delta) % 1.0;
        const actualT = p.type === 'downward' ? p.progress : (1.0 - p.progress);
        const pos = p.curve.getPoint(actualT);
        p.mesh.position.copy(pos);
      }
    }

    // Thermal agitation update
    if (this.thermalParticles && this.thermalParticles.visible && this.thermalBasePositions && this.thermalVelocities) {
      const posAttr = this.thermalParticles.geometry.attributes.position as THREE.BufferAttribute;
      const count = posAttr.count;
      const intensity = this.thermalIntensity;

      for (let i = 0; i < count; i++) {
        const y = this.thermalBasePositions[i * 3 + 1];
        // Height factor: warm top (300K) agitates vigorously, cold base (15mK) is near zero-point quantum ground state
        const tempFactor = Math.max(0.015, Math.pow((y + 2.85) / 6.85, 1.35)) * intensity;
        
        const speed = 10 * intensity;
        const jitterX = Math.sin(time * speed + i * 1.7) * 0.065 * tempFactor;
        const jitterY = Math.cos(time * (speed * 0.8) + i * 2.3) * 0.035 * tempFactor;
        const jitterZ = Math.sin(time * (speed * 1.2) + i * 3.1) * 0.065 * tempFactor;

        posAttr.setX(i, this.thermalBasePositions[i * 3] + jitterX);
        posAttr.setY(i, this.thermalBasePositions[i * 3 + 1] + jitterY);
        posAttr.setZ(i, this.thermalBasePositions[i * 3 + 2] + jitterZ);
      }
      posAttr.needsUpdate = true;

      // Animate thermal radiation wave rings
      this.thermalRings.forEach((ring, idx) => {
        const pulse = 1.0 + Math.sin(time * (2 + idx * 0.5)) * 0.04 * intensity;
        ring.scale.set(pulse, 1, pulse);
        ring.rotation.y = time * 0.1 * (idx % 2 === 0 ? 1 : -1);
      });
    }
  }
}
