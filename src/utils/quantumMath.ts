import { QubitState, QuantumGateType } from '../types';

export interface Complex {
  real: number;
  imag: number;
}

export function complex(real: number, imag: number = 0): Complex {
  return { real, imag };
}

export function cAdd(a: Complex, b: Complex): Complex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

export function cMul(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

export function cScale(a: Complex, scalar: number): Complex {
  return { real: a.real * scalar, imag: a.imag * scalar };
}

export function cAbsSq(a: Complex): number {
  return a.real * a.real + a.imag * a.imag;
}

// Calculate Bloch Sphere coordinates (theta, phi) from state |psi> = alpha|0> + beta|1>
export function getBlochCoordinates(alpha: Complex, beta: Complex): { theta: number; phi: number; x: number; y: number; z: number } {
  const norm = Math.sqrt(cAbsSq(alpha) + cAbsSq(beta));
  if (norm < 1e-9) {
    return { theta: 0, phi: 0, x: 0, y: 0, z: 1 };
  }
  const a = cScale(alpha, 1 / norm);
  const b = cScale(beta, 1 / norm);

  // Global phase removal: make alpha real and positive
  const alphaPhase = Math.atan2(a.imag, a.real);
  const cosP = Math.cos(-alphaPhase);
  const sinP = Math.sin(-alphaPhase);
  const rotPhase: Complex = { real: cosP, imag: sinP };

  const aPrime = cMul(a, rotPhase); // aPrime.imag is ~0, real is cos(theta/2)
  const bPrime = cMul(b, rotPhase); // bPrime = e^{i*phi} * sin(theta/2)

  const cosThetaOver2 = Math.min(1, Math.max(0, aPrime.real));
  const theta = 2 * Math.acos(cosThetaOver2);

  const phi = Math.atan2(bPrime.imag, bPrime.real);
  const normalizedPhi = phi < 0 ? phi + 2 * Math.PI : phi;

  // Cartesian coordinates on unit Bloch sphere
  const x = Math.sin(theta) * Math.cos(normalizedPhi);
  const y = Math.sin(theta) * Math.sin(normalizedPhi);
  const z = Math.cos(theta);

  return { theta, phi: normalizedPhi, x, y, z };
}

export function createDefaultQubit(id: number): QubitState {
  const row = Math.floor(id / 4);
  const col = id % 4;
  return {
    id,
    label: `Q${id}`,
    alpha: { real: 1, imag: 0 },
    beta: { real: 0, imag: 0 },
    theta: 0,
    phi: 0,
    frequencyGhz: 4.85 + (id * 0.12) % 0.6,
    t1Microseconds: 85 + (id * 7) % 25,
    t2Microseconds: 70 + (id * 6) % 20,
    appliedGates: [],
    isEntangledWith: null,
    position: [col, row],
  };
}

// Single-qubit unitary operations
export function applySingleGate(qubit: QubitState, gate: QuantumGateType): QubitState {
  const a = qubit.alpha;
  const b = qubit.beta;
  const SQRT2_INV = 1 / Math.SQRT2;

  let newAlpha = a;
  let newBeta = b;

  switch (gate) {
    case 'H': // Hadamard
      newAlpha = cScale(cAdd(a, b), SQRT2_INV);
      newBeta = cScale(cAdd(a, cScale(b, -1)), SQRT2_INV);
      break;

    case 'X': // Pauli-X (NOT / bit-flip)
      newAlpha = b;
      newBeta = a;
      break;

    case 'Y': // Pauli-Y
      newAlpha = { real: b.imag, imag: -b.real };
      newBeta = { real: -a.imag, imag: a.real };
      break;

    case 'Z': // Pauli-Z (Phase-flip)
      newAlpha = a;
      newBeta = cScale(b, -1);
      break;

    case 'S': // Phase gate (S = sqrt(Z), +pi/2 phase)
      newAlpha = a;
      newBeta = { real: -b.imag, imag: b.real };
      break;

    case 'T': // T gate (pi/4 phase)
      newAlpha = a;
      newBeta = cMul(b, { real: Math.cos(Math.PI / 4), imag: Math.sin(Math.PI / 4) });
      break;

    case 'RESET':
      newAlpha = { real: 1, imag: 0 };
      newBeta = { real: 0, imag: 0 };
      break;

    default:
      break;
  }

  // Renormalize
  const norm = Math.sqrt(cAbsSq(newAlpha) + cAbsSq(newBeta));
  if (norm > 0) {
    newAlpha = cScale(newAlpha, 1 / norm);
    newBeta = cScale(newBeta, 1 / norm);
  }

  const { theta, phi } = getBlochCoordinates(newAlpha, newBeta);

  return {
    ...qubit,
    alpha: newAlpha,
    beta: newBeta,
    theta,
    phi,
    appliedGates: gate === 'RESET' ? [] : [...qubit.appliedGates, gate],
  };
}

// Arbitrary single-qubit rotation R_axis(angle)
export function applyRotationGate(qubit: QubitState, axis: 'X' | 'Y' | 'Z', angle: number): QubitState {
  const halfAngle = angle / 2;
  const cosH = Math.cos(halfAngle);
  const sinH = Math.sin(halfAngle);
  const a = qubit.alpha;
  const b = qubit.beta;

  let newAlpha = a;
  let newBeta = b;

  if (axis === 'X') {
    // R_X(theta) = cos(theta/2)*I - i*sin(theta/2)*X
    newAlpha = cAdd(cScale(a, cosH), { real: sinH * b.imag, imag: -sinH * b.real });
    newBeta = cAdd(cScale(b, cosH), { real: sinH * a.imag, imag: -sinH * a.real });
  } else if (axis === 'Y') {
    // R_Y(theta) = cos(theta/2)*I - i*sin(theta/2)*Y
    newAlpha = cAdd(cScale(a, cosH), cScale(b, -sinH));
    newBeta = cAdd(cScale(b, cosH), cScale(a, sinH));
  } else if (axis === 'Z') {
    // R_Z(theta) = e^{-i*theta/2}|0><0| + e^{i*theta/2}|1><1|
    newAlpha = cMul(a, { real: Math.cos(-halfAngle), imag: Math.sin(-halfAngle) });
    newBeta = cMul(b, { real: Math.cos(halfAngle), imag: Math.sin(halfAngle) });
  }

  const norm = Math.sqrt(cAbsSq(newAlpha) + cAbsSq(newBeta));
  if (norm > 0) {
    newAlpha = cScale(newAlpha, 1 / norm);
    newBeta = cScale(newBeta, 1 / norm);
  }

  const { theta, phi } = getBlochCoordinates(newAlpha, newBeta);

  return {
    ...qubit,
    alpha: newAlpha,
    beta: newBeta,
    theta,
    phi,
    appliedGates: [...qubit.appliedGates, `R${axis}(${((angle * 180) / Math.PI).toFixed(0)}°)`],
  };
}

// Set state directly from theta and phi
export function setQubitAngles(qubit: QubitState, theta: number, phi: number): QubitState {
  const normTheta = Math.max(0, Math.min(Math.PI, theta));
  const normPhi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  const cosThetaOver2 = Math.cos(normTheta / 2);
  const sinThetaOver2 = Math.sin(normTheta / 2);

  const alpha: Complex = { real: cosThetaOver2, imag: 0 };
  const beta: Complex = {
    real: sinThetaOver2 * Math.cos(normPhi),
    imag: sinThetaOver2 * Math.sin(normPhi),
  };

  return {
    ...qubit,
    alpha,
    beta,
    theta: normTheta,
    phi: normPhi,
  };
}

// Perform projective measurement on a qubit
export function measureQubit(qubit: QubitState): { updatedQubit: QubitState; outcome: 0 | 1; prob0: number; prob1: number } {
  const prob0 = cAbsSq(qubit.alpha);
  const prob1 = cAbsSq(qubit.beta);
  const random = Math.random();
  const outcome: 0 | 1 = random < prob0 ? 0 : 1;

  const updatedQubit: QubitState = {
    ...qubit,
    alpha: outcome === 0 ? { real: 1, imag: 0 } : { real: 0, imag: 0 },
    beta: outcome === 1 ? { real: 1, imag: 0 } : { real: 0, imag: 0 },
    theta: outcome === 0 ? 0 : Math.PI,
    phi: 0,
    appliedGates: [...qubit.appliedGates, `M:${outcome}`],
  };

  return { updatedQubit, outcome, prob0, prob1 };
}
