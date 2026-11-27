import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar as CalendarIcon, 
  X as CloseIcon,
  AlertCircle,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../hooks/useAuth';
import { StudyReminder, Subject } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface StudyRemindersProps {
  onClose?: () => void;
}

export default function StudyReminders({ onClose }: StudyRemindersProps) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  const [subject, setSubject] = useState<Subject | string>('computer');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  const loadReminders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dbService.getReminders(user.uid);
      setReminders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topic || !date || !time) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const reminderTime = new Date(`${date}T${time}`);
      await dbService.createReminder({
        subject,
        topic,
        time: reminderTime,
      });
      setShowAdd(false);
      setTopic('');
      setDate('');
      setTime('');
      loadReminders();
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || 'Failed to set reminder. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dbService.deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const subjects: Subject[] = ['computer', 'physics', 'biology', 'chemistry', 'math', 'electrical'];

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between pr-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Bell className="text-primary" size={20} />
            Study Reminders
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Schedule study sessions across your subjects
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus size={15} />
          <span>New Reminder</span>
        </button>
      </div>

      <div className="divide-y divide-border border-t border-border">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Clock className="mx-auto opacity-50" size={28} />
            <p className="text-xs">Loading reminders...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No study reminders scheduled yet.</p>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              Schedule your first reminder
            </button>
          </div>
        ) : (
          reminders.map((reminder) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'py-3.5 flex items-center justify-between gap-4 group',
                reminder.isNotified && 'opacity-60'
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    reminder.subject === 'computer'
                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : reminder.subject === 'physics'
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        : reminder.subject === 'biology'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  )}
                >
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{reminder.topic}</p>
                    {reminder.isNotified && (
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {reminder.subject}
                    <span aria-hidden="true"> · </span>
                    <span className="tabular-nums">
                      {format(
                        new Date(reminder.time.seconds ? reminder.time.seconds * 1000 : reminder.time),
                        'MMM d, h:mm a'
                      )}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(reminder.id)}
                aria-label={`Delete reminder ${reminder.topic}`}
                className="p-2 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="max-w-md w-full bg-card border border-border p-6 rounded-2xl shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                aria-label="Close new reminder form"
                className="absolute top-5 right-5 p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <CloseIcon size={18} />
              </button>

              <h3 className="text-lg font-bold tracking-tight text-foreground mb-5">
                New Study Reminder
              </h3>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAddReminder} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground capitalize outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Study Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Organic Chemistry Mechanisms"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Reminder'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
