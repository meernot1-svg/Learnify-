import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Bot, Loader2, PenLine, Globe, RotateCw, Send, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/ai';
import { useLanguage } from '../hooks/useLanguage';
import Markdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

type TeachingModeId =
  | 'beginner'
  | 'class9'
  | 'detailed'
  | 'real-life'
  | 'diagram'
  | 'socratic'
  | 'guided';

const TEACHING_MODES: Array<{ id: TeachingModeId; label: string; instruction: string }> = [
  {
    id: 'class9',
    label: 'Class 9 Level',
    instruction: 'Explain clearly at Class 9/10 curriculum level with key definitions and board-relevant points.',
  },
  {
    id: 'beginner',
    label: 'Beginner',
    instruction: 'Explain as if the student is a complete beginner using simple everyday words and zero jargon.',
  },
  {
    id: 'detailed',
    label: 'In Detail',
    instruction: 'Provide an in-depth explanation including formulas, step-by-step derivations, and units.',
  },
  {
    id: 'real-life',
    label: 'Real-Life Example',
    instruction: 'Teach the concept primarily through concrete everyday life examples and analogies.',
  },
  {
    id: 'diagram',
    label: 'With Diagram',
    instruction: 'Explain using a clear ASCII / labelled step diagram and recommend which interactive lab to try.',
  },
  {
    id: 'socratic',
    label: 'Teach via Questions',
    instruction: 'Use the Socratic method: guide the student by asking one thoughtful question at a time.',
  },
  {
    id: 'guided',
    label: 'Hint Without Spoiler',
    instruction: 'Help the student solve the problem step-by-step without revealing the final answer immediately.',
  },
];

export default function AIChat() {
  const { language, languageMeta } = useLanguage();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [teachingMode, setTeachingMode] = useState<TeachingModeId>('class9');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (forcedInput?: string) => {
    const textToSend = forcedInput || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setInput('');
    setError(null);
    const newMsgs: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);

    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    try {
      const modeObj = TEACHING_MODES.find((m) => m.id === teachingMode) || TEACHING_MODES[0];
      const guidedPrompt = `[Teaching Mode: ${modeObj.label} — ${modeObj.instruction} If uncertain about any fact, state the limitation clearly.]\n\n${userMsg}`;
      const response = await aiService.chat(guidedPrompt, history, language);
      setMessages([...newMsgs, { role: 'assistant', content: response }]);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach AI service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: <Sparkles size={16} />, label: 'Explain a concept', prompt: 'Explain chemical bonding with simple examples' },
    { icon: <PenLine size={16} />, label: 'Write or edit', prompt: 'Help me structure a physics lab report' },
    { icon: <Globe size={16} />, label: 'Practice STEM', prompt: 'Give me 3 practice problems on Newtonian mechanics' },
  ];

  return (
    <div className="max-w-screen-xl mx-auto flex flex-col h-[calc(100vh-14rem)] lg:h-[78vh] bg-card border border-border rounded-3xl overflow-hidden transition-colors relative shadow-2xl">
      {/* Top Navigation */}
      <div className="flex flex-col gap-2.5 px-4 sm:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 p-1">
            <Bot size={18} className="text-primary" />
            <span className="font-bold text-base sm:text-lg tracking-tight">Learnify AI</span>
          </div>
          <button
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            title="New conversation"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-border text-muted-foreground hover:text-foreground transition-all text-xs font-bold"
          >
            <RotateCw size={14} />
            <span className="hidden sm:inline">Reset Chat</span>
          </button>
        </div>

        {/* Teaching Mode Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            Mode:
          </span>
          {TEACHING_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setTeachingMode(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                teachingMode === m.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 sm:p-6 space-y-8">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-6xl font-bold mb-4 md:mb-12 tracking-tight text-center px-4"
            >
              What's on the agenda today?
            </motion.h1>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-10">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 sm:gap-6 group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-border ${
                    m.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-card text-foreground'
                  }`}
                >
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                    {m.role === 'user' ? 'You' : 'Assistant'}
                  </p>
                  <div className="markdown-body transition-all">
                    <Markdown>{m.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-4 sm:gap-6">
                <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-primary animate-pulse" />
                </div>
                <div className="flex gap-1 items-center h-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 border-t border-border bg-card/30">
        <div className="max-w-3xl mx-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative flex items-center bg-card border border-border rounded-2xl sm:rounded-[2.5rem] shadow-xl hover:border-border/80 transition-all p-1.5 pl-4 group shadow-black/5 dark:shadow-black">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about Physics, Chemistry, Biology, or CS..."
              className="flex-1 bg-transparent py-2 px-2 focus:outline-none font-medium text-base sm:text-lg"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`p-3 rounded-xl sm:rounded-full transition-all flex items-center justify-center ${
                input.trim() && !loading
                  ? 'bg-primary text-primary-foreground scale-105 shadow-lg'
                  : 'bg-muted text-muted-foreground opacity-50'
              }`}
              title="Send message"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSend(action.prompt)}
                className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-full text-xs font-semibold hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-95"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/learn-hub')}
              className="px-3.5 py-2 bg-primary/10 border border-primary/25 text-primary rounded-full text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer"
            >
              Open LearnLab Hub ({languageMeta.nativeLabel})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
