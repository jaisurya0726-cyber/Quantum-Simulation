export type AppMode = 'explore' | 'dilution' | 'qpu' | 'flow' | 'exploded' | 'tour';

export interface CryoComponentInfo {
  id: string;
  name: string;
  category: 'plate' | 'qpu' | 'electronics' | 'cooling' | 'shield' | 'cable';
  stage?: string;
  temperature: string;
  tempKelvin: number;
  description: string;
  purpose: string;
  howItWorks: string;
  physicsDetails: string;
  connectedTo: string[];
  materials: string[];
  cameraTarget: [number, number, number];
  cameraPosition: [number, number, number];
  icon?: string;
}

export interface QubitState {
  id: number;
  label: string;
  alpha: { real: number; imag: number }; // |0> amplitude
  beta: { real: number; imag: number };  // |1> amplitude
  theta: number; // Bloch sphere theta (0 to PI)
  phi: number;   // Bloch sphere phi (0 to 2*PI)
  frequencyGhz: number;
  t1Microseconds: number;
  t2Microseconds: number;
  appliedGates: string[];
  isEntangledWith: number | null;
  position: [number, number]; // in grid
}

export type QuantumGateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'CNOT' | 'CZ' | 'MEASURE' | 'RESET';

export interface SignalFlowStep {
  stepNumber: number;
  title: string;
  stageName: string;
  componentId: string;
  temperature: string;
  signalType: 'classical_digital' | 'microwave_control' | 'cryo_attenuation' | 'qubit_interaction' | 'readout_reflection' | 'hemt_amplification' | 'classical_readout';
  description: string;
  technicalDetails: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  activeComponentIds: string[];
  direction: 'downward' | 'qpu' | 'upward';
}

export interface LessonStep {
  id: number;
  title: string;
  subtitle: string;
  summary: string;
  keyPoints: string[];
  interactivePrompt: string;
  targetComponentId?: string;
  recommendedMode: AppMode;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface TelemetryData {
  baseTempMk: number;
  plate50kTempK: number;
  plate4kTempK: number;
  stillTempK: number;
  coldPlateMk: number;
  vacuumMbar: number;
  helium3FlowMmol: number;
  qpuCoherenceFidelity: number;
  qubitCount: number;
  qubitsOnline: number;
}
