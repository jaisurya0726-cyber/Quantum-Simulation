# 🌌 3D Quantum Computer Explorer & Dilution Refrigerator Digital Twin

An interactive, scientifically accurate 3D simulation and educational explorer of a superconducting quantum computer chandelier and dilution refrigerator.

---

## 🔬 Overview

Superconducting quantum processors require temperatures near absolute zero (~15 millikelvin / -273.135 °C) to eliminate thermal fluctuations, maintain superconductivity, and preserve qubit quantum coherence. 

This application provides a **digital twin** and real-time 3D interactive model of the entire cryogenic dilution refrigerator ("quantum chandelier") and its core superconducting Quantum Processing Unit (QPU).

---

## ✨ Key Features

### 1. 🧊 High-Fidelity 3D Dilution Chandelier
- **Thermal Stages & Plates**: Accurate geometric and physical representation of all temperature stages:
  - **Room Temperature Flange (300 K)**: Vacuum feedthroughs and microwave input routing.
  - **50 K Thermal Shield Plate**: Absorbs radiative heat load from ambient surroundings.
  - **4.2 K Main Cold Plate**: Liquid Helium bath heat sink; houses High Electron Mobility Transistor (**HEMT**) low-noise cryogenic amplifiers.
  - **Still Unit (0.88 K – 1.0 K)**: Distillation stage for Helium-3 vapor separation.
  - **Cold Plate (100 mK)**: Continuous sintered silver heat exchangers and ferrite microwave isolators/circulators.
  - **Mixing Chamber (15 mK)**: Coldest location where $^3\text{He}/^4\text{He}$ phase separation produces continuous millikelvin refrigeration.
- **Exploded View Mode**: Continuous slider animation expanding vertical stage spacing to inspect internal electronics, attenuators, and cabling.
- **Cutaway Shields**: Toggle outer radiation and vacuum shielding canisters on and off.

### 2. 🔍 Omnipresent 3D Zoom & Precision Camera Navigation
- **Click / Double-Click to Zoom Anywhere**: Click or double-click any component, wire, amplifier, or qubit to center the camera and zoom in with animated targeting reticles.
- **Spot Navigator Dropdown**: Searchable catalog enabling instant jump to any specific component or stage.
- **Quick Zoom Levels**: One-touch magnification presets:
  - **Macro (0.8m)**: Microscopic chip, SQUID loops, and Josephson junctions.
  - **Detail (2.0m)**: Amplifiers, circulators, and microwave attenuator cascades.
  - **Stage (3.5m)**: Individual thermal gold-plated copper flange overview.
  - **Full (7.8m)**: Complete cryogenic chandelier perspective.
- **Free Orbit & Panning**: 360° orbital rotation, right-click/two-finger panning along 3D axes, and mouse wheel/pinch zooming.
- **Auto-Rotation**: Smooth 360° showcase turntable mode with dynamic target focus.

### 3. ⚛️ Superconducting QPU & Microscopic Architecture
- **8-Transmon Qubit Core Lattice**: Planar superconducting layout with capacitive cross-pads and tunable inductive SQUID loops.
- **Coplanar Waveguide (CPW) Resonators**: Dispersive readout lines and Purcell filter networks.
- **Interactive Bloch Sphere**: Real-time 3D state vector representation $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$ demonstrating quantum superposition and phase angles $(\theta, \phi)$.
- **Quantum Gate Circuit Simulator**: Apply single and multi-qubit gates (Hadamard $H$, Pauli $X, Y, Z$, Phase $S, T$, Entangling $\text{CNOT}$) and perform projective measurement with wavefunction collapse.

### 4. 🌊 Signal Flow & Thermodynamic Simulations
- **Microwave Pulse Propagation**: Visualize traveling microwave control pulses (4–8 GHz) descending from 300 K to the QPU and reflected readout signals amplified through cryogenic HEMTs back to room-temperature digitizers.
- **Dilution Cycle Animation**: Real-time particle system modeling concentrated $^3\text{He}$ dilute phase diffusion across the mixing chamber phase boundary.

### 5. 🔊 Real-Time Quantum Audio Synthesizer
- Integrated Web Audio API sound synthesis engine generating frequency-tuned acoustic feedback for gate operations, cryogenic hums, pulse transmissions, and state measurements.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics**: [Three.js](https://threejs.org/) (WebGL)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone repository or navigate to workspace directory
cd quantum-computer-explorer

# Install dependencies
npm install

# Start local development server (runs on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start exploring.

### Production Build

```bash
# Build optimized static assets into dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 🎮 Controls & Interactions

| Action | Control |
| :--- | :--- |
| **Orbit 360°** | Left-click + drag on canvas |
| **Pan Camera** | Right-click + drag, Middle-click + drag, or `Shift` + Left-click + drag |
| **Zoom In / Out** | Mouse wheel scroll, trackpad pinch, or HUD Zoom In/Out buttons |
| **Macro Zoom to Point** | Click or double-click directly on any 3D part or qubit |
| **Exploded View** | Adjust the `Exploded View` slider in the right HUD |
| **Toggle Shields** | Click `Shields` in the right HUD |
| **Toggle Auto-Rotate** | Click `Rotate` in the right HUD |
| **Apply Quantum Gates** | Click gates ($H, X, Y, Z, S, T, \text{CNOT}$) on the QPU or Bloch sphere panel |

---

## 📜 License

MIT License — free for educational and scientific research use.
