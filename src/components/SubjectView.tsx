import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Book as BookIcon,
  Binary,
  Atom,
  Dna,
  Beaker,
  Box,
  ChevronRight,
  PlayCircle,
  Download,
  Calculator,
  Cpu,
  Globe,
  Eye,
  Compass,
  Waves,
  Magnet,
  Palette,
  FlaskConical,
  Droplets,
  Network,
  Puzzle,
  Terminal,
  Microscope,
} from 'lucide-react';
import { dbService } from '../services/db';
import { learningDataService } from '../services/learningData';
import { useAuth } from '../hooks/useAuth';
import { Material, Subject } from '../types';
import { MaterialViewer } from './Dashboard';
import PythonIDE from './PythonIDE';
import VirtualLab from './VirtualLab';
import LivingAnatomyLab from './LivingAnatomyLab';
import ExperimentCountdownTimer from './ExperimentCountdownTimer';
import { OrganismId } from '../data/livingAnatomyData';
import { cn } from '../lib/utils';

import Cell3DLab from './labs/biology/Cell3DLab';
import BuildCellLab from './labs/biology/BuildCellLab';
import Molecules3DLab from './labs/chemistry/Molecules3DLab';
import ReactionsLab from './labs/chemistry/ReactionsLab';
import PhTitrationLab from './labs/chemistry/PhTitrationLab';
import SolarSystem3DLab from './labs/physics/SolarSystem3DLab';
import OpticsBenchLab from './labs/physics/OpticsBenchLab';
import AtomBuilderLab from './labs/physics/AtomBuilderLab';
import MechanicsMotionLab from './labs/physics/MechanicsMotionLab';
import WavesAcousticsLab from './labs/physics/WavesAcousticsLab';
import EmFieldsLab from './labs/physics/EmFieldsLab';
import ColorMixingLab from './labs/physics/ColorMixingLab';
import NetworkSimulatorLab from './labs/computer/NetworkSimulatorLab';
import MathLabSuite from './labs/math/MathLabSuite';
import ElectricalLabSuite from './labs/electrical/ElectricalLabSuite';

type BioSubLab = 'body' | 'cell' | 'build-cell' | 'wetlab';
type ChemSubLab = 'molecules' | 'reactions' | 'ph' | 'beaker';
type PhysSubLab =
  | 'solar'
  | 'optics'
  | 'atom'
  | 'mechanics'
  | 'waves'
  | 'fields'
  | 'colors'
  | 'sandbox';
type CsSubLab = 'ide' | 'network';

