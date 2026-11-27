import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { learningDataService } from '../../services/learningData';
import type { LabSubject } from '../../types';

export function useSaveLabResult(subject: LabSubject) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const saveResult = async (params: {
    experimentTitle: string;
    outcome: string;
    formula?: string;
    measurements?: string;
    notes?: string;
  }) => {
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
        notes: params.notes || '',
      });
      setFeedback({ type: 'success', text: 'Experiment saved to your Dashboard tracker.' });
      return true;
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Unable to save lab result.' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saveResult, saving, feedback, setFeedback, canSave: Boolean(user?.uid) };
}
