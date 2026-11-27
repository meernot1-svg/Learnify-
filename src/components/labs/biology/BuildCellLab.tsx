import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Save,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type ChallengeCell = 'animal' | 'plant' | 'bacterial';

interface OrganellePiece {
  id: string;
  name: string;
  functionShort: string;
  color: string;
  belongsTo: ChallengeCell[];
  slotPos: { x: number; y: number };
}

const PIECES: OrganellePiece[] = [
  {
    id: 'nucleus',
    name: 'Nucleus',
    functionShort: 'Stores eukaryotic chromosomal DNA inside a nuclear envelope',
    color: '#8b5cf6',
    belongsTo: ['animal', 'plant'],
    slotPos: { x: 46, y: 44 },
  },
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    functionShort: 'Produces cellular ATP via aerobic respiration',
    color: '#ef4444',
    belongsTo: ['animal', 'plant'],
    slotPos: { x: 28, y: 62 },
  },
  {
    id: 'er',
    name: 'Rough & Smooth ER',
    functionShort: 'Folds membrane proteins and synthesizes cellular lipids',
    color: '#38bdf8',
    belongsTo: ['animal', 'plant'],
    slotPos: { x: 64, y: 36 },
  },
  {
    id: 'golgi',
    name: 'Golgi Apparatus',
    functionShort: 'Sorts, modifies, and ships vesicles to destinations',
    color: '#f59e0b',
    belongsTo: ['animal', 'plant'],
    slotPos: { x: 70, y: 66 },
  },
  {
    id: 'ribosomes',
    name: 'Ribosomes',
    functionShort: 'Decodes mRNA strands to assemble polypeptide chains',
    color: '#94a3b8',
    belongsTo: ['animal', 'plant', 'bacterial'],
    slotPos: { x: 34, y: 30 },
  },
  {
    id: 'lysosome',
    name: 'Lysosomes',
    functionShort: 'Hydrolytic enzyme sacs that recycle worn organelles',
    color: '#ec4899',
    belongsTo: ['animal'],
    slotPos: { x: 25, y: 44 },
  },
  {
    id: 'centrosome',
    name: 'Centrosome',
    functionShort: 'Anchors mitotic spindle fibers during animal cell division',
    color: '#eab308',
    belongsTo: ['animal'],
    slotPos: { x: 58, y: 74 },
  },
  {
    id: 'chloroplast',
    name: 'Chloroplasts',
    functionShort: 'Captures solar photons to synthesize glucose',
    color: '#22c55e',
    belongsTo: ['plant'],
    slotPos: { x: 24, y: 48 },
  },
  {
    id: 'vacuole',
    name: 'Central Vacuole',
    functionShort: 'Large water reservoir maintaining plant turgor pressure',
    color: '#06b6d4',
    belongsTo: ['plant'],
    slotPos: { x: 64, y: 55 },
  },
  {
    id: 'cell_wall',
    name: 'Rigid Cell Wall',
    functionShort: 'Outer structural barrier resisting osmotic pressure',
    color: '#10b981',
    belongsTo: ['plant', 'bacterial'],
    slotPos: { x: 14, y: 20 },
  },
  {
    id: 'nucleoid',
    name: 'Circular Nucleoid DNA',
    functionShort: 'Unbound prokaryotic chromosome floating in cytosol',
    color: '#a855f7',
    belongsTo: ['bacterial'],
    slotPos: { x: 48, y: 48 },
  },
  {
    id: 'plasmid',
    name: 'Plasmid Loop',
    functionShort: 'Mobile auxiliary DNA ring carrying resistance genes',
    color: '#f97316',
    belongsTo: ['bacterial'],
    slotPos: { x: 70, y: 42 },
  },
  {
    id: 'flagellum',
    name: 'Flagellum',
    functionShort: 'Rotary motor tail propelling the bacterium through fluid',
    color: '#14b8a6',
    belongsTo: ['bacterial'],
    slotPos: { x: 14, y: 52 },
  },
];

