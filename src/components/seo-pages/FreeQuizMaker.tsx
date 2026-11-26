import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Check, Award, ArrowRight, HelpCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function FreeQuizMaker() {
  const navigate = useNavigate();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const quizQuestions = [
    {
      id: 1,
      q: "Which state of matter has a definite volume but no definite shape?",
      options: ["Solid", "Liquid", "Gas", "Plasma"],
      answer: 1,
      explain: "Liquids have a definite volume because their particles are close together, but no definite shape because particles can slide past each other."
    },
    {
      id: 2,
      q: "What is the primary function of mitochondria in eukaryotic cells?",
      options: ["Protein synthesis", "DNA replication", "ATP energy production", "Waste elimination"],
      answer: 2,
      explain: "Mitochondria are the powerhouses of the cell, generating most of the chemical energy needed to power the cell's biochemical reactions."
    }
  ];

  const handleSelectOption = (qId: number, optIdx: number) => {
    if (showResults) return;
    setSelectedAnswers({ ...selectedAnswers, [qId]: optIdx });
  };

  const score = quizQuestions.reduce((acc, q) => {
    return acc + (selectedAnswers[q.id] === q.answer ? 1 : 0);
  }, 0);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is this quiz maker completely free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Learnify provides a completely free quiz maker to help students test their knowledge and mentors generate robust multiple-choice assessments without any licensing fees."
        }
      },
      {
        "@type": "Question",
        "name": "Can I import my own lecture notes or PDF textbooks to generate quizzes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. By logging in and using our advanced AI Quiz Maker, you can upload documents, text prompts, or select specific curricula topics to generate diagnostic exams instantly."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Free Quiz Maker - Build Interactive Quizzes | Learnify"
        description="Create highly interactive and custom quizzes with Learnify's free quiz maker. Build automated multiple-choice tests, export results, and track progress."
        canonicalPath="/free-quiz-maker"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black tracking-widest uppercase mb-6">
              <Award size={14} /> FREE ASSESSMENT ENGINE
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Design Perfect Tests Instantly with our <span className="text-[#f4b400]">Free Quiz Maker</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              The Learnify free quiz maker enables educators, students, and lifelong learners to construct, run, and analyze multiple-choice evaluations seamlessly. Build knowledge retention and ace your classes.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                Start Designing Free Quizzes
              </button>
              <a 
                href="#interactive-demo"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Try Interactive Demo
              </a>
            </div>
          </div>
        </section>

        {/* Content Section (Word Depth 400-600 words) */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is the Learnify Free Quiz Maker?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>free quiz maker</strong> is a high-frequency, responsive testing suite engineered specifically to maximize educational recall. It allows anyone to input learning materials and output structural multiple-choice tests, complete with detailed scientific rationales. Whether you are preparing for standard high school STEM examinations or designing higher-education medical school boards, this system handles assessment scaling effortlessly.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By bypassing complex assessment software setup, we have put professional educational design into a simple, beautiful interface. When coupled with our <Link to="/ai-quiz-maker" className="text-primary hover:underline">AI Quiz Maker</Link>, the platform becomes fully autonomous, constructing highly targeted assessments directly from raw textbooks.
              </p>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Who is This Free Testing Solution For?</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                This diagnostic toolkit is custom-built for three primary user profiles seeking streamlined academic feedback loops:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Empowered Students:</strong> Active recall has been proven to outperform passive reading. Students use our free quiz maker to test themselves on complex chemistry formulas, historical events, and coding algorithms to identify knowledge gaps before exam day.</li>
                <li><strong>STEM Instructors & Mentors:</strong> Teachers save dozens of hours by instantly drafting structured homework sheets and weekly pop quizzes. The system's interface enables quick exports and digital sharing.</li>
                <li><strong>Lifelong Learners:</strong> Professionals verifying technical certifications or upskilling in computer science use this engine to benchmark their theoretical retention.</li>
              </ul>
            </article>

            {/* Interactive Demo Block */}
            <div id="interactive-demo" className="my-16 p-8 rounded-3xl border-2 border-primary/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                <HelpCircle className="text-primary" /> Interactive Mini-Quiz Demo
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                Experience the diagnostic interface built into our platform. Select your answers below and check your score!
              </p>

              <div className="space-y-8">
                {quizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="space-y-3">
                    <p className="font-bold text-foreground">{qIdx + 1}. {q.q}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = selectedAnswers[q.id] === oIdx;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleSelectOption(q.id, oIdx)}
                            className={`p-4 rounded-xl border text-left text-sm font-semibold transition-all ${
                              isSelected 
                                ? 'bg-primary border-primary text-primary-foreground shadow-md' 
                                : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {showResults && (
                      <div className="p-3 rounded-xl bg-muted text-xs font-medium text-muted-foreground mt-2 border-l-4 border-primary">
                        <span className="font-bold text-foreground">Explanation:</span> {q.explain}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                {!showResults ? (
                  <button
                    onClick={() => setShowResults(true)}
                    disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    Submit Answers
                  </button>
                ) : (
                  <div className="flex items-center gap-4 w-full justify-between">
                    <p className="font-bold text-sm">
                      Your Score: <span className="text-primary font-black text-lg">{score}/{quizQuestions.length}</span>
                    </p>
                    <button
                      onClick={() => {
                        setSelectedAnswers({});
                        setShowResults(false);
                      }}
                      className="text-xs uppercase font-black text-primary hover:underline"
                    >
                      Reset Quiz
                    </button>
                  </div>
                )}
              </div>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Concrete Examples of Active Learning</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To maximize search-intent alignment, here are real-world application examples demonstrating how users configure our free quiz maker:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
                <div className="p-6 border border-border rounded-2xl bg-muted/20">
                  <h4 className="font-black uppercase text-sm mb-2 text-primary">1. Organic Chemistry Syntheses</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pre-med candidates construct quizzes reviewing functional group additions (nucleophiles, electrophiles). Testing reactions dynamically dramatically reduces overall study time.
                  </p>
                </div>
                <div className="p-6 border border-border rounded-2xl bg-muted/20">
                  <h4 className="font-black uppercase text-sm mb-2 text-primary">2. Python Syntax Bootcamps</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Coding instructors generate quick diagnostics testing students on loop constructs and slice notations, feeding directly into our <Link to="/test-generator" className="text-primary hover:underline">Test Generator</Link> pipelines.
                  </p>
                </div>
              </div>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">In-Context Tool Cross-Linking</h3>
              <p className="text-muted-foreground leading-relaxed">
                For complete mastery of complex subjects, a quiz is only the first step. Pair your quiz results with our virtual simulation engines. After building standard MCQ sheets, test your physical theories in our <Link to="/physics-lab" className="text-primary hover:underline">Virtual Physics Lab</Link>, or practice key chemical reactions in the <Link to="/chemistry-lab" className="text-primary hover:underline">Virtual Chemistry Lab</Link> to consolidate your practical understanding.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Ready to Unlock Full AI Potential?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Create an account now to upload documents and generate massive test banks with artificial intelligence.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-primary/20 transition-all flex items-center gap-2 mx-auto"
            >
              Get Started Free <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
