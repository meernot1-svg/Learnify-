import type { LabResult, LabSubject, Progress, SavedQuiz } from '../types';

export interface SuggestedLabModule {
  id: string;
  title: string;
  focus: string;
  route: string;
}

export interface TopicMasteryNode {
  subject: LabSubject | string;
  label: string;
  masteryScore: number; // 0-100
  quizAverage: number; // 0-100
  quizzesCount: number;
  labsCompleted: number;
  status: 'Strong' | 'Developing' | 'Needs Focus';
  recommendedLabRoute: string;
  recommendedLabName: string;
  weakTopics: string[];
  suggestedModules: SuggestedLabModule[];
}

export interface ScienceQuestMission {
  id: string;
  title: string;
  subject: LabSubject;
  description: string;
  rewardPoints: number;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  actionRoute: string;
}

export interface LearningTwinSnapshot {
  overallReadiness: number;
  nodes: TopicMasteryNode[];
  weakestSubject: TopicMasteryNode;
  adaptivePath: Array<{
    step: number;
    title: string;
    reason: string;
    route: string;
  }>;
  missions: ScienceQuestMission[];
}

const SUBJECT_METADATA: Array<{
  key: LabSubject;
  label: string;
  labName: string;
  route: string;
  modules: SuggestedLabModule[];
}> = [
  {
    key: 'physics',
    label: 'Physics',
    labName: 'Optics, Waves & Mechanics Lab',
    route: '/subject/physics?tab=tool&lab=optics',
    modules: [
      { id: 'what-if', title: 'What-If Force & Motion', focus: 'Gravity, drag resistance & terminal velocity', route: '/subject/physics?tab=tool&lab=what-if' },
      { id: 'optics', title: 'Optics Ray Bench', focus: 'Convex lenses, focal length & refraction', route: '/subject/physics?tab=tool&lab=optics' },
      { id: 'mechanics', title: 'Mechanics & Pendulum', focus: 'Gravity, projectiles & harmonic motion', route: '/subject/physics?tab=tool&lab=mechanics' },
      { id: 'waves', title: 'Waves & Acoustics', focus: 'Frequency, wavelength & interference', route: '/subject/physics?tab=tool&lab=waves' },
    ],
  },
  {
    key: 'chemistry',
    label: 'Chemistry',
    labName: 'Titration, pH & Reactions Lab',
    route: '/subject/chemistry?tab=tool&lab=ph',
    modules: [
      { id: 'ph', title: 'pH & Titration Lab', focus: 'Acid-base neutralization & indicators', route: '/subject/chemistry?tab=tool&lab=ph' },
      { id: 'molecules', title: '3D Molecular Geometry', focus: 'Covalent bonding & VSEPR angles', route: '/subject/chemistry?tab=tool&lab=molecules' },
      { id: 'reactions', title: 'Reaction Balancer', focus: 'Stoichiometry & enthalpy changes', route: '/subject/chemistry?tab=tool&lab=reactions' },
    ],
  },
  {
    key: 'biology',
    label: 'Biology',
    labName: '3D Anatomy & Cell Lab',
    route: '/subject/biology?tab=tool&lab=body',
    modules: [
      { id: 'body', title: '3D Human Anatomy', focus: 'Organ systems, skeleton & circulation', route: '/subject/biology?tab=tool&lab=body' },
      { id: 'cell', title: '3D Cell Explorer', focus: 'Mitochondria, nucleus & membranes', route: '/subject/biology?tab=tool&lab=cell' },
      { id: 'build-cell', title: 'Build-a-Cell Challenge', focus: 'Organelle assembly & function check', route: '/subject/biology?tab=tool&lab=build-cell' },
    ],
  },
  {
    key: 'computer',
    label: 'Computer Science',
    labName: 'Coding & Network Lab',
    route: '/subject/computer?tab=tool&lab=ide',
    modules: [
      { id: 'ide', title: 'Sandboxed Coding IDE', focus: 'Python, JavaScript, HTML & CSS', route: '/subject/computer?tab=tool&lab=ide' },
      { id: 'network', title: 'Network Packet Lab', focus: 'DNS, TCP handshakes & firewalls', route: '/subject/computer?tab=tool&lab=network' },
    ],
  },
  {
    key: 'math',
    label: 'Mathematics',
    labName: 'Graphing & Calculus Plotter',
    route: '/subject/math?tab=tool',
    modules: [
      { id: 'math', title: 'Graphing & Calculus Lab', focus: 'Derivatives, tangents & area under curve', route: '/subject/math?tab=tool' },
    ],
  },
  {
    key: 'electrical',
    label: 'Electrical Eng.',
    labName: 'AC/DC Circuit & Logic Studio',
    route: '/subject/electrical?tab=tool',
    modules: [
      { id: 'electrical', title: "Ohm's Law & Circuit Bench", focus: 'Series/parallel resistance, RC & logic gates', route: '/subject/electrical?tab=tool' },
    ],
  },
];

function normalizeSubjectKey(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (s.includes('phys')) return 'physics';
  if (s.includes('chem')) return 'chemistry';
  if (s.includes('bio') || s.includes('anat')) return 'biology';
  if (s.includes('comp') || s.includes('code') || s.includes('python') || s.includes('cs')) return 'computer';
  if (s.includes('math') || s.includes('calc') || s.includes('alg')) return 'math';
  if (s.includes('elec') || s.includes('circ')) return 'electrical';
  return s;
}

