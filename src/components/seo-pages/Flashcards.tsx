import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, RefreshCw, Layers, Check, Plus, HelpCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function Flashcards() {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const sampleDecks = [
    {
      front: "What primary chemical compound comprises plant cell walls?",
      back: "Cellulose (a complex carbohydrate consisting of 3,000 or more glucose units)."
    },
    {
      front: "What is Newton's First Law of Motion often called?",
      back: "The Law of Inertia (an object at rest stays at rest unless acted upon by an external force)."
    },
    {
      front: "What is the thermodynamic value representing a system's thermal disorder?",
      back: "Entropy (often denoted by the symbol S)."
    }
  ];

  const handleNextCard = (mastered: boolean) => {
    if (mastered) {
      setMasteredCount(prev => prev + 1);
    } else {
      setReviewCount(prev => prev + 1);
    }
    setIsFlipped(false);
    setTimeout(() => {
      setDeckIndex((prev) => (prev + 1) % sampleDecks.length);
    }, 200);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does spaced repetition make studying more effective?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Spaced repetition algorithms schedule cards for review right at the moment you are about to forget them, flattening the forgetting curve and boosting neural consolidation."
        }
      },
      {
        "@type": "Question",
        "name": "Can I share my decks with classmates on Learnify?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Registered mentors and student study groups can collaborate, share custom decks, and review collective performance analytics."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Interactive Flashcards - Ace Active Recall | Learnify"
        description="Consolidate complex formulas, vocabulary, and coding standards with Learnify interactive flashcards. Create custom decks with spaced repetition algorithms."
        canonicalPath="/flashcards"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-rose-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-500 text-xs font-black tracking-widest uppercase mb-6">
              <Layers size={14} /> ACTIVE RECALL SYSTEM
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Supercharge Memorization with our <span className="text-rose-500">Flashcards</span> Engine
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Stop passively rereading notes. Engage active recall and spaced repetition with the Learnify smart flashcards engine. Lock complex scientific facts, languages, and technical formulas into long-term memory.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-rose-500/20"
              >
                Access Flashcards Deck
              </button>
              <a 
                href="#flashcards-sandbox"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Try Interactive Cards
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What makes the Learnify Flashcards Engine Unique?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>flashcards</strong> engine is a custom-coded learning framework rooted directly in neuroscience. Passive learning (e.g., highlighting notes) leaves memory traces fragile and transient. Our interactive cards exploit two powerful mechanisms: active recall and structured spaced-repetition schedules.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By presenting a stimulus (the front of a card) and forcing the neural network of the brain to actively retrieve the associated answer (the back), we strengthen synaptic connections. This process, known as consolidation, is enhanced by scheduling card reviews right at the moment of near-forgetting.
              </p>
            </article>

            {/* Interactive Flashcard Block */}
            <div id="flashcards-sandbox" className="my-16 p-8 rounded-3xl border-2 border-rose-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <RefreshCw className="text-rose-500 animate-spin" style={{ animationDuration: '6s' }} /> Interactive Card Flipper
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                Click the card below to flip and reveal the biological or thermodynamic answer. Gauge your retention!
              </p>

              <div className="flex flex-col items-center justify-center">
                {/* 3D Flip Card Container */}
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full max-w-md h-64 cursor-pointer relative group perspective-1000"
                >
                  <div className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front of Card */}
                    <div className="absolute inset-0 bg-muted/50 border-2 border-border rounded-2xl p-8 flex flex-col justify-between backface-hidden group-hover:border-rose-500/30 transition-colors">
                      <div className="text-[10px] font-black uppercase tracking-widest text-rose-500">Front of Card • Card {deckIndex + 1} of 3</div>
                      <p className="text-base sm:text-lg font-black text-foreground text-center my-auto leading-relaxed">
                        {sampleDecks[deckIndex].front}
                      </p>
                      <div className="text-[10px] uppercase font-black text-center text-muted-foreground/50">Click to Flip & Reveal</div>
                    </div>

                    {/* Back of Card */}
                    <div className="absolute inset-0 bg-rose-500/5 border-2 border-rose-500/40 rounded-2xl p-8 flex flex-col justify-between backface-hidden rotate-y-180">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Back of Card • Explanation</div>
                      <p className="text-sm sm:text-base font-bold text-foreground text-center my-auto leading-relaxed">
                        {sampleDecks[deckIndex].back}
                      </p>
                      <div className="text-[10px] uppercase font-black text-center text-muted-foreground/50">Click to Flip Back</div>
                    </div>
                  </div>
                </div>

                {/* Leitner Feedback Buttons */}
                <div className="flex gap-4 mt-8 w-full max-w-md">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextCard(false);
                    }}
                    className="flex-1 py-3 px-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Still Hard (Review)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextCard(true);
                    }}
                    className="flex-1 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Known (Mastered)
                  </button>
                </div>

                {/* Score Summary */}
                <div className="mt-6 flex gap-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div>Mastered: <span className="text-emerald-500 font-black">{masteredCount}</span></div>
                  <div>To Review: <span className="text-red-500 font-black">{reviewCount}</span></div>
                </div>
              </div>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Leveraging Spaced Repetition (The Leitner System)</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Within our full dashboard application, your decks are sorted automatically into dynamic review buckets. Here is how our Leitner system algorithm organizes study intervals:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="p-6 border border-border rounded-xl bg-card">
                  <h4 className="font-black text-xs uppercase text-red-500 mb-2">Box 1: Daily Review</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Newly created decks or cards you marked as "Hard". Kept on a 24-hour retention check.</p>
                </div>
                <div className="p-6 border border-border rounded-xl bg-card">
                  <h4 className="font-black text-xs uppercase text-amber-500 mb-2">Box 2: Every 3 Days</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Cards you answered correctly once. Interval expands to minimize visual congestion.</p>
                </div>
                <div className="p-6 border border-border rounded-xl bg-card">
                  <h4 className="font-black text-xs uppercase text-emerald-500 mb-2">Box 3: Weekly Review</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Cards you confidently know. Locked into stable long-term memory structures.</p>
                </div>
              </div>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Explore More Assessment Engines</h3>
              <p className="text-muted-foreground leading-relaxed">
                Want to expand your active recall beyond flashcards? Create fully interactive exams on our <Link to="/free-quiz-maker" className="text-primary hover:underline">Free Quiz Maker</Link> page, or upload text transcripts to our <Link to="/ai-quiz-maker" className="text-primary hover:underline">AI Quiz Maker</Link> to generate rich, randomized diagnostic evaluations automatically.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Create Your Custom Decks Now</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Log in to construct infinite custom decks, upload csv guides, and track spaced repetition metrics securely.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-rose-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              Start Studying Free <Check size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
