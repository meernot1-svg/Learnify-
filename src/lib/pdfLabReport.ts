import { jsPDF } from 'jspdf';
import type { LabResult, LabSubject } from '../types';

export interface LabReportEntry {
  experimentTitle: string;
  subject: LabSubject | string;
  outcome: string;
  formula?: string;
  measurements?: string;
  notes?: string;
  stepsTaken?: string[];
  createdAt?: Date | string | null;
  snapshotDataUrl?: string;
}

export interface LabReportStudentMeta {
  studentName?: string;
  studentEmail?: string;
}

const SUBJECT_DISPLAY: Record<string, string> = {
  biology: 'Biology Lab',
  chemistry: 'Chemistry Lab',
  physics: 'Physics Lab',
  computer: 'Computer Science Lab',
  math: 'Mathematics Lab',
  electrical: 'Electrical Engineering Lab',
};

function parseTimestamp(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const sec = Number((val as { seconds?: unknown }).seconds);
    if (Number.isFinite(sec) && sec > 0) return new Date(sec * 1000);
  }
  return null;
}

function sanitizeFilename(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'lab-report'
  );
}

/**
 * Extracts explicit step-by-step actions from notes or synthesizes clean procedural steps
 * from recorded apparatus measurements and outcome when legacy entries lack a step list.
 */
export function extractReportSteps(entry: LabReportEntry): string[] {
  if (Array.isArray(entry.stepsTaken) && entry.stepsTaken.length > 0) {
    return entry.stepsTaken.map((s) => s.trim()).filter(Boolean);
  }

  const notes = (entry.notes || '').trim();
  if (notes) {
    const stepMarkerIdx = notes.search(/steps taken\s*:/i);
    if (stepMarkerIdx >= 0) {
      const section = notes.slice(stepMarkerIdx).replace(/steps taken\s*:/i, '').trim();
      const lines = section
        .split(/\n+|\s*\|\s*|\s*;\s*/)
        .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
        .filter(Boolean);
      if (lines.length > 0) return lines;
    }

    const numberedOrLines = notes
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
      .filter((s) => s.length > 4);
    if (numberedOrLines.length >= 2) return numberedOrLines;
  }

  // Construct clean procedural steps from saved fields
  const derived: string[] = [];
  const subjLabel = SUBJECT_DISPLAY[String(entry.subject).toLowerCase()] || 'Virtual Lab';
  derived.push(`Initialized ${entry.experimentTitle} apparatus in ${subjLabel}.`);
  if (entry.formula && entry.formula.trim()) {
    derived.push(`Applied governing relationship: ${entry.formula.trim()}.`);
  }
  if (entry.measurements && entry.measurements.trim()) {
    derived.push(`Recorded experimental parameters & readings: ${entry.measurements.trim()}.`);
  }
  if (notes) {
    derived.push(`Logged experimental observation: ${notes}`);
  }
  derived.push(`Verified key finding: ${entry.outcome.trim()}`);
  return derived;
}

function stripStepsHeaderFromNotes(notes?: string): string {
  if (!notes) return '';
  const idx = notes.search(/steps taken\s*:/i);
  if (idx === 0) return '';
  if (idx > 0) return notes.slice(0, idx).trim();
  return notes.trim();
}