export function buildLearningTwinSnapshot(
  savedQuizzes: SavedQuiz[],
  labResults: LabResult[],
  progress: Progress[]
): LearningTwinSnapshot {
  const nodes: TopicMasteryNode[] = SUBJECT_METADATA.map((meta) => {
    const subjQuizzes = savedQuizzes.filter((q) => normalizeSubjectKey(q.subject) === meta.key);
    const subjLabs = labResults.filter((l) => normalizeSubjectKey(l.subject) === meta.key);
    const subjProgress = progress.filter((p) => normalizeSubjectKey(p.materialId) === meta.key);

    let quizAvg = 0;
    const weakTopics: string[] = [];

    if (subjQuizzes.length > 0) {
      const pcts = subjQuizzes.map((q) => {
        const total = Math.max(1, q.questions?.length || 10);
        const pct = Math.min(100, Math.round(((q.score || 0) / total) * 100));
        if (pct < 65 && q.title) {
          weakTopics.push(q.title);
        }
        return pct;
      });
      quizAvg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    }

    const labPoints = Math.min(40, subjLabs.length * 14);
    const quizPoints = subjQuizzes.length > 0 ? Math.round(quizAvg * 0.5) : 0;
    const activityPoints = Math.min(10, subjProgress.length * 4 + (progress.length > 0 ? 2 : 0));
    const masteryScore = Math.min(100, quizPoints + labPoints + activityPoints);

    const status: TopicMasteryNode['status'] =
      masteryScore >= 70 ? 'Strong' : masteryScore >= 35 ? 'Developing' : 'Needs Focus';

    return {
      subject: meta.key,
      label: meta.label,
      masteryScore,
      quizAverage: quizAvg,
      quizzesCount: subjQuizzes.length,
      labsCompleted: subjLabs.length,
      status,
      recommendedLabRoute: meta.route,
      recommendedLabName: meta.labName,
      weakTopics: Array.from(new Set(weakTopics)).slice(0, 3),
      suggestedModules: meta.modules,
    };
  });

  const sortedByWeakest = [...nodes].sort((a, b) => a.masteryScore - b.masteryScore);
  const weakestSubject = sortedByWeakest[0];
  const overallReadiness = Math.round(
    nodes.reduce((sum, n) => sum + n.masteryScore, 0) / Math.max(1, nodes.length)
  );

  const adaptivePath = [
    {
      step: 1,
      title: `Strengthen ${weakestSubject.label} via ${weakestSubject.recommendedLabName}`,
      reason:
        weakestSubject.weakTopics.length > 0
          ? `Recent quiz scores suggest reviewing: ${weakestSubject.weakTopics.join(', ')}`
          : `${weakestSubject.label} currently has ${weakestSubject.masteryScore}% readiness (${weakestSubject.labsCompleted} labs saved).`,
      route: weakestSubject.recommendedLabRoute,
    },
    {
      step: 2,
      title: `Verify Concepts in ${sortedByWeakest[1]?.label || 'Chemistry'} Practice Quiz`,
      reason: `Pair virtual experiments with timed diagnostic recall.`,
      route: '/mcqs',
    },
    {
      step: 3,
      title: `Review Topic in Sindhi Voice Explainer`,
      reason: `Ask questions by typing or voice and hear a complete topic walkthrough.`,
      route: '/sindhi-voice-explainer',
    },
  ];

  const missions: ScienceQuestMission[] = [
    {
      id: 'quest_first_lab',
      title: 'Practical Pioneer',
      subject: 'physics',
      description: 'Complete and save 1 virtual science laboratory experiment.',
      rewardPoints: 50,
      targetCount: 1,
      currentCount: Math.min(1, labResults.length),
      completed: labResults.length >= 1,
      actionRoute: '/subject/physics?tab=tool',
    },
    {
      id: 'quest_bio_explorer',
      title: 'Anatomy & Cell Cartographer',
      subject: 'biology',
      description: 'Save at least 1 Biology or 3D Anatomy practical observation.',
      rewardPoints: 60,
      targetCount: 1,
      currentCount: Math.min(1, labResults.filter((l) => normalizeSubjectKey(l.subject) === 'biology').length),
      completed: labResults.some((l) => normalizeSubjectKey(l.subject) === 'biology'),
      actionRoute: '/subject/biology?tab=tool',
    },
    {
      id: 'quest_chem_chemist',
      title: 'Stoichiometry Specialist',
      subject: 'chemistry',
      description: 'Save a Chemistry titration, pH, or molecular lab record.',
      rewardPoints: 60,
      targetCount: 1,
      currentCount: Math.min(1, labResults.filter((l) => normalizeSubjectKey(l.subject) === 'chemistry').length),
      completed: labResults.some((l) => normalizeSubjectKey(l.subject) === 'chemistry'),
      actionRoute: '/subject/chemistry?tab=tool',
    },
    {
      id: 'quest_quiz_scholar',
      title: 'STEM Diagnostic Scholar',
      subject: 'computer',
      description: 'Complete 3 saved AI diagnostic quizzes across subjects.',
      rewardPoints: 80,
      targetCount: 3,
      currentCount: Math.min(3, savedQuizzes.length),
      completed: savedQuizzes.length >= 3,
      actionRoute: '/mcqs',
    },
  ];

  return {
    overallReadiness,
    nodes,
    weakestSubject,
    adaptivePath,
    missions,
  };
}
