import { useCallback, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { learningDataService } from '../../services/learningData';
import { downloadSingleLabReportPdf, type LabReportEntry } from '../../lib/pdfLabReport';
import type { LabSubject } from '../../types';

export interface SaveLabParams {
  experimentTitle: string;
  outcome: string;
  formula?: string;
  measurements?: string;
  notes?: string;
  stepsTaken?: string[];
}

export function useSaveLabResult(subject: LabSubject) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recordedSteps, setRecordedSteps] = useState<string[]>([]);

  const recordStep = useCallback((step: string) => {
    const cleaned = step.trim();
    if (!cleaned) return;
    setRecordedSteps((prev) => {
      if (prev[prev.length - 1] === cleaned) return prev;
      return [...prev.slice(-11), cleaned];
    });
  }, []);

  const clearSteps = useCallback(() => {
    setRecordedSteps([]);
  }, []);

  const formatCombinedNotes = (notes?: string, explicitSteps?: string[]) => {
    const steps = explicitSteps && explicitSteps.length > 0 ? explicitSteps : recordedSteps;
    const base = (notes || '').trim();
    if (steps.length === 0) return base;
    const stepsBlock = `Steps Taken:\n${steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`;
    const combined = base ? `${base}\n\n${stepsBlock}` : stepsBlock;
    return combined.slice(0, 1000);
  };

  const saveResult = async (params: SaveLabParams) => {
    if (!user?.uid) {
      setFeedback({ type: 'error', text: 'Sign in to save lab results to your student profile.' });
      return false;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await learningDataService.createLabResult({
        experimentTitle: params.experimentTitle,
        subject,
        outcome: params.outcome,
        formula: params.formula || '',
        measurements: params.measurements || '',
        notes: formatCombinedNotes(params.notes, params.stepsTaken),
      });
      setFeedback({
        type: 'success',
        text: 'Experiment saved to your Dashboard tracker. Ready for PDF export.',
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to save lab result.';
      setFeedback({ type: 'error', text: msg });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const downloadPdfReport = (
    params: SaveLabParams & { snapshotDataUrl?: string }
  ) => {
    const steps =
      params.stepsTaken && params.stepsTaken.length > 0
        ? params.stepsTaken
        : recordedSteps.length > 0
          ? recordedSteps
          : undefined;

    const entry: LabReportEntry = {
      experimentTitle: params.experimentTitle,
      subject,
      outcome: params.outcome,
      formula: params.formula,
      measurements: params.measurements,
      notes: params.notes,
      stepsTaken: steps,
      createdAt: new Date(),
      snapshotDataUrl: params.snapshotDataUrl,
    };

    downloadSingleLabReportPdf(entry, {
      studentName: profile?.displayName || profile?.fullName || undefined,
      studentEmail: user?.email || undefined,
    });
    setFeedback({
      type: 'success',
      text: 'PDF Lab Report downloaded with steps taken and key findings.',
    });
  };

  return {
    saveResult,
    downloadPdfReport,
    recordStep,
    clearSteps,
    recordedSteps,
    saving,
    feedback,
    setFeedback,
    canSave: Boolean(user?.uid),
  };
}
