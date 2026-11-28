export type ToastVariant = 'error' | 'warning' | 'success' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  durationMs: number;
  createdAt: number;
}

export interface ShowToastOptions {
  variant?: ToastVariant;
  title: string;
  message: string;
  durationMs?: number;
  dedupeKey?: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

const listeners = new Set<ToastListener>();
let activeToasts: ToastItem[] = [];
const recentDedupeMap = new Map<string, number>();

const MAX_TOASTS = 4;
const DEDUPE_WINDOW_MS = 3500;

function emit() {
  const snapshot = [...activeToasts];
  listeners.forEach((listener) => listener(snapshot));
}

export function dismissToast(id: string): void {
  const next = activeToasts.filter((t) => t.id !== id);
  if (next.length !== activeToasts.length) {
    activeToasts = next;
    emit();
  }
}

export function showToast(options: ShowToastOptions): string | null {
  const now = Date.now();
  const variant: ToastVariant = options.variant || 'info';
  const title = options.title.trim();
  const message = options.message.trim();
  const durationMs = typeof options.durationMs === 'number' ? options.durationMs : 6000;

  if (!message && !title) return null;

  const dedupeKey = options.dedupeKey || `${variant}:${title}:${message}`;
  const lastShown = recentDedupeMap.get(dedupeKey);
  if (lastShown && now - lastShown < DEDUPE_WINDOW_MS) {
    return null;
  }
  recentDedupeMap.set(dedupeKey, now);

  // Prune old dedupe entries periodically
  for (const [key, ts] of recentDedupeMap.entries()) {
    if (now - ts > DEDUPE_WINDOW_MS * 4) {
      recentDedupeMap.delete(key);
    }
  }

  const id = `toast_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const item: ToastItem = {
    id,
    variant,
    title,
    message,
    durationMs,
    createdAt: now,
  };

  activeToasts = [item, ...activeToasts].slice(0, MAX_TOASTS);
  emit();

  if (durationMs > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  }

  return id;
}

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener([...activeToasts]);
  return () => {
    listeners.delete(listener);
  };
}
