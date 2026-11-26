import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Sliders, CheckCircle, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function TestGenerator() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('Kinematics');
  const [format, setFormat] = useState('mcq');
  const [numQuestions, setNumQuestions] = useState('10');
  const [blueprint, setBlueprint] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBlueprint = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setBlueprint(null);

    setTimeout(() => {
      setBlueprint({
        title: `Comprehensive Examination: ${topic}`,
        structure: format === 'mcq' ? 'Multiple Choice (MCQ) Format' : 'Structured Written Answers',
        duration: format === 'mcq' ? `${parseInt(numQuestions) * 1.5} Minutes` : `${parseInt(numQuestions) * 5} Minutes`,
        sampleQ: format === 'mcq' 
          ? `Sample 1: An object is dropped from a height of 20 meters. Neglecting air resistance, what is its velocity right before impact? (g = 9.8 m/s²)`
          : `Sample 1: State the relationship between velocity and acceleration. Derive the first equation of motion under constant acceleration.`,
        gradingKey: format === 'mcq' ? 'Automated Key (A/B/C/D) Included' : 'Rubric & Step-by-Step Rationale Included',
        totalQuestions: numQuestions
      });
      setIsGenerating(false);
    }, 1200);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What formats can the test generator export to?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Learnify test generator supports standard PDF exports, formatted TXT files for manual printing, and raw JSON arrays that can be imported directly into virtual learning platforms."
        }
      },
      {
        "@type": "Question",
        "name": "Can I save my generated tests to reuse them next semester?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Once you log into the Learnify workspace, all generated tests, question banks, and keys are securely persisted in your personal library for future iterations."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Test Generator - Professional Exams & Worksheets | Learnify"
        description="Build highly professional examinations, quizzes, and worksheets with the Learnify test generator. Get perfectly formatted PDFs with structured answer keys."
        canonicalPath="/test-generator"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black tracking-widest uppercase mb-6">
              <FileText size={14} /> TEACHING EFFICIENCY
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Generate Printable Exams Instantly with our <span className="text-indigo-500">Test Generator</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Save hours of tedious grading. Our professional-tier test generator allows educators, tutors, and self-directed students to construct beautifully formatted examinations with detailed keys in seconds.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20"
              >
                Access Test Generator
              </button>
              <a 
                href="#blueprint-maker"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Configure Test Blueprint
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is the Learnify Test Generator?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>test generator</strong> is a robust educational logistics tool designed to automate assessment generation. For decades, teachers have spent late nights drafting unique quizzes, worrying about spacing, grading rubrics, and formatting tables. This engine standardizes the output, producing clean, beautifully structured tests following modern curriculum models.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By allowing you to customize subject, difficulty, and question depth, the test generator guarantees unique assessments every time. Whether you need 50 comprehensive multiple-choice questions for a college midterm or a quick 5-question diagnostic worksheet, the interface manages the margins, numbering, and structure dynamically.
              </p>
            </article>

            {/* Interactive Exam Blueprint Block */}
            <div id="blueprint-maker" className="my-16 p-8 rounded-3xl border-2 border-indigo-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Sliders className="text-indigo-500" /> Assessment Blueprint Sandbox
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Adjust the settings below to construct a sample exam blueprint instantly.
              </p>

              <form onSubmit={handleGenerateBlueprint} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Subject/Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Question Type</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="structured">Structured Theory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Length</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="sm:col-span-3 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all mt-2"
                >
                  {isGenerating ? 'Drafting Blueprint...' : 'Draft Exam Blueprint'}
                </button>
              </form>

              <AnimatePresence mode="wait">
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs uppercase font-black tracking-widest text-muted-foreground">Configuring margins and rubrics...</p>
                  </div>
                )}

                {blueprint && !isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 border border-indigo-500/30 rounded-2xl bg-indigo-500/5 font-mono text-xs text-muted-foreground space-y-4"
                  >
                    <div className="text-center pb-4 border-b border-border/50 text-foreground font-bold">
                      <h4 className="text-base font-black uppercase tracking-tight">{blueprint.title}</h4>
                      <p className="text-[10px] opacity-60 uppercase tracking-wider">Learnify Assessment Node • Confidential</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold text-foreground">STRUCTURE:</span> {blueprint.structure}
                      </div>
                      <div>
                        <span className="font-bold text-foreground">ALLOCATED TIME:</span> {blueprint.duration}
                      </div>
                      <div>
                        <span className="font-bold text-foreground">TOTAL ITEMS:</span> {blueprint.totalQuestions}
                      </div>
                      <div>
                        <span className="font-bold text-foreground">GRADING MATRIX:</span> {blueprint.gradingKey}
                      </div>
                    </div>
                    <div className="p-4 rounded bg-muted/60 text-[11px] leading-relaxed text-foreground/80 border-l-4 border-indigo-500">
                      <span className="font-bold text-foreground">BLUEPRINT PREVIEW:</span><br/>
                      {blueprint.sampleQ}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Streamline Classroom Operations</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify test generator is built with professional layouts to allow seamless physical printing. Here is how our templates conform to global testing metrics:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Dynamic Difficulty Alignment:</strong> Set proportional difficulty parameters (e.g. 40% Basic, 40% Intermediate, 20% Challenge) to construct well-rounded evaluations.</li>
                <li><strong>Clean Spacing Layouts:</strong> No overlap. Structured sheets leave comfortable white space for student work and calculations.</li>
                <li><strong>Comprehensive Answer Sheets:</strong> A standalone answer key page detailing the correct option, grading rubric, and full conceptual explanation is included automatically.</li>
              </ul>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Cross-Linking Companion Features</h3>
              <p className="text-muted-foreground leading-relaxed">
                If your test generator results highlight gaps in subject memorization, create a set of digital aids on our <Link to="/flashcards" className="text-primary hover:underline">Interactive Flashcards</Link> page. For instant AI-powered exam creation, feed your text notes directly to our autonomous <Link to="/ai-quiz-maker" className="text-primary hover:underline">AI Quiz Maker</Link> tool to expedite test development.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Empower Your Teaching Today</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Log in to download complete printable assessments, custom homework assignments, and answer guides in PDF format.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              Start Generating Exams <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
