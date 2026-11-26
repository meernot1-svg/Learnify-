import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Zap, Compass, Check, ArrowRight, HelpCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function AIExplainer() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<any | null>(null);

  const mockAnalogyService = (term: string) => {
    const database: Record<string, any> = {
      'entanglement': {
        title: "Quantum Entanglement",
        analogy: "Imagine you have a pair of magical shoes, placed into separate boxes. You keep one shoe and send the other to your friend in Tokyo. The moment you open your box and see you have the LEFT shoe, you instantly know your friend has the RIGHT shoe—even though they are thousands of miles away. In quantum physics, entangled particles behave exactly like these magical shoes, instantly sharing their states across infinite distances.",
        simplified: "Particles that are paired up share information instantly. Measuring one determines the state of the other immediately, regardless of physical separation."
      },
      'blockchain': {
        title: "Blockchain Technology",
        analogy: "Think of blockchain like a shared Google Spreadsheet. Everyone in the group has editing rights, but instead of one person hosting the spreadsheet, copies of it exist on everyone's computer. Whenever anyone adds a new row (a transaction), everyone's computer has to verify that the row makes sense. Once approved, the row is locked permanently and cannot be deleted or altered.",
        simplified: "A distributed, secure digital ledger that records transactions across many computers so that the record cannot be altered retroactively."
      },
      'mitosis': {
        title: "Mitosis (Cell Division)",
        analogy: "Imagine an architect making an exact blueprint copy of a highly detailed building, then building a second, identical structure next to it. Before building, she duplicates every document, carefully separates the tools, and establishes a perfect partition. Once complete, two fully independent, functioning buildings stand where there was once only one.",
        simplified: "The process where a single cell divides into two identical daughter cells, duplicating its DNA precisely to pass on genetic data."
      }
    };

    const cleanTerm = term.toLowerCase().trim();
    if (cleanTerm.includes('quantum') || cleanTerm.includes('entangle') || cleanTerm.includes('physic')) {
      return database.entanglement;
    } else if (cleanTerm.includes('block') || cleanTerm.includes('crypto') || cleanTerm.includes('chain')) {
      return database.blockchain;
    } else {
      return database.mitosis; // Default fallback
    }
  };

  const handleExplain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsExplaining(true);
    setExplanation(null);

    setTimeout(() => {
      const result = mockAnalogyService(topic);
      setExplanation(result);
      setIsExplaining(false);
    }, 1500);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does the AI Explainer simplify complex ideas?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Learnify AI Explainer translates dense scientific equations and concepts into digestible visual analogies, making advanced science topics intuitive for students of all levels."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use the explainer for humanities or only STEM?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "While designed with a strong focus on complex STEM disciplines, our underlying AI engine easily translates and simplifies topics in history, law, linguistics, and finance."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="AI Explainer - Simplify Hard Science Concepts | Learnify"
        description="Decode dense scientific terms, mathematical proofs, and chemistry reactions instantly. The Learnify AI explainer translates complex topics into intuitive analogies."
        canonicalPath="/ai-explainer"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-blue-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-black tracking-widest uppercase mb-6">
              <Compass size={14} className="animate-spin" /> INTUITION ENGINE
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Demystify Complex Theories with our <span className="text-blue-500">AI Explainer</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Struggling with dense textbooks or convoluted scientific proofs? Paste any technical term into our smart AI explainer and receive a crystal-clear, intuitive analogy that makes the concept click instantly.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-500/20"
              >
                Access Full Explainer App
              </button>
              <a 
                href="#explainer-demo"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Try Analogy Sandbox
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is the Learnify AI Explainer?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>ai explainer</strong> is a cognitive bridge built to dismantle academic intimidation. In STEM fields, concepts are frequently taught using highly clinical notation that ignores human cognitive architecture. Our system reverses this by anchoring advanced concepts inside familiar, real-world schemas.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By processing raw text inputs, the AI parses complex terminology and extracts the fundamental relationship. It then synthesizes customized, highly visual analogies that map directly to the brain's existing mental pathways. This strategy drastically lowers cognitive load and dramatically improves long-term recall metrics.
              </p>
            </article>

            {/* Interactive Demo Block */}
            <div id="explainer-demo" className="my-16 p-8 rounded-3xl border-2 border-blue-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Zap className="text-blue-500" /> Dynamic Analogy Generator
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Type an advanced term (e.g., <strong>Quantum Entanglement</strong>, <strong>Blockchain</strong>, or <strong>Mitosis</strong>) to see our simplified translation engine in action.
              </p>

              <form onSubmit={handleExplain} className="flex gap-3 mb-8">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a complex academic topic..."
                  className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isExplaining || !topic.trim()}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  {isExplaining ? 'Simplifying...' : 'Explain'} <ArrowRight size={14} />
                </button>
              </form>

              <AnimatePresence mode="wait">
                {isExplaining && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-10"
                  >
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs uppercase font-black tracking-widest text-muted-foreground">Formulating analogy...</p>
                  </motion.div>
                )}

                {explanation && !isExplaining && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 border border-blue-500/30 p-6 rounded-2xl bg-blue-500/5"
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                      Concept Translated
                    </div>
                    <h4 className="font-black text-lg text-foreground">{explanation.title}</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 block mb-1">Visual Analogy:</span>
                        <p className="text-sm text-muted-foreground italic leading-relaxed">"{explanation.analogy}"</p>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-1">Literal Definition:</span>
                        <p className="text-sm font-semibold text-foreground leading-relaxed">{explanation.simplified}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Why Learning Through Analogies Works</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                In cognitive psychology, learning is defined as the process of integrating new data into existing neural frameworks. When students try to memorize advanced chemistry formulas without context, their brains fail to find anchors, leading to rapid forgetting.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our <strong>ai explainer</strong> resolves this by establishing high-integrity analogies. By mapping an abstract concept (like particle spins) to a tangible physical object (like spinning tops or custom colored cards), the student immediately visualizes the structure. Once the foundation is solid, layering technical definitions and mathematical formulas becomes significantly easier and highly stable.
              </p>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Explore More Interactive Features</h3>
              <p className="text-muted-foreground leading-relaxed">
                After using the AI Explainer to grasp the core concepts, evaluate your understanding on our <Link to="/free-quiz-maker" className="text-primary hover:underline">Free Quiz Maker</Link> page. If you are preparing for standard school exams, leverage our specialized <Link to="/test-generator" className="text-primary hover:underline">Test Generator</Link> to create fully structured mock assessments directly aligned with your curriculum.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Start Simplifying STEM Today</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Create your free account to access infinite visual explanations, formula guides, and structured learning tracks.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2 mx-auto"
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