function addPageHeaderFooter(
  doc: jsPDF,
  title: string,
  student: LabReportStudentMeta
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Subtle top running rule on continuation pages
    if (p > 1) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(42, 34, pageWidth - 42, 34);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Learnify Lab Report — ${title}`, 42, 26);
    }

    // Bottom footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(42, pageHeight - 38, pageWidth - 42, pageHeight - 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const leftFooter = student.studentName
      ? `Prepared for ${student.studentName}${student.studentEmail ? ` (${student.studentEmail})` : ''}`
      : 'Learnify Interactive STEM Laboratories';
    doc.text(leftFooter, 42, pageHeight - 24);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 42, pageHeight - 24, { align: 'right' });
  }
}

function renderReportBody(
  doc: jsPDF,
  entries: LabReportEntry[],
  reportTitle: string,
  subtitle: string,
  student: LabReportStudentMeta
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const maxWidth = pageWidth - marginX * 2;
  let y = 42;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 54) {
      doc.addPage();
      y = 50;
    }
  };

  // Hero Masthead Banner
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginX, y, maxWidth, 74, 8, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(56, 189, 248);
  doc.text('LEARNIFY VIRTUAL LABORATORY REPORT', marginX + 18, y + 22);

  doc.setFontSize(17);
  doc.setTextColor(248, 250, 252);
  const titleLines = doc.splitTextToSize(reportTitle, maxWidth - 36);
  doc.text(titleLines[0] || reportTitle, marginX + 18, y + 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  doc.text(subtitle, marginX + 18, y + 61);

  y += 90;

  // Student & Session Metadata Row
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, maxWidth, 44, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('STUDENT', marginX + 14, y + 17);
  doc.text('EXPERIMENTS', marginX + 235, y + 17);
  doc.text('GENERATED', marginX + 355, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    (student.studentName || student.studentEmail || 'Student Researcher').slice(0, 32),
    marginX + 14,
    y + 33
  );
  doc.text(`${entries.length} recorded`, marginX + 235, y + 33);
  doc.text(new Date().toLocaleDateString(undefined, { dateStyle: 'medium' }), marginX + 355, y + 33);

  y += 60;

  // Render Each Experiment Record
  entries.forEach((entry, idx) => {
    ensureSpace(140);

    const subjName = SUBJECT_DISPLAY[String(entry.subject).toLowerCase()] || String(entry.subject);
    const dt = parseTimestamp(entry.createdAt);
    const dateLabel = dt
      ? dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : 'Active Lab Session';

    // Experiment Title Header Strip
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, y, maxWidth, 34, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    const expPrefix = entries.length > 1 ? `${idx + 1}. ` : '';
    doc.text(`${expPrefix}${entry.experimentTitle}`.slice(0, 68), marginX + 12, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${subjName}  ·  ${dateLabel}`, marginX + 12, y + 27);

    y += 46;

    // Optional Canvas Snapshot Image (when exported from an active 3D/2D simulation)
    if (entry.snapshotDataUrl && entry.snapshotDataUrl.startsWith('data:image/')) {
      try {
        ensureSpace(175);
        const imgW = 260;
        const imgH = 148;
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(marginX, y, imgW + 4, imgH + 4, 4, 4, 'S');
        doc.addImage(entry.snapshotDataUrl, 'PNG', marginX + 2, y + 2, imgW, imgH);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Captured Simulation Viewport Snapshot', marginX, y + imgH + 16);
        y += imgH + 28;
      } catch {
        // Skip invalid snapshot safely
      }
    }

    // 1. Key Findings / Outcome
    ensureSpace(52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(2, 132, 199);
    doc.text('KEY FINDINGS & OUTCOME', marginX, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const outcomeLines = doc.splitTextToSize(entry.outcome || 'No outcome recorded.', maxWidth);
    outcomeLines.forEach((line: string) => {
      ensureSpace(15);
      doc.text(line, marginX, y);
      y += 14;
    });
    y += 6;

    // 2. Steps Taken
    const steps = extractReportSteps(entry);
    if (steps.length > 0) {
      ensureSpace(44);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);
      doc.text('STEPS TAKEN & PROCEDURE', marginX, y);
      y += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      steps.forEach((step, sIdx) => {
        const clean = step.replace(/^\d+[.)]\s*/, '');
        const lines = doc.splitTextToSize(`${sIdx + 1}. ${clean}`, maxWidth - 12);
        ensureSpace(lines.length * 13 + 4);
        lines.forEach((line: string, lIdx: number) => {
          doc.text(line, marginX + (lIdx === 0 ? 4 : 16), y);
          y += 13;
        });
        y += 2;
      });
      y += 6;
    }

    // 3. Measurements & Parameters
    if (entry.measurements && entry.measurements.trim()) {
      ensureSpace(38);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);
      doc.text('MEASUREMENTS & OBSERVED PARAMETERS', marginX, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const measLines = doc.splitTextToSize(entry.measurements.trim(), maxWidth);
      measLines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, marginX, y);
        y += 13;
      });
      y += 6;
    }

    // 4. Formula / Governing Law
    if (entry.formula && entry.formula.trim()) {
      ensureSpace(34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);
      doc.text('GOVERNING EQUATION / PRINCIPLE', marginX, y);
      y += 14;

      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const formulaLines = doc.splitTextToSize(entry.formula.trim(), maxWidth);
      formulaLines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, marginX, y);
        y += 13;
      });
      y += 6;
    }

    // 5. Additional Observations / Notes
    const cleanExtraNotes = stripStepsHeaderFromNotes(entry.notes);
    if (cleanExtraNotes && entry.stepsTaken?.length) {
      ensureSpace(32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);
      doc.text('OBSERVATION NOTES', marginX, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const noteLines = doc.splitTextToSize(cleanExtraNotes, maxWidth);
      noteLines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, marginX, y);
        y += 13;
      });
      y += 6;
    }

    // Section Divider between multiple entries
    if (idx < entries.length - 1) {
      y += 6;
      ensureSpace(24);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 18;
    }
  });
}

/**
 * Generates and downloads a formatted PDF Lab Report for a single experiment.
 */
export function downloadSingleLabReportPdf(
  entry: LabReportEntry,
  student: LabReportStudentMeta = {}
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const subjName = SUBJECT_DISPLAY[String(entry.subject).toLowerCase()] || 'Virtual STEM Lab';
  renderReportBody(
    doc,
    [entry],
    entry.experimentTitle,
    `${subjName} · Experiment Summary, Steps Taken & Key Findings`,
    student
  );
  addPageHeaderFooter(doc, entry.experimentTitle, student);
  const filename = `${sanitizeFilename(entry.subject + '-' + entry.experimentTitle)}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads a multi-experiment Portfolio Lab Summary PDF from Student Dashboard.
 */
export function downloadPortfolioLabReportPdf(
  results: LabResult[],
  student: LabReportStudentMeta = {},
  subjectFilterLabel?: string
): void {
  if (results.length === 0) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const entries: LabReportEntry[] = results.map((r) => ({
    experimentTitle: r.experimentTitle,
    subject: r.subject,
    outcome: r.outcome,
    formula: r.formula,
    measurements: r.measurements,
    notes: r.notes,
    createdAt: r.createdAt,
  }));

  const title = subjectFilterLabel
    ? `${subjectFilterLabel} Lab Report Portfolio`
    : 'Complete STEM Laboratory Report Summary';
  const subtitle = `Chronological summary of ${entries.length} saved experiment${
    entries.length === 1 ? '' : 's'
  }, procedural steps, and verified findings`;

  renderReportBody(doc, entries, title, subtitle, student);
  addPageHeaderFooter(doc, title, student);
  const filename = `${sanitizeFilename(title)}.pdf`;
  doc.save(filename);
}
