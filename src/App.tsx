/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { LanguageProvider } from './hooks/useLanguage';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Registration from './components/Registration';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SubjectView from './components/SubjectView';
import AIChat from './components/AIChat';
import MCQProvider from './components/MCQProvider';
import Explainer from './components/Explainer';
import SindhiVoiceExplainer from './components/SindhiVoiceExplainer';
import MobileNavigation from './components/MobileNavigation';
import AdminPanel from './components/AdminPanel';
import LearnLabHub from './components/LearnLabHub';

// SEO and Public Pages
import FreeQuizMaker from './components/seo-pages/FreeQuizMaker';
import AIQuizMaker from './components/seo-pages/AIQuizMaker';
import AIExplainer from './components/seo-pages/AIExplainer';
import TestGenerator from './components/seo-pages/TestGenerator';
import Flashcards from './components/seo-pages/Flashcards';
import ChemistryLab from './components/seo-pages/ChemistryLab';
import PhysicsLab from './components/seo-pages/PhysicsLab';
import StemMentoring from './components/seo-pages/StemMentoring';

// Legal & Info Pages
import PrivacyPolicy from './components/seo-pages/PrivacyPolicy';
import TermsOfService from './components/seo-pages/TermsOfService';
import AboutUs from './components/seo-pages/AboutUs';
import ContactUs from './components/seo-pages/ContactUs';

// Blog
import BlogIndex from './components/seo-pages/BlogIndex';
import BlogDetail from './components/seo-pages/BlogDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return <Navigate to="/registration" />;

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isMentorVerified } = useAuth();
  const showSidebar = profile?.role !== 'Mentor' || isMentorVerified;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden transition-colors duration-300 relative">
      {showSidebar && <Sidebar />}
      {showSidebar && <MobileNavigation />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-10 md:pb-10 bg-muted/5">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/registration" element={<PageWrapper><Registration /></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><AdminPanel /></PageWrapper>} />
        <Route path="/anatomy-3d" element={<Navigate to="/subject/biology" replace />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><Dashboard /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/learn-hub" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><LearnLabHub /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/subject/:id" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><SubjectView /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/ai-chat" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><AIChat /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/mcqs" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><MCQProvider /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/explainer" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><Explainer /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/sindhi-voice-explainer" element={
          <ProtectedRoute>
            <AppLayout><PageWrapper><SindhiVoiceExplainer /></PageWrapper></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/predictor" element={<Navigate to="/sindhi-voice-explainer" replace />} />

        {/* Public SEO Feature Pages */}
        <Route path="/free-quiz-maker" element={<PageWrapper><FreeQuizMaker /></PageWrapper>} />
        <Route path="/ai-quiz-maker" element={<PageWrapper><AIQuizMaker /></PageWrapper>} />
        <Route path="/ai-explainer" element={<PageWrapper><AIExplainer /></PageWrapper>} />
        <Route path="/test-generator" element={<PageWrapper><TestGenerator /></PageWrapper>} />
        <Route path="/flashcards" element={<PageWrapper><Flashcards /></PageWrapper>} />
        <Route path="/chemistry-lab" element={<PageWrapper><ChemistryLab /></PageWrapper>} />
        <Route path="/physics-lab" element={<PageWrapper><PhysicsLab /></PageWrapper>} />
        <Route path="/stem-mentoring" element={<PageWrapper><StemMentoring /></PageWrapper>} />

        {/* Info & Legal Pages */}
        <Route path="/privacy-policy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/terms-of-service" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/about-us" element={<PageWrapper><AboutUs /></PageWrapper>} />
        <Route path="/contact-us" element={<PageWrapper><ContactUs /></PageWrapper>} />

        {/* Academic Blog */}
        <Route path="/blog" element={<PageWrapper><BlogIndex /></PageWrapper>} />
        <Route path="/blog/:slug" element={<PageWrapper><BlogDetail /></PageWrapper>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
