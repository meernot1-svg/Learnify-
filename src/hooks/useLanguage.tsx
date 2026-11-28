import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppLanguage = 'en' | 'ur' | 'ur-latn' | 'sd';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
  aiInstruction: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    dir: 'ltr',
    aiInstruction: 'Respond in clear academic English.',
  },
  {
    code: 'ur',
    label: 'Urdu',
    nativeLabel: 'اردو',
    dir: 'rtl',
    aiInstruction:
      'Respond clearly in standard Urdu (اردو script) while keeping technical scientific symbols and formulas accurate.',
  },
  {
    code: 'ur-latn',
    label: 'Roman Urdu',
    nativeLabel: 'Roman Urdu',
    dir: 'ltr',
    aiInstruction:
      'Respond in clear, natural Roman Urdu (Urdu written in Latin script) while keeping scientific terms and equations clear.',
  },
  {
    code: 'sd',
    label: 'Sindhi',
    nativeLabel: 'سنڌي',
    dir: 'rtl',
    aiInstruction:
      'Respond clearly in standard Sindhi (سنڌي script) while preserving accurate scientific formulas and terms.',
  },
];

const UI_STRINGS: Record<AppLanguage, Record<string, string>> = {
  en: {
    hubTitle: 'LearnLab Hub',
    learningTwin: 'AI Learning Twin',
    examReadiness: 'Exam Readiness Meter',
    misconceptionDetector: 'AI Misconception Detector',
    scienceQuest: 'AI Science Quest',
    offlineLearning: 'Offline & Low-Bandwidth',
    lowBandwidth: 'Low-Bandwidth Mode',
    syncNow: 'Sync Offline Progress',
    downloadPack: 'Save Offline Pack',
    installApp: 'Install App',
    offlineBadge: 'Offline Mode',
    onlineReady: 'Synced Online',
  },
  ur: {
    hubTitle: 'لرن لیب ہب',
    learningTwin: 'اے آئی لرننگ ٹوئن',
    examReadiness: 'امتحانی تیاری میٹر',
    misconceptionDetector: 'غلط فہمی شناخت کار',
    scienceQuest: 'سائنس کویسٹ',
    offlineLearning: 'آف لائن اور کم بینڈوتھ',
    lowBandwidth: 'لو بینڈوتھ موڈ',
    syncNow: 'آف لائن ڈیٹا سنک کریں',
    downloadPack: 'آف لائن پیک محفوظ کریں',
    installApp: 'ایپ انسٹال کریں',
    offlineBadge: 'آف لائن موڈ',
    onlineReady: 'آن لائن سنک',
  },
  'ur-latn': {
    hubTitle: 'LearnLab Hub',
    learningTwin: 'AI Learning Twin',
    examReadiness: 'Imtehani Tayyari Meter',
    misconceptionDetector: 'Ghalat Fehmi Detector',
    scienceQuest: 'AI Science Quest',
    offlineLearning: 'Offline aur Low-Bandwidth',
    lowBandwidth: 'Low-Bandwidth Mode',
    syncNow: 'Offline Progress Sync Karein',
    downloadPack: 'Offline Pack Save Karein',
    installApp: 'App Install Karein',
    offlineBadge: 'Offline Mode',
    onlineReady: 'Online Synced',
  },
  sd: {
    hubTitle: 'لرن ليب هب',
    learningTwin: 'اي آءِ لرننگ ٽوئن',
    examReadiness: 'امتحاني تياري ميٽر',
    misconceptionDetector: 'غلط فهمي سڃاڻپ',
    scienceQuest: 'سائنس ڪوئيسٽ',
    offlineLearning: 'آف لائين ۽ گهٽ بينڊوڊٿ',
    lowBandwidth: 'گهٽ بينڊوڊٿ موڊ',
    syncNow: 'آف لائين پيش رفت سنڪ ڪريو',
    downloadPack: 'آف لائين پيڪ محفوظ ڪريو',
    installApp: 'ايپ انسٽال ڪريو',
    offlineBadge: 'آف لائين موڊ',
    onlineReady: 'آن لائين سنڪ',
  },
};

const STORAGE_KEY = 'learnify_language';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  languageMeta: LanguageOption;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  languageMeta: LANGUAGE_OPTIONS[0],
  t: (k) => UI_STRINGS.en[k] || k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
      if (saved && LANGUAGE_OPTIONS.some((o) => o.code === saved)) return saved;
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const languageMeta = LANGUAGE_OPTIONS.find((o) => o.code === language) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    document.documentElement.lang = language === 'ur-latn' ? 'ur' : language;
    document.documentElement.dir = languageMeta.dir;
  }, [language, languageMeta.dir]);

  const t = (key: string) => UI_STRINGS[language]?.[key] || UI_STRINGS.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languageMeta, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