export default function SubjectView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'tool'>(() =>
    searchParams.get('tab') === 'tool' ? 'tool' : 'content'
  );

  // Subject-specific StudyFi lab module states
  const [bioSubLab, setBioSubLab] = useState<BioSubLab>('body');
  const [biologyOrganism, setBiologyOrganism] = useState<OrganismId>('human');
  const [chemSubLab, setChemSubLab] = useState<ChemSubLab>('molecules');
  const [physSubLab, setPhysSubLab] = useState<PhysSubLab>('solar');
  const [csSubLab, setCsSubLab] = useState<CsSubLab>('ide');

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const requestedLab = searchParams.get('lab');
    if (requestedTab === 'tool') setActiveTab('tool');
    if (requestedLab) {
      if (id === 'biology' && ['body', 'cell', 'build-cell', 'wetlab'].includes(requestedLab)) {
        setBioSubLab(requestedLab as BioSubLab);
        setActiveTab('tool');
      } else if (id === 'chemistry' && ['molecules', 'reactions', 'ph', 'beaker'].includes(requestedLab)) {
        setChemSubLab(requestedLab as ChemSubLab);
        setActiveTab('tool');
      } else if (
        id === 'physics' &&
        ['solar', 'optics', 'atom', 'mechanics', 'waves', 'fields', 'colors', 'sandbox'].includes(requestedLab)
      ) {
        setPhysSubLab(requestedLab as PhysSubLab);
        setActiveTab('tool');
      } else if (id === 'computer' && ['ide', 'network'].includes(requestedLab)) {
        setCsSubLab(requestedLab as CsSubLab);
        setActiveTab('tool');
      }
    }
  }, [id, searchParams]);

  useEffect(() => {
    setSelectedMaterial(null);
    if (id) {
      dbService
        .getMaterials(id as Subject)
        .then(setMaterials)
        .catch((err) => {
          console.error('Failed to fetch subject materials:', err);
        });
    }
  }, [id]);

  const subjectMetaMap = {
    computer: {
      label: 'Computer Science',
      icon: Binary,
      color: 'text-blue-500',
      toolLabel: 'CS Labs & IDE',
    },
    physics: {
      label: 'Physics',
      icon: Atom,
      color: 'text-purple-500',
      toolLabel: 'Physics Lab Suite',
    },
    biology: {
      label: 'Biology',
      icon: Dna,
      color: 'text-green-500',
      toolLabel: 'Biology 3D & Lab',
    },
    chemistry: {
      label: 'Chemistry',
      icon: Beaker,
      color: 'text-orange-500',
      toolLabel: 'Chemistry Lab Suite',
    },
    math: {
      label: 'Mathematics',
      icon: Calculator,
      color: 'text-indigo-500',
      toolLabel: 'Interactive Math Lab',
    },
    electrical: {
      label: 'Electrical Engineering',
      icon: Cpu,
      color: 'text-amber-500',
      toolLabel: 'Circuits & Logic Lab',
    },
  } as const;

  const subjectMeta =
    subjectMetaMap[(id as keyof typeof subjectMetaMap) || 'computer'] ?? subjectMetaMap.computer;

  const logTimedSession = (subject: 'biology' | 'chemistry', elapsedSeconds: number) => {
    if (!user?.uid) return;
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    learningDataService
      .createLabResult({
        experimentTitle: `${subject === 'biology' ? 'Biology' : 'Chemistry'} Timed Lab Session`,
        subject,
        outcome: `Completed ${mins} minute (${elapsedSeconds}s) timed practical module.`,
        measurements: `Elapsed: ${elapsedSeconds}s`,
        notes: 'Logged via Experiment Countdown Timer',
      })
      .catch((err) => console.error('Failed to log timed lab session:', err));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-card border border-border shadow-sm">
              <subjectMeta.icon className={subjectMeta.color} size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{subjectMeta.label}</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Explore curated study resources alongside interactive 3D simulations, equations, and hands-on lab modules for{' '}
            {subjectMeta.label}.
          </p>
        </div>

        <div className="flex bg-muted p-1 rounded-2xl overflow-hidden self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'content'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Learning Materials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tool')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'tool'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {subjectMeta.toolLabel}
          </button>
        </div>
      </header>

      {/* Biology-only 3D Anatomy & Cell Launch Bar (never placed on dashboard/landing) */}
      {id === 'biology' && (
        <div className="bg-card border border-border rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
              <Box size={15} />
              <span>Body Anatomy 3D · Cell 3D · Build a Cell</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Interactive Biology 3D Studio
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Inspect 103 living anatomical models with human system filters, explore Animal, Plant, and Bacterial cells in 3D, or test yourself in the Build a Cell organelle challenge.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 lg:max-w-lg lg:justify-end">
            {(
              [
                { org: 'human', label: 'Human Body' },
                { org: 'human_brain', label: 'Brain' },
                { org: 'human_heart', label: 'Heart' },
                { org: 'plant', label: 'Plant' },
                { org: 'fish', label: 'Bony Fish' },
              ] as { org: OrganismId; label: string }[]
            ).map((item) => (
              <button
                key={item.org}
                type="button"
                onClick={() => {
                  setBiologyOrganism(item.org);
                  setBioSubLab('body');
                  setActiveTab('tool');
                }}
                className="px-3 py-1.5 rounded-xl border border-border bg-muted/50 hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-bold transition-all"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setBioSubLab('cell');
                setActiveTab('tool');
              }}
              className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-all"
            >
              Cell 3D
            </button>
            <button
              type="button"
              onClick={() => {
                setBioSubLab('build-cell');
                setActiveTab('tool');
              }}
              className="px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-300 hover:bg-teal-500 hover:text-white text-xs font-bold transition-all"
            >
              Build a Cell
            </button>
            <button
              type="button"
              onClick={() => {
                setBioSubLab('body');
                setActiveTab('tool');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-500 text-xs font-bold transition-all"
            >
              Open All 103 in 3D
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'content' ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {materials.length > 0 ? (
              materials.map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  onOpen={() => setSelectedMaterial(m)}
                />
              ))
            ) : (
              <div className="col-span-full space-y-10">
                <div className="py-20 text-center bg-card border border-border rounded-[3rem] shadow-sm">
                  <p className="text-muted-foreground mb-4">
                    No content from mentors yet. Here are interactive modules curated for you:
                  </p>
                  <h3 className="text-2xl font-bold italic text-primary">Core Curriculum</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {id === 'physics' && (
                    <>
                      <StaticTopicCard
                        title="Solar System & Orbital Mechanics"
                        description="Explore Keplerian orbits, axial tilt, and real planetary periods in an interactive 3D space canvas."
                        icon={<Globe />}
                        onExplore={() => {
                          setPhysSubLab('solar');
                          setActiveTab('tool');
                        }}
                      />
                      <StaticTopicCard
                        title="Optics, Waves & Electromagnetism"
                        description="Trace Snell refraction, converging lenses, Fourier wave superposition, Lorentz fields, and atomic orbitals."
                        icon={<Atom />}
                        onExplore={() => {
                          setPhysSubLab('optics');
                          setActiveTab('tool');
                        }}
                      />
                    </>
                  )}
                  {id === 'biology' && (
                    <>
                      <StaticTopicCard
                        title="3D Cell & Organelle Builder"
                        description="Explore Animal, Plant, and Bacterial cells in 3D and assemble organelles in a graded challenge."
                        icon={<Dna />}
                        onExplore={() => {
                          setBioSubLab('cell');
                          setActiveTab('tool');
                        }}
                      />
                      <StaticTopicCard
                        title="Living Anatomy 3D Explorer"
                        description="Inspect human organ systems and 103 living species with exploded views and X-ray mode."
                        icon={<Microscope />}
                        onExplore={() => {
                          setBioSubLab('body');
                          setActiveTab('tool');
                        }}
                      />
                    </>
                  )}
                  {id === 'chemistry' && (
                    <>
                      <StaticTopicCard
                        title="3D VSEPR Molecules & Reactions"
                        description="Inspect 3D molecular geometry, build custom compounds, and balance energetic reaction pathways."
                        icon={<Beaker />}
                        onExplore={() => {
                          setChemSubLab('molecules');
                          setActiveTab('tool');
                        }}
                      />
                      <StaticTopicCard
                        title="Acid-Base Titration & pH"
                        description="Deliver titrant dropwise, monitor equivalence inflection curves, and test buffer dilutions."
                        icon={<Droplets />}
                        onExplore={() => {
                          setChemSubLab('ph');
                          setActiveTab('tool');
                        }}
                      />
                    </>
                  )}
                  {id === 'computer' && (
                    <>
                      <StaticTopicCard
                        title="Python Algorithm Sandbox"
                        description="Write and run interactive Python programs with instant console evaluation."
                        icon={<Terminal />}
                        onExplore={() => {
                          setCsSubLab('ide');
                          setActiveTab('tool');
                        }}
                      />
                      <StaticTopicCard
                        title="Computer Networks & Packet Flow"
                        description="Simulate DNS resolution, TCP 3-way handshakes, HTTP routing, Traceroute hops, and firewall rules."
                        icon={<Network />}
                        onExplore={() => {
                          setCsSubLab('network');
                          setActiveTab('tool');
                        }}
                      />
                    </>
                  )}
                  {id === 'math' && (
                    <>
                      <StaticTopicCard
                        title="Calculus & Function Grapher"
                        description="Plot expressions with live derivatives f'(x), Riemann integrals, tangent sliders, and root analysis."
                        icon={<Calculator />}
                        onExplore={() => setActiveTab('tool')}
                      />
                      <StaticTopicCard
                        title="3D Polyhedra, Trig & Probability"
                        description="Inspect rotating Platonic solids, interactive unit-circle waves, and Monte Carlo dice/coin trials."
                        icon={<Box />}
                        onExplore={() => setActiveTab('tool')}
                      />
                    </>
                  )}
                  {id === 'electrical' && (
                    <>
                      <StaticTopicCard
                        title="DC Circuits & AC Oscilloscope"
                        description="Solve series/parallel Ohm's law circuits and inspect dual-channel RC waveforms on an oscilloscope."
                        icon={<Cpu />}
                        onExplore={() => setActiveTab('tool')}
                      />
                      <StaticTopicCard
                        title="Digital Logic Gates & Truth Tables"
                        description="Toggle binary inputs across AND, OR, XOR, NAND, NOR, and Half Adder circuits with live outputs."
                        icon={<Binary />}
                        onExplore={() => setActiveTab('tool')}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tool"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* BIOLOGY LAB WORKBENCH */}
            {id === 'biology' && (
              <div className="space-y-6">
                <SubLabSwitcher
                  items={[
                    { id: 'body', label: 'Body Anatomy 3D', icon: Box },
                    { id: 'cell', label: 'Cell 3D Explorer', icon: Dna },
                    { id: 'build-cell', label: 'Build a Cell', icon: Puzzle },
                    { id: 'wetlab', label: 'Microscope & Lab Bench', icon: Microscope },
                  ]}
                  activeId={bioSubLab}
                  onChange={(next) => setBioSubLab(next as BioSubLab)}
                />

                {bioSubLab !== 'wetlab' && (
                  <ExperimentCountdownTimer
                    subject="biology"
                    onLogTimedSession={(elapsed) => logTimedSession('biology', elapsed)}
                  />
                )}

                {bioSubLab === 'body' && (
                  <LivingAnatomyLab embedded initialOrganism={biologyOrganism} />
                )}
                {bioSubLab === 'cell' && <Cell3DLab />}
                {bioSubLab === 'build-cell' && <BuildCellLab />}
                {bioSubLab === 'wetlab' && (
                  <VirtualLab initialSubject="biology" hideSwitcher initialViewMode="lab" />
                )}
              </div>
            )}

            {/* CHEMISTRY LAB WORKBENCH */}
            {id === 'chemistry' && (
              <div className="space-y-6">
                <SubLabSwitcher
                  items={[
                    { id: 'molecules', label: '3D Molecules', icon: Box },
                    { id: 'reactions', label: 'Chemical Reactions', icon: FlaskConical },
                    { id: 'ph', label: 'pH & Titration', icon: Droplets },
                    { id: 'beaker', label: 'Beaker & Periodic Bench', icon: Beaker },
                  ]}
                  activeId={chemSubLab}
                  onChange={(next) => setChemSubLab(next as ChemSubLab)}
                />

                {chemSubLab !== 'beaker' && (
                  <ExperimentCountdownTimer
                    subject="chemistry"
                    onLogTimedSession={(elapsed) => logTimedSession('chemistry', elapsed)}
                  />
                )}

                {chemSubLab === 'molecules' && <Molecules3DLab />}
                {chemSubLab === 'reactions' && <ReactionsLab />}
                {chemSubLab === 'ph' && <PhTitrationLab />}
                {chemSubLab === 'beaker' && <VirtualLab initialSubject="chemistry" hideSwitcher />}
              </div>
            )}

            {/* PHYSICS LAB WORKBENCH (All 7 StudyFi modules + Classic Sandbox) */}
            {id === 'physics' && (
              <div className="space-y-6">
                <SubLabSwitcher
                  items={[
                    { id: 'solar', label: 'Solar System 3D', icon: Globe },
                    { id: 'optics', label: 'Optics Bench', icon: Eye },
                    { id: 'atom', label: 'Atom Builder', icon: Atom },
                    { id: 'mechanics', label: 'Mechanics', icon: Compass },
                    { id: 'waves', label: 'Waves & Sound', icon: Waves },
                    { id: 'fields', label: 'EM Fields', icon: Magnet },
                    { id: 'colors', label: 'Color & Light', icon: Palette },
                    { id: 'sandbox', label: 'Classic Sandbox', icon: Beaker },
                  ]}
                  activeId={physSubLab}
                  onChange={(next) => setPhysSubLab(next as PhysSubLab)}
                />

                {physSubLab === 'solar' && <SolarSystem3DLab />}
                {physSubLab === 'optics' && <OpticsBenchLab />}
                {physSubLab === 'atom' && <AtomBuilderLab />}
                {physSubLab === 'mechanics' && <MechanicsMotionLab />}
                {physSubLab === 'waves' && <WavesAcousticsLab />}
                {physSubLab === 'fields' && <EmFieldsLab />}
                {physSubLab === 'colors' && <ColorMixingLab />}
                {physSubLab === 'sandbox' && <VirtualLab initialSubject="physics" hideSwitcher />}
              </div>
            )}

            {/* COMPUTER SCIENCE WORKBENCH */}
            {id === 'computer' && (
              <div className="space-y-6">
                <SubLabSwitcher
                  items={[
                    { id: 'ide', label: 'Python Mini IDE', icon: Terminal },
                    { id: 'network', label: 'Networks Simulator', icon: Network },
                  ]}
                  activeId={csSubLab}
                  onChange={(next) => setCsSubLab(next as CsSubLab)}
                />

                {csSubLab === 'ide' && <PythonIDE />}
                {csSubLab === 'network' && <NetworkSimulatorLab />}
              </div>
            )}

            {/* MATHEMATICS LAB */}
            {id === 'math' && <MathLabSuite />}

            {/* ELECTRICAL ENGINEERING LAB */}
            {id === 'electrical' && <ElectricalLabSuite />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMaterial && (
          <MaterialViewer
            material={selectedMaterial}
            onClose={() => setSelectedMaterial(null)}
            onComplete={() => {
              if (user) {
                dbService.markComplete(user.uid, selectedMaterial.id).catch((err) => {
                  console.error('Mark complete error:', err);
                });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SubLabSwitcher({
  items,
  activeId,
  onChange,
}: {
  items: { id: string; label: string; icon: React.ComponentType<{ size?: number }> }[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-card border border-border shadow-sm">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <Icon size={14} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MaterialCard({ material, onOpen }: { material: Material; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group bg-card border border-border rounded-2xl p-6 hover:border-primary hover:shadow-xl transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-6">
        <div
          className={`p-3 rounded-xl ${
            material.type === 'video'
              ? 'bg-blue-500/10 text-blue-500'
              : material.type === 'pdf'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-orange-500/10 text-orange-500'
          }`}
        >
          {material.type === 'video' ? <Video size={24} /> : <BookIcon size={24} />}
        </div>
        <div className="p-2 rounded-lg hover:bg-muted transition-colors">
          {material.type === 'video' ? <PlayCircle size={20} /> : <Download size={20} />}
        </div>
      </div>
      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
        {material.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-6 leading-relaxed">
        {material.description}
      </p>
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Shared on{' '}
          {material.createdAt
            ? new Date(
                material.createdAt.seconds ? material.createdAt.seconds * 1000 : material.createdAt
              ).toLocaleDateString()
            : 'Recently'}
        </span>
        <ChevronRight
          size={16}
          className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}

function StaticTopicCard({
  title,
  description,
  icon,
  onExplore,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExplore: () => void;
}) {
  return (
    <div className="p-8 bg-card border border-border rounded-3xl group hover:border-primary/50 transition-all shadow-sm">
      <div className="mb-6 w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm mb-6">{description}</p>
      <button
        type="button"
        onClick={onExplore}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all"
      >
        <span>Explore Module</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
