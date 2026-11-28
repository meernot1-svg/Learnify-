import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, subscribeToToasts, ToastItem, ToastVariant } from '../lib/toastBus';

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    container: string;
    iconWrap: string;
    title: string;
    Icon: typeof AlertCircle;
  }
> = {
  error: {
    container: 'border-red-500/40 bg-card/95 text-foreground shadow-xl shadow-red-500/10',
    iconWrap: 'bg-red-500/15 text-red-500',
    title: 'text-red-500',
    Icon: AlertCircle,
  },
  warning: {
    container: 'border-amber-500/40 bg-card/95 text-foreground shadow-xl shadow-amber-500/10',
    iconWrap: 'bg-amber-500/15 text-amber-500',
    title: 'text-amber-500',
    Icon: AlertTriangle,
  },
  success: {
    container: 'border-emerald-500/40 bg-card/95 text-foreground shadow-xl shadow-emerald-500/10',
    iconWrap: 'bg-emerald-500/15 text-emerald-500',
    title: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  info: {
    container: 'border-primary/40 bg-card/95 text-foreground shadow-xl shadow-primary/10',
    iconWrap: 'bg-primary/15 text-primary',
    title: 'text-primary',
    Icon: Info,
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToToasts(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          const IconComponent = style.Icon;

          return (
            <motion.div
              key={toast.id}
              role="alert"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto rounded-2xl border backdrop-blur-md p-4 flex items-start gap-3 ${style.container}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.iconWrap}`}>
                <IconComponent size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold uppercase tracking-wider ${style.title}`}>
                  {toast.title}
                </p>
                <p className="text-xs sm:text-sm text-foreground/90 mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