const CHALLENGES: Record<ChallengeCell, { title: string; goal: string }> = {
  animal: {
    title: 'Build an Animal Cell',
    goal: 'Select only eukaryotic animal organelles — skip plant walls, chloroplasts, and prokaryotic plasmids.',
  },
  plant: {
    title: 'Build a Plant Cell',
    goal: 'Assemble eukaryotic plant structures including chloroplasts, central vacuole, and cellulose cell wall.',
  },
  bacterial: {
    title: 'Build a Bacterial Prokaryote',
    goal: 'Assemble membrane-free prokaryote parts: circular nucleoid, plasmids, 70S ribosomes, peptidoglycan wall, and flagellum.',
  },
};

export default function BuildCellLab() {
  const [cellType, setCellType] = useState<ChallengeCell>('animal');
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string }>({
    type: 'info',
    text: 'Choose each organelle that belongs inside this cell from the tray.',
  });

  const { saveResult, saving, feedback: saveFeedback, canSave } = useSaveLabResult('biology');

  const requiredPieces = useMemo(
    () => PIECES.filter((p) => p.belongsTo.includes(cellType)),
    [cellType]
  );

  const isComplete = placedIds.length === requiredPieces.length;
  const accuracy =
    placedIds.length + mistakes > 0
      ? Math.round((placedIds.length / (placedIds.length + mistakes)) * 100)
      : 100;

  const resetChallenge = (nextType?: ChallengeCell) => {
    if (nextType) setCellType(nextType);
    setPlacedIds([]);
    setMistakes(0);
    setShowHint(false);
    setStatusMessage({
      type: 'info',
      text: 'Choose each organelle that belongs inside this cell from the tray.',
    });
  };

  const handleSelectPiece = (piece: OrganellePiece) => {
    if (placedIds.includes(piece.id)) return;

    if (piece.belongsTo.includes(cellType)) {
      const next = [...placedIds, piece.id];
      setPlacedIds(next);
      if (next.length === requiredPieces.length) {
        setStatusMessage({
          type: 'ok',
          text: `${CHALLENGES[cellType].title} complete with ${accuracy}% accuracy!`,
        });
      } else {
        setStatusMessage({
          type: 'ok',
          text: `Placed ${piece.name} — ${piece.functionShort}.`,
        });
      }
    } else {
      setMistakes((m) => m + 1);
      setStatusMessage({
        type: 'err',
        text: `${piece.name} does not belong in a ${cellType} cell. Try another organelle!`,
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Build a Cell Challenge
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{CHALLENGES[cellType].goal}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl">
            {(['animal', 'plant', 'bacterial'] as ChallengeCell[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => resetChallenge(c)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                  cellType === c
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {c === 'animal' ? 'Animal' : c === 'plant' ? 'Plant' : 'Bacterial'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowHint((h) => !h)}
            className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <HelpCircle size={14} />
            <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
          </button>
          <button
            type="button"
            onClick={() => resetChallenge()}
            className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Status & Score Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
        <div className="flex items-center gap-2.5 text-xs font-medium">
          {statusMessage.type === 'ok' ? (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          ) : statusMessage.type === 'err' ? (
            <XCircle size={16} className="text-rose-500 shrink-0" />
          ) : (
            <Sparkles size={16} className="text-primary shrink-0" />
          )}
          <span className="text-foreground">{statusMessage.text}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
          <span className="text-muted-foreground">
            Placed: <strong className="text-foreground">{placedIds.length}/{requiredPieces.length}</strong>
          </span>
          <span className="text-muted-foreground">
            Accuracy: <strong className="text-emerald-600 dark:text-emerald-400">{accuracy}%</strong>
          </span>
        </div>
      </div>

      {showHint && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
          Remaining structures needed:{' '}
          <strong>
            {requiredPieces
              .filter((p) => !placedIds.includes(p.id))
              .map((p) => p.name)
              .join(', ') || 'All placed!'}
          </strong>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Interactive Cell Construction Canvas */}
        <div className="lg:col-span-7 relative min-h-[380px] rounded-2xl border border-border bg-slate-950 p-4 flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 100 100"
            className="w-full max-w-[420px] h-[340px]"
            aria-label={`${cellType} cell construction stage`}
          >
            {/* Cytoplasm Membrane Envelope */}
            {cellType === 'animal' && (
              <ellipse
                cx="50"
                cy="50"
                rx="38"
                ry="34"
                fill="#0ea5e918"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
            )}
            {cellType === 'plant' && (
              <>
                <rect
                  x="10"
                  y="14"
                  width="80"
                  height="72"
                  rx="8"
                  fill="#10b98118"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
                <rect
                  x="14"
                  y="18"
                  width="72"
                  height="64"
                  rx="6"
                  fill="#06b6d410"
                  stroke="#6ee7b7"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </>
            )}
            {cellType === 'bacterial' && (
              <>
                <rect
                  x="22"
                  y="28"
                  width="62"
                  height="44"
                  rx="22"
                  fill="#10b98118"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                {placedIds.includes('flagellum') && (
                  <path
                    d="M 22 50 Q 15 40 10 50 T 2 50"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2.2"
                  />
                )}
              </>
            )}

            {/* Required Organelle Slots */}
            {requiredPieces.map((piece) => {
              const placed = placedIds.includes(piece.id);
              return (
                <g key={piece.id} transform={`translate(${piece.slotPos.x}, ${piece.slotPos.y})`}>
                  <circle
                    r={piece.id === 'nucleus' || piece.id === 'vacuole' ? 9 : 6.2}
                    fill={placed ? `${piece.color}cc` : '#1e293b88'}
                    stroke={placed ? piece.color : '#64748b'}
                    strokeWidth={placed ? 1.5 : 0.9}
                    strokeDasharray={placed ? undefined : '1.5 1.5'}
                  />
                  <text
                    y={piece.id === 'nucleus' || piece.id === 'vacuole' ? 13 : 10}
                    textAnchor="middle"
                    fontSize="3.3"
                    fill={placed ? '#f8fafc' : '#94a3b8'}
                    fontWeight="600"
                  >
                    {placed ? piece.name : '?'}
                  </text>
                </g>
              );
            })}
          </svg>

          {isComplete && (
            <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-emerald-950/95 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-emerald-200 text-xs font-semibold">
                <Trophy size={16} className="text-amber-400 shrink-0" />
                <span>Cell Assembled! All {requiredPieces.length} structures verified.</span>
              </div>
              {canSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveResult({
                      experimentTitle: CHALLENGES[cellType].title,
                      outcome: `Successfully assembled ${cellType} cell with ${accuracy}% accuracy (${mistakes} mistakes).`,
                      measurements: `${requiredPieces.length}/${requiredPieces.length} organelles verified`,
                      notes: requiredPieces.map((p) => p.name).join(', '),
                    })
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{saving ? 'Saving...' : 'Save Score'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Organelle Palette with Distractors */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border flex-1 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Organelle Palette (includes distractors)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 overflow-y-auto max-h-[340px] pr-1">
              {PIECES.map((piece) => {
                const placed = placedIds.includes(piece.id);
                return (
                  <button
                    key={piece.id}
                    type="button"
                    disabled={placed || isComplete}
                    onClick={() => handleSelectPiece(piece)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3',
                      placed
                        ? 'bg-emerald-500/10 border-emerald-500/40 opacity-70 cursor-default'
                        : 'bg-card border-border hover:border-primary/50 hover:bg-muted/40'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: piece.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{piece.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {piece.functionShort}
                      </p>
                    </div>
                    {placed && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {saveFeedback && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {saveFeedback.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
