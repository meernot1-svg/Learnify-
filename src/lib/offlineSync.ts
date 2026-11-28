import { learningDataService } from '../services/learningData';
import type { LabSubject } from '../types';

const OFFLINE_QUEUE_KEY = 'learnify_offline_lab_queue_v1';
const OFFLINE_PACKS_KEY = 'learnify_offline_study_packs_v1';
const LOW_BANDWIDTH_KEY = 'learnify_low_bandwidth_mode';
const SYNC_EVENT_NAME = 'learnify-offline-sync-updated';

export interface QueuedLabResult {
  id: string;
  experimentTitle: string;
  subject: LabSubject;
  outcome: string;
  formula?: string;
  measurements?: string;
  notes?: string;
  queuedAt: string;
}

export interface OfflineStudyPack {
  subject: string;
  title: string;
  summary: string;
  formulas: string[];
  labChecklist: string[];
  practicePrompts: string[];
  savedAt: string;
}

export const BUILTIN_STUDY_PACKS: Record<string, Omit<OfflineStudyPack, 'savedAt'>> = {
  physics: {
    subject: 'physics',
    title: 'Physics Essential Formula & Practical Pack',
    summary:
      'Kinematics, Newton laws, thin-lens optics, simple harmonic waves, Ohm law circuits, and gravitational orbits.',
    formulas: [
      'Newton 2nd Law: F = m * a',
      'Kinetic Energy: KE = 1/2 * m * v^2 | Potential: PE = m * g * h',
      'Wave Equation: v = f * lambda',
      'Thin Lens Formula: 1/f = 1/u + 1/v',
      'Orbital Velocity: v = sqrt(G * M / r)',
    ],
    labChecklist: [
      'Measure 10 oscillations of pendulum to minimize timing error.',
      'Check focal length of convex lens against distant object first.',
      'Compare simulated orbital eccentricity under balanced tangential velocity.',
    ],
    practicePrompts: [
      'Why does doubling mass not alter pendulum period for small angles?',
      'What happens to image magnification as object moves from 2F toward F?',
    ],
  },
  chemistry: {
    subject: 'chemistry',
    title: 'Chemistry Equations, pH & Stoichiometry Pack',
    summary:
      'Acid-base pH titration, ionic equilibria, reaction enthalpy, molecular bonding geometries, and molarity.',
    formulas: [
      'pH = -log10[H3O+] | pH + pOH = 14 (at 25 C)',
      'Molarity M = moles_solute / volume_liters',
      'Titration Dilution: M1 * V1 = M2 * V2',
      'Ideal Gas Law: P * V = n * R * T',
    ],
    labChecklist: [
      'Rinse burette with titrant before zeroing the meniscus.',
      'Observe indicator color shift near equivalence point drop-by-drop.',
      'Verify balanced stoichiometric coefficients before enthalpy readout.',
    ],
    practicePrompts: [
      'Why is the equivalence point of a weak acid + strong base titration above pH 7?',
      'How does lone-pair repulsion bend the H2O bond angle to 104.5 degrees?',
    ],
  },
  biology: {
    subject: 'biology',
    title: 'Biology Cellular, Genetics & Anatomy Pack',
    summary:
      'Eukaryotic organelle transport, human systemic anatomy, cardiac cycle, pulmonary ventilation, and DNA replication.',
    formulas: [
      'Cardiac Output: CO = Heart Rate (bpm) * Stroke Volume (mL)',
      'Magnification = Image Size / Actual Specimen Size',
      'Hardy-Weinberg Equilibrium: p^2 + 2pq + q^2 = 1',
    ],
    labChecklist: [
      'Inspect skeletal vs muscular layers in 3D Anatomy Studio to trace origins/insertions.',
      'Verify double-membrane organelles (mitochondria & chloroplast) in Cell Builder.',
      'Record synchronized heart lub-dub beats alongside pulmonary alveoli expansion.',
    ],
    practicePrompts: [
      'Why do ventricular myocardium walls need thicker muscle than atrial walls?',
      'Which membrane barrier separates oxygenated alveolar air from capillary hemoglobin?',
    ],
  },
  computer_science: {
    subject: 'computer_science',
    title: 'Computer Science Coding, Networking & Logic Pack',
    summary:
      'Algorithm complexity, Python/JS control structures, HTML/CSS DOM layout, TCP/IP packet routing, and OSI layers.',
    formulas: [
      'Binary Search Complexity: O(log n) | Linear Scan: O(n)',
      'Subnet Hosts = 2^(32 - CIDR) - 2',
      'Bandwidth Delay Product = Bandwidth (bps) * RTT (sec)',
    ],
    labChecklist: [
      'Trace ICMP/TCP packet hops through switch, router, and firewall nodes.',
      'Test edge-case inputs (empty string, 0, negative values) in Coding Lab.',
    ],
    practicePrompts: [
      'Why does TCP require a 3-way handshake whereas UDP transmits statelessly?',
      'When does a sandboxed iframe block access to parent cookies?',
    ],
  },
  mathematics: {
    subject: 'mathematics',
    title: 'Mathematics Calculus, Vectors & Algebra Pack',
    summary:
      'Derivatives, integrals, quadratic optimization, trigonometric identities, and vector dot products.',
    formulas: [
      'Quadratic Roots: x = (-b +/- sqrt(b^2 - 4ac)) / (2a)',
      'Power Rule: d/dx(x^n) = n * x^(n - 1)',
      'Euler Identity: e^(i*pi) + 1 = 0',
      'Pythagorean Identity: sin^2(theta) + cos^2(theta) = 1',
    ],
    labChecklist: [
      'Inspect slope tangent line alongside inflection points on the Function Plotter.',
      'Check discriminant sign before classifying real vs complex roots.',
    ],
    practicePrompts: [
      'What does a zero first derivative with negative second derivative indicate?',
    ],
  },
  electrical_engineering: {
    subject: 'electrical_engineering',
    title: 'Electrical Circuits, AC Phasors & Logic Gates Pack',
    summary:
      'Kirchhoff laws, series/parallel equivalence, RC time constant, Boolean gates, and oscilloscope waveforms.',
    formulas: [
      'Ohm Law: V = I * R | Power: P = V * I = I^2 * R',
      'Series Resistance: R_eq = R1 + R2 | Parallel: 1/R_eq = 1/R1 + 1/R2',
      'RC Time Constant: tau = R * C',
      'Capacitive Reactance: Xc = 1 / (2 * pi * f * C)',
    ],
    labChecklist: [
      'Measure branch voltage drops and verify sum equals source EMF.',
      'Compare half-wave vs RMS amplitude on the virtual oscilloscope.',
    ],
    practicePrompts: [
      'Why does total resistance decrease when adding a parallel resistor branch?',
    ],
  },
};

