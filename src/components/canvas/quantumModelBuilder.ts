import * as THREE from 'three';

export interface QpuParts {
  qpuGroup: THREE.Group;
  lidGroup: THREE.Group;
  qubitsGroup: THREE.Group;
  resonatorsGroup: THREE.Group;
  siliconMesh: THREE.Mesh;
  baseGroup: THREE.Group;
  connectorsGroup: THREE.Group;
}

export interface GeneratedQuantumModel {
  rootGroup: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  cableCurves: { curve: THREE.CatmullRomCurve3; type: 'downward' | 'upward'; color: string }[];
  stages: { id: string; group: THREE.Group; baseOffsetY: number; explodedOffsetMultiplier: number }[];
  plateMeshes: Record<string, THREE.Mesh>;
  qpuGroup: THREE.Group;
  qpuParts: QpuParts;
  qubitMeshes: { id: number; mesh: THREE.Mesh; light: THREE.PointLight }[];
  shieldsGroup: THREE.Group;
  materials: Record<string, THREE.Material>;
}

export function buildQuantumComputerModel(): GeneratedQuantumModel {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'QuantumComputer_Root';

  const interactiveObjects: THREE.Object3D[] = [];
  const cableCurves: { curve: THREE.CatmullRomCurve3; type: 'downward' | 'upward'; color: string }[] = [];
  const stages: { id: string; group: THREE.Group; baseOffsetY: number; explodedOffsetMultiplier: number }[] = [];
  const qubitMeshes: { id: number; mesh: THREE.Mesh; light: THREE.PointLight }[] = [];
  const plateMeshes: Record<string, THREE.Mesh> = {};

  // ==================== 1. MATERIALS ====================
  // 24k Polished Gold (Mirror-like with warm specular)
  const goldPlateMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f4c34a'),
    metalness: 0.94,
    roughness: 0.22,
    envMapIntensity: 1.8,
  });

  // Brushed Gold (Slightly more matte)
  const brushedGoldMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e5b53d'),
    metalness: 0.88,
    roughness: 0.35,
  });

  // Pure OFHC Oxygen-Free Copper (Rich warm rose-copper)
  const copperMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d97645'),
    metalness: 0.92,
    roughness: 0.24,
  });

  // Stainless Steel 316L & Titanium Rods (Bright reflective silver-grey)
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d4d9df'),
    metalness: 0.90,
    roughness: 0.28,
  });

  // Silver Braided Coaxial Cable
  const silverCableMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e0e6ed'),
    metalness: 0.95,
    roughness: 0.30,
  });

  // Copper Semi-Rigid Coaxial Cable
  const copperCableMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c86a3d'),
    metalness: 0.88,
    roughness: 0.32,
  });

  // Black Coaxial Jacket / SMA heat shrink
  const blackCoaxMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#222428'),
    metalness: 0.3,
    roughness: 0.6,
  });

  // Dark Silicon QPU Chip
  const siliconChipMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0c1017'),
    metalness: 0.7,
    roughness: 0.15,
  });

  // Glowing Transmon Qubit Core
  const qubitGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#00f0ff'),
    emissive: new THREE.Color('#00d2ff'),
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });

  // Semi-transparent Cryoperm / Thermal Shielding
  const shieldMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#3a4b60'),
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.85,
    opacity: 0.35,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const materials = {
    gold: goldPlateMaterial,
    brushedGold: brushedGoldMaterial,
    copper: copperMaterial,
    steel: steelMaterial,
    silverCable: silverCableMaterial,
    copperCable: copperCableMaterial,
    blackCoax: blackCoaxMaterial,
    silicon: siliconChipMaterial,
    qubitGlow: qubitGlowMaterial,
    shield: shieldMaterial,
  };

  // Helper for tagging interactive objects
  const registerInteractive = (obj: THREE.Object3D, componentId: string, name: string) => {
    obj.userData = { isInteractive: true, componentId, name };
    interactiveObjects.push(obj);
  };

  // Helper to create circular flange plate with bevel and cable pass-through holes
  function createGoldFlange(radius: number, thickness: number, holeCount: number = 8, holeRadius: number = 0.08): { group: THREE.Group; mainPlate: THREE.Mesh } {
    const group = new THREE.Group();

    // Main disc with outer rim
    const mainPlateGeo = new THREE.CylinderGeometry(radius, radius, thickness, 48);
    const mainPlate = new THREE.Mesh(mainPlateGeo, goldPlateMaterial.clone());
    mainPlate.castShadow = true;
    mainPlate.receiveShadow = true;
    group.add(mainPlate);

    // Outer rim lip / flange ring
    const rimGeo = new THREE.TorusGeometry(radius, thickness * 0.45, 16, 48);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, brushedGoldMaterial);
    group.add(rim);

    // Perimeter hex bolts
    const boltCount = Math.max(12, Math.floor(radius * 10));
    const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, thickness * 1.3, 6);
    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const bx = (radius - 0.08) * Math.cos(angle);
      const bz = (radius - 0.08) * Math.sin(angle);
      const bolt = new THREE.Mesh(boltGeo, steelMaterial);
      bolt.position.set(bx, 0, bz);
      group.add(bolt);
    }

    // Cabling feedthrough grommets/collars
    const collarGeo = new THREE.CylinderGeometry(holeRadius * 1.3, holeRadius * 1.3, thickness * 1.2, 16);
    const innerHoleGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, thickness * 1.3, 16);
    const holeRadiusDist = radius * 0.65;
    for (let i = 0; i < holeCount; i++) {
      const angle = (i / holeCount) * Math.PI * 2;
      const hx = holeRadiusDist * Math.cos(angle);
      const hz = holeRadiusDist * Math.sin(angle);

      const collar = new THREE.Mesh(collarGeo, copperMaterial);
      collar.position.set(hx, 0, hz);
      group.add(collar);

      const hole = new THREE.Mesh(innerHoleGeo, blackCoaxMaterial);
      hole.position.set(hx, 0, hz);
      group.add(hole);
    }

    return { group, mainPlate };
  }

  // ==================== 2. CRYOGENIC STAGES ====================

  // Stage 1: Room Temperature Flange (300 K) - Y = 3.8
  const stage300kGroup = new THREE.Group();
  stage300kGroup.position.y = 3.8;
  const flange300k = createGoldFlange(2.4, 0.16, 16, 0.09);
  flange300k.group.name = 'Plate_300K';
  stage300kGroup.add(flange300k.group);
  registerInteractive(flange300k.group, 'top-flange', 'Room Temperature Flange (300 K)');
  plateMeshes['top-flange'] = flange300k.mainPlate;

  // Top structural truss beams
  const trussGeo = new THREE.BoxGeometry(4.6, 0.08, 0.12);
  const truss1 = new THREE.Mesh(trussGeo, steelMaterial);
  truss1.position.y = 0.12;
  stage300kGroup.add(truss1);
  const truss2 = new THREE.Mesh(trussGeo, steelMaterial);
  truss2.rotation.y = Math.PI / 2;
  truss2.position.y = 0.12;
  stage300kGroup.add(truss2);

  // Vacuum port center cylinder
  const vacPortGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 32);
  const vacPort = new THREE.Mesh(vacPortGeo, steelMaterial);
  vacPort.position.y = 0.25;
  stage300kGroup.add(vacPort);

  rootGroup.add(stage300kGroup);
  stages.push({ id: 'top-flange', group: stage300kGroup, baseOffsetY: 3.8, explodedOffsetMultiplier: 1.8 });

  // Stage 2: 50 K Flange - Y = 2.4
  const stage50kGroup = new THREE.Group();
  stage50kGroup.position.y = 2.4;
  const flange50k = createGoldFlange(2.05, 0.12, 14, 0.08);
  flange50k.group.name = 'Plate_50K';
  stage50kGroup.add(flange50k.group);
  registerInteractive(flange50k.group, 'stage-50k', '50 K Thermal Stage');
  plateMeshes['stage-50k'] = flange50k.mainPlate;

  // Pulse Tube 1st stage heat exchanger block
  const pt50kGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 24);
  const pt50k = new THREE.Mesh(pt50kGeo, copperMaterial);
  pt50k.position.set(1.1, 0, 0.4);
  stage50kGroup.add(pt50k);

  rootGroup.add(stage50kGroup);
  stages.push({ id: 'stage-50k', group: stage50kGroup, baseOffsetY: 2.4, explodedOffsetMultiplier: 1.2 });

  // Stage 3: 4 K Flange - Y = 1.0
  const stage4kGroup = new THREE.Group();
  stage4kGroup.position.y = 1.0;
  const flange4k = createGoldFlange(1.75, 0.11, 12, 0.075);
  flange4k.group.name = 'Plate_4K';
  stage4kGroup.add(flange4k.group);
  registerInteractive(flange4k.group, 'stage-4k', '4 K Main Cold Plate');
  plateMeshes['stage-4k'] = flange4k.mainPlate;

  // 4x HEMT Amplifiers mounted on 4K Plate
  const hemtBoxGeo = new THREE.BoxGeometry(0.35, 0.18, 0.22);
  const hemtFinGeo = new THREE.BoxGeometry(0.33, 0.04, 0.20);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.3;
    const hx = 0.95 * Math.cos(angle);
    const hz = 0.95 * Math.sin(angle);

    const hemtGroup = new THREE.Group();
    hemtGroup.position.set(hx, 0.14, hz);
    hemtGroup.rotation.y = -angle;

    const hemtBody = new THREE.Mesh(hemtBoxGeo, brushedGoldMaterial);
    hemtGroup.add(hemtBody);

    // Heatsink fins
    for (let f = 0; f < 3; f++) {
      const fin = new THREE.Mesh(hemtFinGeo, steelMaterial);
      fin.position.y = 0.06 + f * 0.04;
      hemtGroup.add(fin);
    }

    // SMA connectors
    const smaGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12);
    smaGeo.rotateX(Math.PI / 2);
    const smaIn = new THREE.Mesh(smaGeo, copperMaterial);
    smaIn.position.set(0, 0, 0.14);
    hemtGroup.add(smaIn);

    const smaOut = new THREE.Mesh(smaGeo, copperMaterial);
    smaOut.position.set(0, 0, -0.14);
    hemtGroup.add(smaOut);

    stage4kGroup.add(hemtGroup);
    registerInteractive(hemtGroup, 'hemt-amps', 'Cryogenic HEMT Amplifier');
  }

  rootGroup.add(stage4kGroup);
  stages.push({ id: 'stage-4k', group: stage4kGroup, baseOffsetY: 1.0, explodedOffsetMultiplier: 0.6 });

  // Stage 4: Still / 1 K Stage - Y = -0.2
  const stage1kGroup = new THREE.Group();
  stage1kGroup.position.y = -0.2;
  const flange1k = createGoldFlange(1.45, 0.10, 10, 0.07);
  flange1k.group.name = 'Plate_1K';
  stage1kGroup.add(flange1k.group);
  registerInteractive(flange1k.group, 'stage-1k', 'Still / 1 K Stage');
  plateMeshes['stage-1k'] = flange1k.mainPlate;

  // Still distillation chamber central cylinder
  const stillDistGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 24);
  const stillDist = new THREE.Mesh(stillDistGeo, copperMaterial);
  stillDist.position.set(0, 0.2, 0);
  stage1kGroup.add(stillDist);

  rootGroup.add(stage1kGroup);
  stages.push({ id: 'stage-1k', group: stage1kGroup, baseOffsetY: -0.2, explodedOffsetMultiplier: 0.0 });

  // Stage 5: 100 mK Cold Plate - Y = -1.3
  const stage100mkGroup = new THREE.Group();
  stage100mkGroup.position.y = -1.3;
  const flange100mk = createGoldFlange(1.20, 0.09, 8, 0.065);
  flange100mk.group.name = 'Plate_100mK';
  stage100mkGroup.add(flange100mk.group);
  registerInteractive(flange100mk.group, 'stage-100mk', '100 mK Cold Plate');
  plateMeshes['stage-100mk'] = flange100mk.mainPlate;

  // Ferrite Isolators / Circulators mounted on 100mK plate
  const circGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 6); // hexagonal body
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = 0.65 * Math.cos(angle);
    const cz = 0.65 * Math.sin(angle);
    const circ = new THREE.Mesh(circGeo, copperMaterial);
    circ.position.set(cx, 0.11, cz);
    stage100mkGroup.add(circ);
    registerInteractive(circ, 'circulators', 'Ferrite Microwave Circulator');
  }

  rootGroup.add(stage100mkGroup);
  stages.push({ id: 'stage-100mk', group: stage100mkGroup, baseOffsetY: -1.3, explodedOffsetMultiplier: -0.6 });

  // Stage 6: Mixing Chamber / Base Stage (15 mK) - Y = -2.3
  const stage10mkGroup = new THREE.Group();
  stage10mkGroup.position.y = -2.3;
  const flange10mk = createGoldFlange(0.95, 0.09, 8, 0.06);
  flange10mk.group.name = 'Plate_10mK';
  stage10mkGroup.add(flange10mk.group);
  registerInteractive(flange10mk.group, 'stage-10mk', 'Mixing Chamber Base Plate (15 mK)');
  plateMeshes['stage-10mk'] = flange10mk.mainPlate;

  // 3He-4He Mixing chamber bulb / cylinder
  const mixChamberGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.32, 24);
  const mixChamber = new THREE.Mesh(mixChamberGeo, copperMaterial);
  mixChamber.position.set(0, 0.2, 0);
  stage10mkGroup.add(mixChamber);

  rootGroup.add(stage10mkGroup);
  stages.push({ id: 'stage-10mk', group: stage10mkGroup, baseOffsetY: -2.3, explodedOffsetMultiplier: -1.3 });

  // ==================== 3. QPU CORE & EXPANDABLE SUB-LAYERS (Base Stage) ====================
  const qpuGroup = new THREE.Group();
  qpuGroup.position.y = -2.7;
  qpuGroup.name = 'QPU_Package';

  // Modular Sub-Groups for dynamic 3D layer expansion:
  const qpuLidGroup = new THREE.Group();
  qpuLidGroup.name = 'QPU_LidGroup';
  const qpuQubitsGroup = new THREE.Group();
  qpuQubitsGroup.name = 'QPU_QubitsGroup';
  const qpuResonatorsGroup = new THREE.Group();
  qpuResonatorsGroup.name = 'QPU_ResonatorsGroup';
  const qpuBaseGroup = new THREE.Group();
  qpuBaseGroup.name = 'QPU_BaseGroup';
  const connectorsGroup = new THREE.Group();
  connectorsGroup.name = 'QPU_ConnectorsGroup';

  // 1. Layer 1 (Top): Gold-plated OFHC Copper / Cryoperm Protective Puck Lid
  const qpuCanLidGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32);
  const qpuCanLid = new THREE.Mesh(qpuCanLidGeo, goldPlateMaterial);
  qpuCanLid.position.y = 0.12;
  qpuLidGroup.add(qpuCanLid);

  // Lid top grip / seal ring
  const lidRingGeo = new THREE.TorusGeometry(0.40, 0.02, 12, 32);
  lidRingGeo.rotateX(Math.PI / 2);
  const lidRing = new THREE.Mesh(lidRingGeo, brushedGoldMaterial);
  lidRing.position.y = 0.18;
  qpuLidGroup.add(lidRing);
  registerInteractive(qpuCanLid, 'qpu-chip', 'QPU Protective Shield Lid');
  qpuGroup.add(qpuLidGroup);

  // 2. Layer 2 (Center-Top): Dark Silicon / Sapphire Chip Substrate
  const siliconChipGeo = new THREE.BoxGeometry(0.55, 0.025, 0.55);
  const siliconChip = new THREE.Mesh(siliconChipGeo, siliconChipMaterial);
  siliconChip.position.y = 0.0;
  siliconChip.castShadow = true;
  siliconChip.receiveShadow = true;
  registerInteractive(siliconChip, 'qpu-chip', 'Superconducting Transmon Chip');
  qpuGroup.add(siliconChip);

  // 3. Layer 3: CPW Readout Resonators, Purcell Filters & Gold Circuit Traces
  const traceGeo = new THREE.RingGeometry(0.12, 0.22, 16);
  traceGeo.rotateX(Math.PI / 2);
  const traceMesh = new THREE.Mesh(traceGeo, goldPlateMaterial);
  traceMesh.position.y = 0.014;
  qpuResonatorsGroup.add(traceMesh);

  // Serpentine CPW Readout Meander Lines on chip
  for (let q = 0; q < 8; q++) {
    const col = q % 4;
    const row = Math.floor(q / 4);
    const qx = (col - 1.5) * 0.11;
    const qz = (row - 0.5) * 0.15;

    // Meander resonator line from transmon towards edge
    const edgeZ = row === 0 ? -0.24 : 0.24;
    const meanderCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(qx, 0.015, qz),
      new THREE.Vector3(qx + 0.03, 0.015, (qz + edgeZ) * 0.5),
      new THREE.Vector3(qx - 0.03, 0.015, (qz + edgeZ) * 0.75),
      new THREE.Vector3(qx, 0.015, edgeZ)
    ]);
    const meanderMesh = new THREE.Mesh(new THREE.TubeGeometry(meanderCurve, 12, 0.003, 4, false), goldPlateMaterial);
    qpuResonatorsGroup.add(meanderMesh);
  }
  qpuGroup.add(qpuResonatorsGroup);

  // 4. Layer 4: 8 Transmon Qubits in 2x4 lattice with glowing cross geometries, Josephson junctions and point lights
  const qubitCrossGeo = new THREE.BoxGeometry(0.045, 0.016, 0.045);
  for (let q = 0; q < 8; q++) {
    const col = q % 4;
    const row = Math.floor(q / 4);
    const qx = (col - 1.5) * 0.11;
    const qz = (row - 0.5) * 0.15;

    const qubitMesh = new THREE.Mesh(qubitCrossGeo, qubitGlowMaterial.clone());
    qubitMesh.position.set(qx, 0.02, qz);
    qubitMesh.userData = { qubitId: q, isQubit: true, name: `Transmon Qubit Q${q}` };

    // Microscopic Al/AlOx/Al Josephson Junction SQUID loop on qubit center
    const juncGeo = new THREE.RingGeometry(0.008, 0.012, 8);
    juncGeo.rotateX(Math.PI / 2);
    const juncMesh = new THREE.Mesh(juncGeo, steelMaterial);
    juncMesh.position.set(0, 0.01, 0);
    qubitMesh.add(juncMesh);

    const qubitLight = new THREE.PointLight(new THREE.Color('#00f0ff'), 0.5, 0.35);
    qubitLight.position.set(qx, 0.06, qz);
    qubitMesh.add(qubitLight);

    qpuQubitsGroup.add(qubitMesh);
    qubitMeshes.push({ id: q, mesh: qubitMesh, light: qubitLight });
    interactiveObjects.push(qubitMesh);

    // Microscopic wirebond arches to substrate perimeter
    const bondCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(qx, 0.02, qz),
      new THREE.Vector3(qx * 1.35, 0.05, qz * 1.35),
      new THREE.Vector3(qx * 1.7, 0.01, qz * 1.7)
    );
    const bondGeo = new THREE.TubeGeometry(bondCurve, 8, 0.003, 6, false);
    const bond = new THREE.Mesh(bondGeo, goldPlateMaterial);
    qpuQubitsGroup.add(bond);
  }

  // Inter-qubit coupling coplanar waveguide buses
  const couplerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd54f') });
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const qx1 = (col - 1.5) * 0.11;
      const qz1 = (row - 0.5) * 0.15;
      const qx2 = (col + 1 - 1.5) * 0.11;
      const couplerGeo = new THREE.BoxGeometry(0.06, 0.005, 0.01);
      const coupler = new THREE.Mesh(couplerGeo, couplerMat);
      coupler.position.set((qx1 + qx2) / 2, 0.022, qz1);
      qpuQubitsGroup.add(coupler);
    }
  }
  qpuGroup.add(qpuQubitsGroup);

  // 5. Layer 5 (Bottom): OFHC Copper Base Mounting Puck & SMA Coaxial Connectors
  const qpuBaseGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 32);
  const qpuBase = new THREE.Mesh(qpuBaseGeo, copperMaterial);
  qpuBase.position.y = -0.10;
  qpuBaseGroup.add(qpuBase);

  // Perimeter SMA microwave coaxial ports
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = 0.52 * Math.cos(angle);
    const pz = 0.52 * Math.sin(angle);

    const smaPort = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.10, 12), brushedGoldMaterial);
    smaPort.position.set(px, -0.06, pz);
    smaPort.rotation.z = Math.PI / 2;
    smaPort.rotation.y = -angle;
    connectorsGroup.add(smaPort);
  }
  qpuBaseGroup.add(connectorsGroup);
  qpuGroup.add(qpuBaseGroup);

  rootGroup.add(qpuGroup);
  stages.push({ id: 'qpu-chip', group: qpuGroup, baseOffsetY: -2.7, explodedOffsetMultiplier: -2.0 });

  const qpuParts: QpuParts = {
    qpuGroup,
    lidGroup: qpuLidGroup,
    qubitsGroup: qpuQubitsGroup,
    resonatorsGroup: qpuResonatorsGroup,
    siliconMesh: siliconChip,
    baseGroup: qpuBaseGroup,
    connectorsGroup,
  };

  rootGroup.add(qpuGroup);
  stages.push({ id: 'qpu-chip', group: qpuGroup, baseOffsetY: -2.7, explodedOffsetMultiplier: -2.0 });

  // ==================== 4. STRUCTURAL SUPPORT RODS ====================
  // 4 Low-thermal-conductivity vertical titanium rods
  const rodRadius = 0.035;
  const rodHeight = 6.4;
  const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodHeight, 16);
  const rodDistance = 1.35;

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rx = rodDistance * Math.cos(angle);
    const rz = rodDistance * Math.sin(angle);

    const rod = new THREE.Mesh(rodGeo, steelMaterial);
    rod.position.set(rx, 0.6, rz);
    rootGroup.add(rod);

    // Thermal isolating collars at each plate intersection
    [-2.3, -1.3, -0.2, 1.0, 2.4, 3.8].forEach(py => {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(rodRadius * 1.8, rodRadius * 1.8, 0.14, 12), copperMaterial);
      collar.position.set(rx, py, rz);
      rootGroup.add(collar);
    });
  }

  // Central Vertical Cooling Line Tube
  const centralLineGeo = new THREE.CylinderGeometry(0.07, 0.07, 6.0, 24);
  const centralLine = new THREE.Mesh(centralLineGeo, steelMaterial);
  centralLine.position.set(0, 0.7, 0);
  rootGroup.add(centralLine);

  // Copper thermal braiding around central column
  for (let b = 0; b < 5; b++) {
    const braidY = 3.0 - b * 1.1;
    const braidGeo = new THREE.TorusGeometry(0.12, 0.03, 12, 24);
    braidGeo.rotateX(Math.PI / 2);
    const braid = new THREE.Mesh(braidGeo, copperMaterial);
    braid.position.set(0, braidY, 0);
    rootGroup.add(braid);
  }

  // ==================== 5. DENSE COAXIAL CABLING & ATTENUATORS ====================
  // Procedurally generate 28 elegant catenary/spline cables between the stages
  const cableBundleCount = 14;

  for (let i = 0; i < cableBundleCount; i++) {
    const angle = (i / cableBundleCount) * Math.PI * 2;
    const isControlLine = i % 2 === 0;

    // Cable 1: Room temp (3.8) -> 50K (2.4)
    const p0 = new THREE.Vector3(1.5 * Math.cos(angle), 3.8, 1.5 * Math.sin(angle));
    const p1 = new THREE.Vector3(1.7 * Math.cos(angle + 0.15), 3.1, 1.7 * Math.sin(angle + 0.15));
    const p2 = new THREE.Vector3(1.3 * Math.cos(angle + 0.05), 2.4, 1.3 * Math.sin(angle + 0.05));
    const curve1 = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const cableMesh1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 20, 0.016, 8, false), silverCableMaterial);
    rootGroup.add(cableMesh1);
    registerInteractive(cableMesh1, 'coax-cables', 'Cryogenic Coaxial Transmission Line');
    cableCurves.push({ curve: curve1, type: isControlLine ? 'downward' : 'upward', color: isControlLine ? '#00e5ff' : '#ffd54f' });

    // Attenuator on 50K plate
    const att50k = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), brushedGoldMaterial);
    att50k.position.copy(p2);
    rootGroup.add(att50k);
    registerInteractive(att50k, 'attenuators', '-10 dB Cryogenic Attenuator');

    // Cable 2: 50K (2.4) -> 4K (1.0)
    const p3 = new THREE.Vector3(1.4 * Math.cos(angle + 0.25), 1.7, 1.4 * Math.sin(angle + 0.25));
    const p4 = new THREE.Vector3(1.1 * Math.cos(angle + 0.1), 1.0, 1.1 * Math.sin(angle + 0.1));
    const curve2 = new THREE.CatmullRomCurve3([p2, p3, p4]);
    const cableMesh2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 20, 0.016, 8, false), copperCableMaterial);
    rootGroup.add(cableMesh2);
    registerInteractive(cableMesh2, 'coax-cables', 'NbTi Superconducting Cable');
    cableCurves.push({ curve: curve2, type: isControlLine ? 'downward' : 'upward', color: isControlLine ? '#00e5ff' : '#ffd54f' });

    // Attenuator on 4K plate
    const att4k = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), copperMaterial);
    att4k.position.copy(p4);
    rootGroup.add(att4k);
    registerInteractive(att4k, 'attenuators', '-20 dB Cryogenic Attenuator');

    // Cable 3: 4K (1.0) -> Still ( -0.2)
    const p5 = new THREE.Vector3(1.2 * Math.cos(angle + 0.3), 0.4, 1.2 * Math.sin(angle + 0.3));
    const p6 = new THREE.Vector3(0.9 * Math.cos(angle + 0.15), -0.2, 0.9 * Math.sin(angle + 0.15));
    const curve3 = new THREE.CatmullRomCurve3([p4, p5, p6]);
    const cableMesh3 = new THREE.Mesh(new THREE.TubeGeometry(curve3, 20, 0.015, 8, false), silverCableMaterial);
    rootGroup.add(cableMesh3);
    cableCurves.push({ curve: curve3, type: isControlLine ? 'downward' : 'upward', color: isControlLine ? '#00e5ff' : '#ffd54f' });

    // Cable 4: Still (-0.2) -> 100mK (-1.3)
    const p7 = new THREE.Vector3(1.0 * Math.cos(angle + 0.35), -0.75, 1.0 * Math.sin(angle + 0.35));
    const p8 = new THREE.Vector3(0.7 * Math.cos(angle + 0.2), -1.3, 0.7 * Math.sin(angle + 0.2));
    const curve4 = new THREE.CatmullRomCurve3([p6, p7, p8]);
    const cableMesh4 = new THREE.Mesh(new THREE.TubeGeometry(curve4, 20, 0.014, 8, false), copperCableMaterial);
    rootGroup.add(cableMesh4);
    cableCurves.push({ curve: curve4, type: isControlLine ? 'downward' : 'upward', color: isControlLine ? '#00e5ff' : '#ffd54f' });

    // Attenuator on 100mK
    const att100mk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12), brushedGoldMaterial);
    att100mk.position.copy(p8);
    rootGroup.add(att100mk);

    // Cable 5: 100mK (-1.3) -> Mixing Chamber (-2.3) -> QPU (-2.7)
    const p9 = new THREE.Vector3(0.8 * Math.cos(angle + 0.4), -1.8, 0.8 * Math.sin(angle + 0.4));
    const p10 = new THREE.Vector3(0.5 * Math.cos(angle + 0.25), -2.3, 0.5 * Math.sin(angle + 0.25));
    const p11 = new THREE.Vector3(0.28 * Math.cos(angle + 0.3), -2.65, 0.28 * Math.sin(angle + 0.3));
    const curve5 = new THREE.CatmullRomCurve3([p8, p9, p10, p11]);
    const cableMesh5 = new THREE.Mesh(new THREE.TubeGeometry(curve5, 24, 0.013, 8, false), silverCableMaterial);
    rootGroup.add(cableMesh5);
    cableCurves.push({ curve: curve5, type: isControlLine ? 'downward' : 'upward', color: isControlLine ? '#00e5ff' : '#ffd54f' });
  }

  // ==================== 6. CONCENTRIC RADIATION & MAGNETIC SHIELDS ====================
  const shieldsGroup = new THREE.Group();
  shieldsGroup.name = 'Cryostat_Shields';
  shieldsGroup.visible = false; // toggled by Cutaway Mode

  // 50K Radiation Shield Cylinder (Section cutaway)
  const shield50kGeo = new THREE.CylinderGeometry(2.15, 2.15, 2.0, 32, 1, true, 0, Math.PI * 1.5);
  const shield50k = new THREE.Mesh(shield50kGeo, shieldMaterial);
  shield50k.position.y = 2.0;
  shieldsGroup.add(shield50k);

  // 4K Radiation Shield Cylinder
  const shield4kGeo = new THREE.CylinderGeometry(1.85, 1.85, 2.2, 32, 1, true, 0, Math.PI * 1.5);
  const shield4k = new THREE.Mesh(shield4kGeo, shieldMaterial);
  shield4k.position.y = 0.5;
  shieldsGroup.add(shield4k);

  // Mu-Metal Magnetic Shield around QPU base
  const muMetalGeo = new THREE.CylinderGeometry(1.05, 1.05, 1.4, 32, 1, true, 0, Math.PI * 1.4);
  const muMetal = new THREE.Mesh(muMetalGeo, shieldMaterial);
  muMetal.position.y = -2.1;
  shieldsGroup.add(muMetal);
  registerInteractive(muMetal, 'radiation-shield', 'Cryoperm Magnetic Shield');

  rootGroup.add(shieldsGroup);

  return {
    rootGroup,
    interactiveObjects,
    cableCurves,
    stages,
    plateMeshes,
    qpuGroup,
    qpuParts,
    qubitMeshes,
    shieldsGroup,
    materials,
  };
}
