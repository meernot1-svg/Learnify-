import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Clock,
  FileQuestion,
  FileText,
  FlaskConical,
  Video,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Subject } from '../types';

export type WeeklyActivityKind = 'video' | 'pdf' | 'book' | 'quiz' | 'lab';

export interface WeeklyStudyActivityEntry {
  id: string;
  title: string;
  subject: Subject | string;
  kind: WeeklyActivityKind;
  durationMinutes: number;
  completedAt: Date | null;
  isCurrentWeek: boolean;
  detailLabel?: string;
  onOpen: () => void;
}

interface WeeklyStudyActivityProps {
  entries: WeeklyStudyActivityEntry[];
  loading?: boolean;
  weekRangeLabel: string;
  onBrowseLessons?: () => void;
}

const SUBJECT_LABELS: Record<string, string> = {
  computer: 'Computer Science',
  physics: 'Physics',
  biology: 'Biology',
  chemistry: 'Chemistry',
};

const KIND_LABELS: Record<WeeklyActivityKind, string> = {
  video: 'Video Lesson',
  pdf: 'PDF Reading',
  book: 'Reading Module',
  quiz: 'Practice Quiz',
  lab: 'Virtual Lab',
};

function formatDuration(minutes: number): string {
  const safeMin = Math.max(1, Math.round(minutes));
  if (safeMin < 60) return `${safeMin} min`;
  const hrs = Math.floor(safeMin / 60);
  const rem = safeMin % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs}h ${rem}m`;
}

function ActivityIcon({ kind }: { kind: WeeklyActivityKind }) {
  switch (kind) {
    case 'video':
      return <Video size={16} />;
    case 'pdf':
      return <FileText size={16} />;
    case 'book':
      return <BookOpen size={16} />;
    case 'quiz':
      return <FileQuestion size={16} />;
    case 'lab':
      return <FlaskConical size={16} />;
  }
}

export default function WeeklyStudyActivity({
  entries,
  loading = false,
  weekRangeLabel,
  onBrowseLessons,
}: WeeklyStudyActivityProps) {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [showAllRows, setShowAllRows] = useState(false);

  const filteredEntries = useMemo(() => {
    const base = scope === 'week' ? entries.filter((e) => e.isCurrentWeek) : entries;
    return base;
  }, [entries, scope]);

  const totalMinutes = useMemo(
    () => filteredEntries.reduce((sum, item) => sum + item.durationMinutes, 0),
    [filteredEntries]
  );

  const visibleEntries = showAllRows ? filteredEntries : filteredEntries.slice(0, 6);

  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Weekly Study Activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            {scope === 'week' ? weekRangeLabel : 'All completed sessions'}
            <span aria-hidden="true"> · </span>
            {filteredEntries.length} {filteredEntries.length === 1 ? 'session' : 'sessions'}
            <span aria-hidden="true"> · </span>
            {formatDuration(totalMinutes)}
          </p>
        </div>

        <div
          className="flex items-center gap-1 p-1 bg-muted rounded-xl"
          role="group"
          aria-label="Activity timeframe filter"
        >
          <button
            type="button"
            onClick={() => {
              setScope('week');
              setShowAllRows(false);
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
              scope === 'week'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('all');
              setShowAllRows(false);
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
              scope === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All Completed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-6 text-center space-y-3 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {scope === 'week'
              ? 'No completed lessons, quizzes, or labs logged yet this week.'
              : 'Complete a video lesson, PDF reading, quiz, or virtual lab to build your activity log.'}
          </p>
          {onBrowseLessons && (
            <button
              type="button"
              onClick={onBrowseLessons}
              className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors whitespace-nowrap shrink-0"
            >
              Browse Lessons
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {visibleEntries.map((entry) => {
              const subjectLabel = SUBJECT_LABELS[entry.subject] ?? entry.subject;
              const kindLabel = KIND_LABELS[entry.kind];
              const dateLabel = entry.completedAt
                ? format(entry.completedAt, 'MMM d, h:mm a')
                : 'Completed';

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={entry.onOpen}
                  className="w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left group hover:opacity-85 transition-opacity"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <ActivityIcon kind={entry.kind} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {entry.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        <span>{subjectLabel}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{kindLabel}</span>
                        {entry.detailLabel ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="tabular-nums">{entry.detailLabel}</span>
                          </>
                        ) : null}
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">{dateLabel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                      <Clock size={12} className="text-muted-foreground" />
                      {formatDuration(entry.durationMinutes)}
                    </span>
                    <ChevronRight
                      size={15}
                      className="text-muted-foreground group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {filteredEntries.length > 6 && (
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllRows((prev) => !prev)}
                className="text-xs font-medium text-primary hover:underline whitespace-nowrap shrink-0"
              >
                {showAllRows
                  ? 'Show fewer sessions'
                  : `Show all ${filteredEntries.length} sessions`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