function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  }
}

export function getOfflineQueue(): QueuedLabResult[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineLabResult(item: Omit<QueuedLabResult, 'id' | 'queuedAt'>): QueuedLabResult {
  const queue = getOfflineQueue();
  const entry: QueuedLabResult = {
    ...item,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    queuedAt: new Date().toISOString(),
  };
  const next = [entry, ...queue].slice(0, 40);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
    notifyQueueChange();
  } catch {}
  return entry;
}

export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, remaining: queue.length };
  }

  let synced = 0;
  const remaining: QueuedLabResult[] = [];

  for (const item of queue) {
    try {
      await learningDataService.createLabResult({
        experimentTitle: item.experimentTitle,
        subject: item.subject,
        outcome: item.outcome,
        formula: item.formula || '',
        measurements: item.measurements || '',
        notes: item.notes || '',
      });
      synced++;
    } catch {
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    notifyQueueChange();
  } catch {}

  return { synced, remaining: remaining.length };
}

export function getSavedStudyPacks(): Record<string, OfflineStudyPack> {
  try {
    const raw = localStorage.getItem(OFFLINE_PACKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStudyPackOffline(subjectKey: string): OfflineStudyPack | null {
  const template = BUILTIN_STUDY_PACKS[subjectKey];
  if (!template) return null;
  const packs = getSavedStudyPacks();
  const pack: OfflineStudyPack = {
    ...template,
    savedAt: new Date().toISOString(),
  };
  packs[subjectKey] = pack;
  try {
    localStorage.setItem(OFFLINE_PACKS_KEY, JSON.stringify(packs));
    notifyQueueChange();
  } catch {}
  return pack;
}

export function downloadStudyPackFile(subjectKey: string) {
  const saved = getSavedStudyPacks()[subjectKey] || BUILTIN_STUDY_PACKS[subjectKey];
  if (!saved) return;
  const markdown = [
    `# ${saved.title}`,
    ``,
    `**Subject:** ${saved.subject}`,
    ``,
    `## Core Summary`,
    saved.summary,
    ``,
    `## Key Formulas & Rules`,
    ...saved.formulas.map((f) => `- ${f}`),
    ``,
    `## Practical Lab Checklist`,
    ...saved.labChecklist.map((c) => `- [ ] ${c}`),
    ``,
    `## Practice Reflection Prompts`,
    ...saved.practicePrompts.map((p, i) => `${i + 1}. ${p}`),
  ].join('\n');

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learnify-${subjectKey}-offline-pack.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function isLowBandwidthMode(): boolean {
  try {
    return localStorage.getItem(LOW_BANDWIDTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setLowBandwidthMode(enabled: boolean) {
  try {
    localStorage.setItem(LOW_BANDWIDTH_KEY, enabled ? 'true' : 'false');
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('low-bandwidth', enabled);
    }
    notifyQueueChange();
  } catch {}
}

export const OFFLINE_SYNC_EVENT = SYNC_EVENT_NAME;
