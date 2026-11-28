import React, { useState, useRef, useEffect } from 'react';
import {
  ImageIcon,
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  Camera,
  FileText,
  X,
  Download,
  Volume2,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/ai';
import { useLanguage } from '../hooks/useLanguage';
import Markdown from 'react-markdown';
import { toPng } from 'html-to-image';

type SpeechLang = 'en' | 'ur' | 'sd';

const SPEECH_LANG_META: Record<SpeechLang, { label: string; bcp47: string; prefixes: string[] }> = {
  en: { label: 'English', bcp47: 'en-US', prefixes: ['en'] },
  ur: { label: 'اردو (Urdu)', bcp47: 'ur-PK', prefixes: ['ur'] },
  sd: { label: 'سنڌي (Sindhi)', bcp47: 'sd-PK', prefixes: ['sd', 'ur', 'ar'] },
};

function cleanTextForSpeech(markdown: string): string {
  return markdown
    .replace(/```(?:mermaid|svg|[\w-]*)[\s\S]*?```/gi, ' Diagram shown on screen. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>-]{1,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSpeechChunks(text: string, maxLen = 220): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?؟۔\n])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = (current + ' ' + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= maxLen) {
        current = trimmed;
      } else {
        const words = trimmed.split(/\s+/);
        let part = '';
        for (const w of words) {
          if ((part + ' ' + w).trim().length <= maxLen) {
            part = (part + ' ' + w).trim();
          } else {
            if (part) chunks.push(part);
            part = w;
          }
        }
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export default function Explainer() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [fileData, setFileData] = useState<{ b64: string; mime: string; name: string } | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Web Speech API Read Aloud state
  const [speechLang, setSpeechLang] = useState<SpeechLang>(() =>
    language === 'sd' ? 'sd' : language === 'ur' || language === 'ur-latn' ? 'ur' : 'en'
  );
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechSessionRef = useRef<number>(0);

  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    setSpeechLang(language === 'sd' ? 'sd' : language === 'ur' || language === 'ur-latn' ? 'ur' : 'en');
  }, [language]);

  useEffect(() => {
    if (!speechSupported) return;
    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      speechSessionRef.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  const stopSpeech = () => {
    if (!speechSupported) return;
    speechSessionRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeechState('idle');
  };

  const pickVoiceForLang = (lang: SpeechLang): SpeechSynthesisVoice | null => {
    const meta = SPEECH_LANG_META[lang];
    for (const prefix of meta.prefixes) {
      const exact = availableVoices.find((v) => v.lang.toLowerCase() === meta.bcp47.toLowerCase());
      if (exact && prefix === meta.prefixes[0]) return exact;
      const partial = availableVoices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (partial) return partial;
    }
    return null;
  };

  const handleReadAloud = () => {
    if (!speechSupported) {
      setSpeechNotice('Read Aloud is not supported in this browser.');
      return;
    }
    if (!explanation.trim()) return;

    if (speechState === 'paused') {
      window.speechSynthesis.resume();
      setSpeechState('speaking');
      return;
    }

    if (speechState === 'speaking') {
      window.speechSynthesis.pause();
      setSpeechState('paused');
      return;
    }

    setSpeechNotice(null);
    const cleaned = cleanTextForSpeech(explanation);
    const chunks = splitSpeechChunks(cleaned);
    if (chunks.length === 0) {
      setSpeechNotice('No readable text found in this explanation.');
      return;
    }

    window.speechSynthesis.cancel();
    const sessionId = speechSessionRef.current + 1;
    speechSessionRef.current = sessionId;

    const matchedVoice = pickVoiceForLang(speechLang);
    const meta = SPEECH_LANG_META[speechLang];
    if (speechLang === 'sd' && (!matchedVoice || !matchedVoice.lang.toLowerCase().startsWith('sd'))) {
      setSpeechNotice(
        matchedVoice
          ? `Reading with browser ${matchedVoice.lang} voice (no native Sindhi OS voice installed).`
          : 'No native Sindhi OS voice installed; using browser default speech engine.'
      );
    }

    const speakChunkAt = (index: number) => {
      if (speechSessionRef.current !== sessionId) return;
      if (index >= chunks.length) {
        setSpeechState('idle');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = matchedVoice?.lang || meta.bcp47;
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.rate = speechRate;

      utterance.onend = () => {
        if (speechSessionRef.current === sessionId) {
          speakChunkAt(index + 1);
        }
      };
      utterance.onerror = () => {
        if (speechSessionRef.current === sessionId) {
          setSpeechState('idle');
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    setSpeechState('speaking');
    speakChunkAt(0);
  };

  const handleDownload = async () => {
    if (outputRef.current) {
      try {
        const dataUrl = await toPng(outputRef.current, {
          backgroundColor: '#0a0a0a',
          width: 1000,
          style: {
            padding: '60px',
            borderRadius: '40px',
            width: '1000px',
            margin: '0',
            color: '#fff',
          },
          pixelRatio: 2,
        });
        const link = document.createElement('a');
        link.download = `explanation-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Download failed', err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = (reader.result as string).split(',')[1];
        setFileData({
          b64,
          mime: file.type,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExplain = async () => {
    if ((!prompt.trim() && !fileData) || loading) return;
    stopSpeech();
    setLoading(true);
    setErrorMsg(null);
    setSpeechNotice(null);
    try {
      const result = await aiService.explainConcept(
        prompt || 'Explain the educational concepts depicted here',
        fileData?.b64,
        fileData?.mime,
        'Answer with clear, structured text and include SVG or Mermaid diagram code if relevant. If you provide diagrams, wrap them in ```mermaid or ```svg blocks.',
        language
      );
      setExplanation(result);
    } catch (error: any) {
      console.error('Explainer Error:', error);
      setErrorMsg(error?.message || 'Neural analyzer failed to process this material. Check document size or format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <header className="text-center">
        <div className="w-16 h-16 rounded-3xl bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto mb-6">
          <ImageIcon size={32} />
        </div>
        <h1 className="text-4xl font-bold mb-4 italic">Concept Explainer</h1>
        <p className="text-muted-foreground">Upload a diagram or photo of a concept, and AI will break it down with diagrams.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Input Pane */}
        <div className="space-y-6">
          <div
            className="aspect-auto md:aspect-square bg-muted/50 border-4 border-dashed border-border rounded-3xl md:rounded-[3rem] flex flex-col items-center justify-center p-6 md:p-10 min-h-[300px] relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            {fileData ? (
              fileData.mime === 'application/pdf' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-2xl">
                    <FileText size={48} />
                  </div>
                  <p className="font-bold text-center max-w-[250px] truncate">{fileData.name}</p>
                </div>
              ) : (
                <img src={`data:${fileData.mime};base64,${fileData.b64}`} className="absolute inset-0 w-full h-full object-contain p-4" alt="Diagram" />
              )
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform mb-6 shadow-xl">
                  <Camera size={32} />
                </div>
                <p className="font-bold text-lg mb-2">Drop Material Here</p>
                <p className="text-sm text-muted-foreground">PDFs or Images supported</p>
              </>
            )}
            <input
              type="file"
              id="file-upload"
              hidden
              onChange={handleFileChange}
              accept="image/*,application/pdf"
            />
            {fileData && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileData(null);
                }}
                className="absolute top-6 right-6 p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all z-20 shadow-lg"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Perspective (Optional)</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Explain photosynthesis with a diagram"
              className="w-full bg-muted border border-border rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 mb-6 font-medium"
            />
            {errorMsg && (
              <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <button
              onClick={handleExplain}
              disabled={(!prompt.trim() && !fileData) || loading}
              className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-3 hover:shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
              <span>{loading ? 'Synthesizing Explanation...' : 'Explain Diagram'}</span>
            </button>
          </div>
        </div>

        {/* Output Pane */}
        <div className="relative flex flex-col gap-4 group">
          {explanation && !loading && (
            <div className="bg-card border border-border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleReadAloud}
                  disabled={!speechSupported}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {speechState === 'speaking' ? (
                    <>
                      <Pause size={14} />
                      <span>Pause</span>
                    </>
                  ) : speechState === 'paused' ? (
                    <>
                      <Play size={14} />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} />
                      <span>Read Aloud</span>
                    </>
                  )}
                </button>

                {speechState !== 'idle' && (
                  <button
                    type="button"
                    onClick={stopSpeech}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-muted hover:bg-border text-xs font-bold transition-all cursor-pointer"
                  >
                    <Square size={12} fill="currentColor" />
                    <span>Stop</span>
                  </button>
                )}

                <select
                  value={speechLang}
                  onChange={(e) => {
                    stopSpeech();
                    setSpeechLang(e.target.value as SpeechLang);
                  }}
                  aria-label="Read aloud language"
                  className="bg-muted border border-border rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="ur">اردو (Urdu)</option>
                  <option value="sd">سنڌي (Sindhi)</option>
                </select>

                <select
                  value={speechRate}
                  onChange={(e) => setSpeechRate(Number(e.target.value))}
                  aria-label="Read aloud speed"
                  className="bg-muted border border-border rounded-xl px-2 py-2 text-xs font-bold focus:outline-none"
                >
                  <option value={0.85}>0.85x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                </select>
              </div>

              <button
                onClick={handleDownload}
                className="px-3.5 py-2 bg-muted hover:bg-border text-foreground rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs cursor-pointer"
              >
                <Download size={14} />
                <span>Download Image</span>
              </button>
            </div>
          )}

          {speechNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
              {speechNotice}
            </div>
          )}

          <div
            ref={outputRef}
            className="bg-card border border-border rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-xl overflow-auto min-h-[400px] md:min-h-[500px]"
          >
            {explanation ? (
              <div
                dir={speechLang === 'en' && language === 'en' ? 'ltr' : language === 'ur' || language === 'sd' ? 'rtl' : 'ltr'}
                className="markdown-body"
              >
                <Markdown>{explanation}</Markdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                <Search size={48} className="mb-6 mx-auto" />
                <p className="text-xl font-bold">Analysis Pending</p>
                <p className="text-sm max-w-[200px] mx-auto mt-2">Upload an image and click explain to see magic here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {[
          { label: 'Test in Physics Lab', to: '/subject/physics?tab=tool' },
          { label: 'Test in Chemistry Lab', to: '/subject/chemistry?tab=tool' },
          { label: 'Inspect in 3D Biology Lab', to: '/subject/biology?tab=tool' },
          { label: 'Run in Coding Lab', to: '/subject/computer?tab=tool' },
        ].map((link) => (
          <button
            key={link.to}
            type="button"
            onClick={() => navigate(link.to)}
            className="px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-bold hover:border-primary hover:text-primary transition-all cursor-pointer"
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}
