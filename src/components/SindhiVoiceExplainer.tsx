import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Send,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Download,
  Loader2,
  Sparkles,
  AlertCircle,
  BookOpen,
  FlaskConical,
  History,
  CheckCircle2,
  AudioLines,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { aiService } from '../services/ai';

type VoiceChoice = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
type VoiceInputMode = 'web-speech' | 'audio-clip';
type SpeechRecognitionLang = 'sd-PK' | 'sd-IN' | 'ur-PK';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionResultEventLike extends Event {
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface ExplainerResult {
  id: string;
  topicTitle: string;
  detectedQuestion: string;
  explanation: string;
  spokenScript: string;
  keyTakeaways: string[];
  suggestedLabSubject?: string;
  subject: string;
  grade: string;
  audioBase64?: string;
  audioMimeType?: string;
  voiceName?: VoiceChoice;
  createdAt: string;
}

const VOICE_OPTIONS: Array<{ id: VoiceChoice; label: string; tone: string }> = [
  { id: 'Kore', label: 'Kore', tone: 'Warm & Clear' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Bright & Gentle' },
  { id: 'Puck', label: 'Puck', tone: 'Lively & Engaging' },
  { id: 'Charon', label: 'Charon', tone: 'Calm & Deep' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Strong & Crisp' },
];

const SUBJECT_OPTIONS = [
  'General Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'Electrical Engineering',
];

const SINDHI_STARTERS: Array<{ label: string; subject: string; question: string }> = [
  {
    label: 'اوهم جو قانون',
    subject: 'Physics',
    question: 'اوهم جو قانون (Ohm’s Law) ڇا آهي ۽ وولٽيج، ڪرنٽ ۽ مزاحمت جو پاڻ ۾ ڪهڙو تعلق آهي؟',
  },
  {
    label: 'سيل ۽ ان جا حصا',
    subject: 'Biology',
    question: 'جاندارن جو سيل ڇا آهي ۽ نيوڪليس ۽ مائٽوڪونڊريا جو ڪهڙو ڪم آهي؟',
  },
  {
    label: 'ڦوٽو سنٿيسس',
    subject: 'Biology',
    question: 'ٻوٽن ۾ ڦوٽو سنٿيسس جو عمل ڪيئن ٿيندو آهي؟ سادي سنڌيءَ ۾ سمجهايو.',
  },
  {
    label: 'تيزاب ۽ اساس (pH)',
    subject: 'Chemistry',
    question: 'تيزاب ۽ اساس ۾ ڪهڙو فرق آهي ۽ pH اسڪيل ڇا ٻڌائي ٿو؟',
  },
  {
    label: 'نيوٽن جا قانون',
    subject: 'Physics',
    question: 'نيوٽن جا حرڪت جا ٽئي قانون روزاني زندگيءَ جي مثالن سان سمجهايو.',
  },
];

function downsampleBuffer(buffer: Float32Array, sampleRate: number, targetRate: number): Float32Array {
  if (targetRate >= sampleRate) return buffer;
  const ratio = sampleRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWavBase64(chunks: Float32Array[], inputSampleRate: number, targetSampleRate = 16000): string {
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Float32Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const samples = downsampleBuffer(merged, inputSampleRate, targetSampleRate);
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  let idx = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    idx += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function SindhiVoiceExplainer() {
  const navigate = useNavigate();
  const hasWebSpeechSTT = Boolean(getSpeechRecognitionConstructor());
  const [questionInput, setQuestionInput] = useState('');
  const [subject, setSubject] = useState('General Science');
  const [grade, setGrade] = useState('Class 9–10');
  const [voiceName, setVoiceName] = useState<VoiceChoice>('Kore');
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [voiceInputMode, setVoiceInputMode] = useState<VoiceInputMode>(
    hasWebSpeechSTT ? 'web-speech' : 'audio-clip'
  );
  const [speechLang, setSpeechLang] = useState<SpeechRecognitionLang>('sd-PK');

  const [isRecording, setIsRecording] = useState(false);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioErrorMsg, setAudioErrorMsg] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<ExplainerResult | null>(null);
  const [history, setHistory] = useState<ExplainerResult[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const inputSampleRateRef = useRef<number>(44100);
  const recordTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechCombinedRef = useRef<string>('');
  const speechShouldSubmitRef = useRef<boolean>(false);

  const isCapturingVoice = isRecording || isListeningSpeech;

  useEffect(() => {
    return () => {
      cleanupRecorder();
      cleanupSpeechRecognition(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanupSpeechRecognition = (abort = false) => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        if (abort) {
          recognition.abort();
        } else {
          recognition.stop();
        }
      } catch {
        // Ignore cleanup errors if recognition already ended.
      }
      recognitionRef.current = null;
    }
  };

  const cleanupRecorder = () => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const attachAndPlayAudio = (base64: string, mimeType = 'audio/wav', shouldAutoPlay = true) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration || 0);
    };
    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime || 0);
    };
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      setIsPlaying(false);
      setAudioCurrentTime(0);
    };

    if (shouldAutoPlay) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const synthesizeSpeechForResult = async (result: ExplainerResult, chosenVoice: VoiceChoice) => {
    if (!result.spokenScript.trim()) return;
    setLoadingAudio(true);
    setAudioErrorMsg(null);
    try {
      const tts = await aiService.synthesizeVoice({
        text: result.spokenScript,
        voiceName: chosenVoice,
      });
      const updated: ExplainerResult = {
        ...result,
        audioBase64: tts.audioBase64,
        audioMimeType: tts.mimeType || 'audio/wav',
        voiceName: chosenVoice,
      };
      setCurrentResult(updated);
      setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      attachAndPlayAudio(tts.audioBase64, tts.mimeType || 'audio/wav', autoPlayVoice);
    } catch (err: any) {
      setAudioErrorMsg(err?.message || 'Voice synthesis failed for this response.');
    } finally {
      setLoadingAudio(false);
    }
  };

  const runSindhiExplanation = async (payload: {
    question?: string;
    audioBase64?: string;
    audioMimeType?: string;
    overrideSubject?: string;
  }) => {
    setLoadingExplain(true);
    setErrorMsg(null);
    setAudioErrorMsg(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const useSubject = payload.overrideSubject || subject;
      const data = await aiService.explainInSindhi({
        question: payload.question,
        audioBase64: payload.audioBase64,
        audioMimeType: payload.audioMimeType,
        subject: useSubject,
        grade,
      });

      const entry: ExplainerResult = {
        id: `sd_${Date.now()}`,
        topicTitle: data.topicTitle,
        detectedQuestion: data.detectedQuestion,
        explanation: data.explanation,
        spokenScript: data.spokenScript,
        keyTakeaways: data.keyTakeaways || [],
        suggestedLabSubject: data.suggestedLabSubject,
        subject: useSubject,
        grade,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setQuestionInput(data.detectedQuestion);
      setCurrentResult(entry);
      setHistory((prev) => [entry, ...prev.slice(0, 7)]);
      setLoadingExplain(false);

      await synthesizeSpeechForResult(entry, voiceName);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process your Sindhi question right now.');
      setLoadingExplain(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setVoiceInputMode('audio-clip');
      void startAudioClipRecording();
      return;
    }

    if (isCapturingVoice || loadingExplain) return;
    setErrorMsg(null);
    setInterimTranscript('');
    speechCombinedRef.current = '';
    speechShouldSubmitRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let finalized = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalized += `${text} `;
          } else {
            interim += text;
          }
        }
        const cleanFinal = finalized.trim();
        const cleanInterim = interim.trim();
        const combined = [cleanFinal, cleanInterim].filter(Boolean).join(' ').trim();
        speechCombinedRef.current = combined;
        setInterimTranscript(cleanInterim);
        if (combined) {
          setQuestionInput(combined);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted') return;
        speechShouldSubmitRef.current = false;
        cleanupSpeechRecognition(true);
        setIsListeningSpeech(false);
        setInterimTranscript('');

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMsg('Microphone permission was denied. Allow mic access in browser settings or type your Sindhi question.');
        } else if (event.error === 'no-speech') {
          setErrorMsg('No speech was detected. Speak clearly in Sindhi near your microphone, or type your question.');
        } else if (event.error === 'language-not-supported') {
          setVoiceInputMode('audio-clip');
          setErrorMsg(
            `Browser Speech-to-Text (${speechLang}) is not supported on this device. Switched to Studio Mic so AI can transcribe your Sindhi voice directly.`
          );
        } else if (event.error === 'network') {
          setErrorMsg('Speech-to-Text network error. Check your connection, switch to Studio Mic, or type your question.');
        } else {
          setErrorMsg(`Speech recognition stopped (${event.error}). Try again, use Studio Mic, or type your question.`);
        }
      };

      recognition.onend = () => {
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        recognitionRef.current = null;
        setIsListeningSpeech(false);
        setInterimTranscript('');

        if (speechShouldSubmitRef.current) {
          speechShouldSubmitRef.current = false;
          const transcript = speechCombinedRef.current.trim();
          if (transcript) {
            setQuestionInput(transcript);
            void runSindhiExplanation({ question: transcript });
          } else {
            setErrorMsg('No Sindhi speech transcript was captured. Please try speaking again or type your question.');
          }
        }
      };

      recognition.start();
      setRecordingSeconds(0);
      setIsListeningSpeech(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 44) {
            stopSpeechRecognitionAndSubmit();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      cleanupSpeechRecognition(true);
      setIsListeningSpeech(false);
      setErrorMsg('Unable to start browser Speech-to-Text. You can switch to Studio Mic or type your Sindhi question.');
    }
  };

  const stopSpeechRecognitionAndSubmit = () => {
    if (!isListeningSpeech) return;
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      setIsListeningSpeech(false);
      return;
    }
    speechShouldSubmitRef.current = true;
    try {
      recognition.stop();
    } catch {
      speechShouldSubmitRef.current = false;
      cleanupSpeechRecognition(true);
      setIsListeningSpeech(false);
      const transcript = speechCombinedRef.current.trim();
      if (transcript) {
        void runSindhiExplanation({ question: transcript });
      }
    }
  };

  const cancelSpeechRecognition = () => {
    speechShouldSubmitRef.current = false;
    cleanupSpeechRecognition(true);
    setIsListeningSpeech(false);
    setInterimTranscript('');
    setRecordingSeconds(0);
  };

  const startAudioClipRecording = async () => {
    if (isCapturingVoice || loadingExplain) return;
    setErrorMsg(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Microphone recording is not supported in this browser. You can type your Sindhi question below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      inputSampleRateRef.current = audioCtx.sampleRate || 44100;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmChunksRef.current = [];

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setRecordingSeconds(0);
      setIsRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 44) {
            void stopAndSubmitVoice();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      cleanupRecorder();
      setIsRecording(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMsg('Microphone permission was denied. Allow mic access in browser settings or type your Sindhi question.');
      } else {
        setErrorMsg('Could not access microphone. Please check your device mic or type your question.');
      }
    }
  };

  const startVoiceCapture = () => {
    if (voiceInputMode === 'web-speech' && hasWebSpeechSTT) {
      startSpeechRecognition();
    } else {
      void startAudioClipRecording();
    }
  };

  const cancelVoiceCapture = () => {
    if (isListeningSpeech) {
      cancelSpeechRecognition();
    } else {
      cleanupRecorder();
      pcmChunksRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  const stopAndSubmitVoice = async () => {
    if (isListeningSpeech) {
      stopSpeechRecognitionAndSubmit();
      return;
    }
    if (!isRecording) return;
    setIsRecording(false);
    const sampleRate = inputSampleRateRef.current;
    const captured = [...pcmChunksRef.current];
    cleanupRecorder();
    pcmChunksRef.current = [];

    const totalSamples = captured.reduce((sum, arr) => sum + arr.length, 0);
    if (totalSamples < sampleRate * 0.4) {
      setErrorMsg('Recording was too short. Hold and speak your full Sindhi question clearly.');
      return;
    }

    const wavBase64 = encodeWavBase64(captured, sampleRate, 16000);
    await runSindhiExplanation({
      audioBase64: wavBase64,
      audioMimeType: 'audio/wav',
      question: questionInput.trim() || undefined,
    });
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleReplay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleBrowserSpeechFallback = () => {
    if (!currentResult || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentResult.spokenScript);
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.toLowerCase().startsWith('sd')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('ur')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
    if (preferred) utterance.voice = preferred;
    utterance.lang = preferred?.lang || 'sd-PK';
    utterance.rate = playbackRate;
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadAudio = () => {
    if (!currentResult?.audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:${currentResult.audioMimeType || 'audio/wav'};base64,${currentResult.audioBase64}`;
    link.download = `sindhi-voice-explanation-${Date.now()}.wav`;
    link.click();
  };

  const handleDownloadNotes = () => {
    if (!currentResult) return;
    const content = [
      `Topic: ${currentResult.topicTitle}`,
      `Question: ${currentResult.detectedQuestion}`,
      `Subject: ${currentResult.subject} (${currentResult.grade})`,
      '',
      currentResult.explanation,
      '',
      'Key Takeaways:',
      ...currentResult.keyTakeaways.map((k) => `- ${k}`),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sindhi-notes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectHistory = (item: ExplainerResult) => {
    setCurrentResult(item);
    setAudioErrorMsg(null);
    if (item.audioBase64) {
      attachAndPlayAudio(item.audioBase64, item.audioMimeType || 'audio/wav', false);
    } else {
      void synthesizeSpeechForResult(item, voiceName);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <header className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <AudioLines size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Sindhi Voice Explainer</h1>
          <p dir="rtl" className="text-lg font-semibold text-primary">
            سنڌي صوتي استاد — پنهنجو سوال لکو يا آواز ۾ پڇو، AI مڪمل موضوع آواز ۾ سمجهائيندو
          </p>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Ask any Science, Math, or Computer question in Sindhi by typing or speaking into your microphone, and listen to a complete spoken explanation.
        </p>
      </header>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input & Voice Controls */}
        <section className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Class Level
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="Class 6–8">Class 6–8</option>
                <option value="Class 9–10">Class 9–10 (Matric)</option>
                <option value="Class 11–12">Class 11–12 (Inter)</option>
              </select>
            </div>
          </div>

          {/* Voice Narrator & Autoplay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Teacher Voice
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPlayVoice}
                  onChange={(e) => setAutoPlayVoice(e.target.checked)}
                  className="rounded accent-primary"
                />
                Auto-play voice
              </label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceName(v.id)}
                  className={`px-2 py-2 rounded-xl border text-center transition-all cursor-pointer ${
                    voiceName === v.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{v.label}</div>
                  <div className="text-[9px] opacity-80 truncate">{v.tone}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Input Mode Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Speech-to-Text Input
              </label>
              {voiceInputMode === 'web-speech' && hasWebSpeechSTT && (
                <select
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value as SpeechRecognitionLang)}
                  disabled={isCapturingVoice}
                  aria-label="Speech recognition language"
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25"
                >
                  <option value="sd-PK">Sindhi (sd-PK)</option>
                  <option value="sd-IN">Sindhi (sd-IN)</option>
                  <option value="ur-PK">Urdu Fallback (ur-PK)</option>
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!hasWebSpeechSTT || isCapturingVoice}
                onClick={() => setVoiceInputMode('web-speech')}
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  voiceInputMode === 'web-speech'
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {hasWebSpeechSTT ? 'Live Speech-to-Text' : 'Web Speech Unavailable'}
              </button>
              <button
                type="button"
                disabled={isCapturingVoice}
                onClick={() => setVoiceInputMode('audio-clip')}
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  voiceInputMode === 'audio-clip'
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Studio Mic Audio
              </button>
            </div>
          </div>

          {/* Sindhi Question Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Your Question (Sindhi / سنڌي)
              </label>
              <span dir="rtl" className="text-xs font-semibold text-primary">
                لکو يا مائيڪ استعمال ڪريو
              </span>
            </div>
            <textarea
              dir="rtl"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="مثال: اوهم جو قانون ڇا آهي؟ يا مائيڪ بٽڻ دٻائي سنڌيءَ ۾ پڇو..."
              className="w-full h-36 bg-muted/60 border border-border rounded-2xl p-4 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons: Speak or Send Typed Question */}
          <div className="space-y-3">
            {isCapturingVoice ? (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span>
                      {isListeningSpeech
                        ? `Transcribing Sindhi (${speechLang})... ${formatSeconds(recordingSeconds)}`
                        : `Recording Sindhi audio... ${formatSeconds(recordingSeconds)}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelVoiceCapture}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                {isListeningSpeech && (
                  <div
                    dir="rtl"
                    className="p-2.5 rounded-xl bg-background/70 border border-border text-sm text-foreground min-h-[40px]"
                  >
                    {questionInput || interimTranscript ? (
                      <span>{questionInput || interimTranscript}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        سنڌيءَ ۾ پنهنجو سوال ڳالهايو...
                      </span>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void stopAndSubmitVoice()}
                  className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-red-600 transition-all cursor-pointer"
                >
                  <Square size={16} fill="currentColor" />
                  <span>Stop &amp; Explain in Voice</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startVoiceCapture}
                  disabled={loadingExplain}
                  className="py-3.5 px-4 rounded-2xl border-2 border-primary/40 bg-primary/10 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Mic size={18} />
                  <span>Ask by Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => runSindhiExplanation({ question: questionInput.trim() })}
                  disabled={!questionInput.trim() || loadingExplain}
                  className="py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loadingExplain ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
                  <span>{loadingExplain ? 'Explaining...' : 'Explain in Voice'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Sindhi Starters */}
          <div className="pt-2 border-t border-border space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Sindhi Topics
            </p>
            <div className="flex flex-wrap gap-2" dir="rtl">
              {SINDHI_STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  disabled={loadingExplain || isCapturingVoice}
                  onClick={() => {
                    setSubject(starter.subject);
                    setQuestionInput(starter.question);
                    void runSindhiExplanation({
                      question: starter.question,
                      overrideSubject: starter.subject,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-muted hover:bg-primary/10 border border-border hover:border-primary/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {starter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Voice Player & Full Sindhi Explanation */}
        <section className="lg:col-span-7 space-y-5">
          {loadingExplain ? (
            <div className="bg-card border border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]">
              <Loader2 size={40} className="animate-spin text-primary" />
              <div className="space-y-1">
                <p className="font-bold text-lg">Preparing your Sindhi explanation...</p>
                <p dir="rtl" className="text-sm text-muted-foreground">
                  سوال سمجھي مڪمل سبق ۽ آواز تيار ڪيو پيو وڃي...
                </p>
              </div>
            </div>
          ) : currentResult ? (
            <>
              {/* Voice Audio Player Card */}
              <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                      <Volume2 size={22} />
                    </div>
                    <div>
                      <h2 className="font-bold text-base">AI Sindhi Voice Lecture</h2>
                      <p className="text-xs text-muted-foreground">
                        {loadingAudio
                          ? `Generating audio with ${voiceName}...`
                          : currentResult.audioBase64
                          ? `Voice: ${currentResult.voiceName || voiceName} • Ready to play`
                          : 'Audio lecture ready'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {[0.85, 1, 1.2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {loadingAudio ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/60 border border-border text-sm font-medium">
                    <Loader2 size={18} className="animate-spin text-primary shrink-0" />
                    <span>Synthesizing natural Sindhi teacher voice...</span>
                  </div>
                ) : currentResult.audioBase64 ? (
                  <div className="space-y-3 p-4 rounded-2xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-95 transition-all shrink-0 cursor-pointer"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <input
                          type="range"
                          min={0}
                          max={audioDuration || 1}
                          step={0.1}
                          value={audioCurrentTime}
                          onChange={(e) => {
                            const t = Number(e.target.value);
                            setAudioCurrentTime(t);
                            if (audioRef.current) audioRef.current.currentTime = t;
                          }}
                          className="w-full accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                          <span>{formatSeconds(audioCurrentTime)}</span>
                          <span>{formatSeconds(audioDuration)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleReplay}
                        title="Replay from start"
                        className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadAudio}
                        title="Download Audio (.wav)"
                        className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-all cursor-pointer"
                      >
                        <Download size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        Switch narrator above and regenerate if you want a different voice.
                      </span>
                      <button
                        type="button"
                        onClick={() => void synthesizeSpeechForResult(currentResult, voiceName)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Regenerate with {voiceName}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                    <div className="flex items-start gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{audioErrorMsg || 'Server neural voice audio is not available right now.'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void synthesizeSpeechForResult(currentResult, voiceName)}
                        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                      >
                        Retry Server Voice
                      </button>
                      {'speechSynthesis' in window && (
                        <button
                          type="button"
                          onClick={handleBrowserSpeechFallback}
                          className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold cursor-pointer"
                        >
                          Use Browser Read-Aloud
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Written Sindhi Explanation Card */}
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border">
                  <div dir="rtl" className="flex-1 min-w-0 space-y-1.5">
                    <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary">
                      {currentResult.subject} • {currentResult.grade}
                    </span>
                    <h2 className="text-2xl font-bold text-foreground">{currentResult.topicTitle}</h2>
                    <p className="text-xs text-muted-foreground">
                      سوال: {currentResult.detectedQuestion}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadNotes}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-border text-xs font-bold transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Notes</span>
                    </button>
                    {currentResult.suggestedLabSubject && (
                      <button
                        type="button"
                        onClick={() => navigate(`/subject/${currentResult.suggestedLabSubject}?tab=tool`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <FlaskConical size={14} />
                        <span>Open Lab</span>
                      </button>
                    )}
                  </div>
                </div>

                <div dir="rtl" className="markdown-body leading-loose text-base">
                  <Markdown>{currentResult.explanation}</Markdown>
                </div>

                {currentResult.keyTakeaways.length > 0 && (
                  <div dir="rtl" className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Sparkles size={16} />
                      <span>اهم نڪتا (Key Takeaways)</span>
                    </div>
                    <ul className="space-y-1.5">
                      {currentResult.keyTakeaways.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm font-medium">
                          <CheckCircle2 size={16} className="text-primary shrink-0 mt-1" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center min-h-[420px] space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                <BookOpen size={28} />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-bold">Ready to Listen &amp; Learn in Sindhi</h3>
                <p dir="rtl" className="text-sm text-muted-foreground leading-relaxed">
                  پنھنجو سوال سنڌيءَ ۾ لکو يا &quot;Ask by Voice&quot; دٻائي ڳالهايو. توھان کي مڪمل موضوع سنڌي آواز ۽ لکت ٻنھي ۾ ملي ويندو.
                </p>
              </div>
            </div>
          )}

          {/* Session History */}
          {history.length > 1 && (
            <div className="bg-card border border-border rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <History size={14} />
                <span>Recent Explanations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectHistory(item)}
                    dir="rtl"
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      currentResult?.id === item.id
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-muted/40 border-border hover:bg-muted'
                    }`}
                  >
                    <p className="text-sm font-bold truncate">{item.topicTitle}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.subject} • {item.createdAt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
