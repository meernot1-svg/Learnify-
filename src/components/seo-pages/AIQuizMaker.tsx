import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Check, Play, ChevronRight, HelpCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function AIQuizMaker() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<any | null>(null);

  const mockAIService = (topic: string) => {
    const database: Record<string, any> = {
      'photosynthesis': {
        q: "What are the primary outputs of the light-dependent reactions in photosynthesis?",
        options: ["Glucose and G3P", "Oxygen, ATP, and NADPH", "Carbon dioxide and Rubisco", "Water and NADP+"],
        answer: 1,
        explain: "The light reactions capture solar energy to split water, yielding Oxygen as a waste product, and storing chemical energy in ATP and NADPH for use in the Calvin Cycle."
      },
      'newton': {
        q: "Which of Newton's laws describes the relationship between force, mass, and acceleration (F = ma)?",
        options: ["First Law", "Second Law", "Third Law", "Law of Gravitation"],
        answer: 1,
        explain: "Newton's Second Law state that the acceleration of an object depends on its mass and the net external force acting on it: Force equals mass times acceleration."
      },
      'mitosis': {
        q: "During which phase of mitosis do sister chromatids align along the cell's equatorial plane?",
        options: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
        answer: 1,
        explain: "During Metaphase, chromosomes attach to spindle fibers and align perfectly along the metaphase plate in the center of the cell."
      }
    };

    const cleanTopic = topic.toLowerCase().trim();
    if (cleanTopic.includes('photo') || cleanTopic.includes('plant') || cleanTopic.includes('light')) {
      return database.photosynthesis;
    } else if (cleanTopic.includes('newton') || cleanTopic.includes('force') || cleanTopic.includes('physic')) {
      return database.newton;
    } else {
      return database.mitosis; // Default fallback
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedQuestion(null);

    setTimeout(() => {
      const result = mockAIService(prompt);
      setGeneratedQuestion(result);
      setIsGenerating(false);
    }, 1500);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does the AI quiz maker extract questions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Learnify AI quiz maker reads uploaded text or PDFs and utilizes advanced generative language models (like Gemini) to extract primary concepts, creating structured multiple-choice questions with educational rationales."
        }
      },
      {
        "@type": "Question",
        "name": "Can I export these questions to other quiz platforms?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, once inside the application dashboard, you can export your fully customized AI-generated quizzes as PDF documents, JSON tables, or formatted text cards."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="AI Quiz Maker - Generate Exams with Intelligence | Learnify"
        description="Save hours of studying with the Learnify AI quiz maker. Instantly convert lectures, notes, and PDFs into customized multiple-choice tests with step-by-step rationales."
        canonicalPath="/ai-quiz-maker"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-purple-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-xs font-black tracking-widest uppercase mb-6">
              <Sparkles size={14} className="animate-pulse" /> REVOLUTIONARY EDUCATION
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Transform Notes into Tests with our <span className="text-purple-500">AI Quiz Maker</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Stop reading the same page over and over. Paste your notes or write a topic, and watch our state-of-the-art AI quiz maker build dynamic assessments with detailed, professional solutions in seconds.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-purple-500/20"
              >
                Access Full AI Suite
              </button>
              <a 
                href="#ai-playground"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Launch Playground Demo
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is the Learnify AI Quiz Maker?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>ai quiz maker</strong> is an automated educational companion designed to eliminate study friction. Instead of wasting time manually crafting index cards or guessing what will appear on final tests, our algorithm leverages state-of-the-art deep language parsing to extract core cognitive nodes from your materials.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By uploading lectures, syllabus PDFs, or typing a general query, you get immediate access to professional-tier multiple choice questions. This platform isn't just about outputting questions; it's about providing deep explanatory pathways that explain *why* an answer is correct. This methodology aligns directly with the highest standards of cognitive learning science.
              </p>
            </article>

            {/* Interactive Playground Block */}
            <div id="ai-playground" className="my-16 p-8 rounded-3xl border-2 border-purple-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Brain className="text-purple-500" /> AI Question Generator Simulator
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Type an academic topic (e.g., <strong>Photosynthesis</strong>, <strong>Newtonian Physics</strong>, or <strong>Mitosis</strong>) below to simulate our lightning-fast AI extraction.
              </p>

              <form onSubmit={handleGenerate} className="flex gap-3 mb-8">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a STEM topic..."
                  className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  {isGenerating ? 'Analyzing...' : 'Generate'} <ChevronRight size={14} />
                </button>
              </form>

              <AnimatePresence mode="wait">
                {isGenerating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-10"
                  >
                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs uppercase font-black tracking-widest text-muted-foreground">Synthesizing learning nodes...</p>
                  </motion.div>
                )}

                {generatedQuestion && !isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 border border-purple-500/30 p-6 rounded-2xl bg-purple-500/5"
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-500 text-[10px] font-black uppercase tracking-widest">
                      Question Derived Successfully
                    </div>
                    <p className="font-bold text-foreground text-sm sm:text-base">{generatedQuestion.q}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {generatedQuestion.options.map((opt: string, idx: number) => {
                        const isCorrect = idx === generatedQuestion.answer;
                        return (
                          <div 
                            key={opt}
                            className={`p-4 rounded-xl text-left text-xs sm:text-sm font-semibold border ${
                              isCorrect 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                                : 'bg-muted/30 border-border text-muted-foreground'
                            }`}
                          >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt} {isCorrect && '✓'}
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-xs font-medium text-muted-foreground border-l-4 border-purple-500 leading-relaxed">
                      <span className="font-bold text-foreground">Explanation:</span> {generatedQuestion.explain}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">How Does the AI Quiz Maker Save Study Time?</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Traditional exam preparation involves reading chapters multiple times. Psychologists call this passive exposure, which has a very low learning index. Our smart <strong>ai quiz maker</strong> forces active engagement through spaced retrieval practice. Here is how the system executes under the hood:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 text-center">
                <div className="p-6 border border-border rounded-2xl bg-card">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-black mx-auto mb-4">1</div>
                  <h4 className="font-black uppercase text-xs mb-2">Structure Parsing</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">AI reads raw study guides, isolating key scientific principles, equations, and vocab.</p>
                </div>
                <div className="p-6 border border-border rounded-2xl bg-card">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-black mx-auto mb-4">2</div>
                  <h4 className="font-black uppercase text-xs mb-2">Distractor Design</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">The algorithm builds realistic wrong choices to test subtle edge cases of the theory.</p>
                </div>
                <div className="p-6 border border-border rounded-2xl bg-card">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-black mx-auto mb-4">3</div>
                  <h4 className="font-black uppercase text-xs mb-2">Feedback Synthesis</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Every question receives a full, robust explanation so you learn as you test.</p>
                </div>
              </div>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Synergetic Learning</h3>
              <p className="text-muted-foreground leading-relaxed">
                Once the AI quiz maker generates your test bank, you can easily save them as digital cards inside our <Link to="/flashcards" className="text-primary hover:underline">Interactive Flashcards</Link> page. If some concepts remain elusive, paste them into our <Link to="/ai-explainer" className="text-primary hover:underline">AI Explainer</Link> to get deep, visual breakdowns with zero academic jargon.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Optimize Your Grades Today</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Create your account to unlock continuous AI generation and start acing your curricula.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-purple-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              Sign Up Now <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
