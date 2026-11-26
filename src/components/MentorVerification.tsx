import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface MentorVerificationProps {
  onVerify: () => void;
}

export default function MentorVerification({ onVerify }: MentorVerificationProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/mentor/status')
      .then((res) => res.json())
      .then((data) => setIsConfigured(Boolean(data?.configured)))
      .catch(() => setIsConfigured(true));
  }, []);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsVerifying(true);
    setError('');

    try {
      const endpoint = isConfigured === false ? '/api/mentor/claim' : '/api/mentor/verify';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verified) {
        setError(data?.error || 'Invalid authorization code. Access denied.');
        setIsVerifying(false);
        return;
      }
      onVerify();
    } catch {
      setError('Unable to reach verification server. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-muted/5">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-card border-2 border-border rounded-[3rem] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
                <ShieldCheck size={48} strokeWidth={1.5} />
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Lock size={12} fill="currentColor" />
                </motion.div>
              </div>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-primary mb-2">
                {isConfigured === false ? 'Set Mentor Key' : 'Mentor Access'}
              </h2>
              <p className="text-xs font-black uppercase text-muted-foreground/40 tracking-[0.3em]">
                {isConfigured === false
                  ? 'First-Run Access Code Setup'
                  : 'Identity Verification Protocol'}
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2 flex justify-between">
                  <span>{isConfigured === false ? 'Create Access Code (min 6 chars)' : 'Enter Authorization Key'}</span>
                  {error && <span className="text-red-500 animate-pulse">Failed</span>}
                </label>
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••••••••"
                  className={cn(
                    'w-full bg-muted/30 border-2 rounded-2xl p-6 text-center text-xl font-mono tracking-widest outline-none transition-all',
                    error
                      ? 'border-red-500/50 shadow-lg shadow-red-500/10 text-red-500'
                      : 'border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/5'
                  )}
                  autoFocus
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed items-start"
                >
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={!code.trim() || isVerifying}
                className={cn(
                  'w-full py-6 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden group/btn disabled:opacity-50',
                  isVerifying && 'bg-muted text-muted-foreground shadow-none'
                )}
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>{isConfigured === false ? 'Claim & Unlock' : 'Verify & Unlock'}</span>
                    <ShieldCheck size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-border flex flex-col items-center gap-4 text-center">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-relaxed max-w-[220px]">
                Mentor verification is validated on the server. Configure MENTOR_ACCESS_CODE in Secrets for persistent deployment.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors mt-2"
              >
                <ArrowLeft size={14} /> Back to Home
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
