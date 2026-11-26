import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { FlaskConical, Beaker, Check, Shield, Zap, HelpCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function ChemistryLab() {
  const navigate = useNavigate();
  const [drops, setDrops] = useState(0);

  // Titration mapping
  // 0-4 drops: pH 1 to 6 (Clear)
  // 5 drops: pH 7 (Slightly pink/neutral)
  // 6+ drops: pH 9 to 14 (Vibrant Pink)
  const getPH = () => {
    if (drops === 0) return 1.0;
    if (drops === 1) return 2.1;
    if (drops === 2) return 3.5;
    if (drops === 3) return 5.2;
    if (drops === 4) return 6.4;
    if (drops === 5) return 7.0;
    if (drops === 6) return 8.8;
    if (drops === 7) return 10.5;
    return Math.min(14.0, 11.0 + (drops - 7) * 0.5);
  };

  const getBeakerColor = () => {
    const ph = getPH();
    if (ph < 6.5) return 'rgba(255, 255, 255, 0.4)'; // Clear/Watery
    if (ph >= 6.5 && ph <= 7.5) return 'rgba(244, 63, 94, 0.2)'; // Very faint pink
    return 'rgba(244, 63, 94, 0.8)'; // Intense phenolphthalein pink
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Are the chemical thermodynamics physically accurate?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! The Learnify chemistry simulation equations calculate stoichiometric ratios, kinetic activation energy, and gas laws dynamically, replicating real-world thermodynamics."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use the lab to practice high school lab manuals?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. Tutors and students use our labs to conduct prep titrations, balance equations, and model atomic structures before stepping into physical spaces."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Virtual Chemistry Lab - Interactive Molecular Reactions | Learnify"
        description="Run acid-base titrations, balance stoichiometric equations, and witness high-fidelity molecular bonds safely inside the Learnify virtual chemistry lab."
        canonicalPath="/chemistry-lab"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black tracking-widest uppercase mb-6">
              <FlaskConical size={14} className="animate-bounce" /> HIGH-FIDELITY SIMULATIONS
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Witness Molecular Bonding in our <span className="text-emerald-500">Chemistry Lab</span> Sandbox
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Conduct volatile experiments with absolute safety. The Learnify virtual chemistry lab integrates stoichiometric stoichiometry algorithms, gas pressure dynamics, and pH titration curves into a stunning web sandbox.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
              >
                Launch Virtual Lab
              </button>
              <a 
                href="#titration-simulator"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Perform Titration Demo
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is the Learnify Virtual Chemistry Lab?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>chemistry lab</strong> is a digital playground built to deliver visceral scientific understanding without the risks or material costs of physical glass setups. Standard high school curricula frequently skip tactile laboratory experiments due to safety regulations and budget caps. Our browser-based simulation suite levels the playing field globally.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Using real thermodynamic calculations, the engine models variables like temperature, molecular weights, and reaction enthalpy. Students don't just see a text summary of a reaction—they add reagents, watch heat signatures spike, and observe color transitions dynamically, solidifying core STEM principles.
              </p>
            </article>

            {/* Titration Simulator Block */}
            <div id="titration-simulator" className="my-16 p-8 rounded-3xl border-2 border-emerald-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Beaker className="text-emerald-500 animate-pulse" /> Interactive Acid-Base Titration
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                Simulate adding drops of Sodium Hydroxide (NaOH, basic) to Hydrochloric Acid (HCl, acidic) with Phenolphthalein indicator. Watch the liquid change color as pH rises!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Visual Beaker setup */}
                <div className="flex flex-col items-center justify-center p-6 border border-border/50 rounded-2xl bg-muted/20">
                  <div className="relative w-40 h-52 border-b-8 border-x-4 border-foreground/60 rounded-b-3xl flex items-end justify-center p-2 mb-4">
                    {/* Beaker Markings */}
                    <div className="absolute left-3 top-10 w-4 h-0.5 bg-foreground/25" />
                    <div className="absolute left-3 top-20 w-6 h-0.5 bg-foreground/25" />
                    <div className="absolute left-3 top-30 w-4 h-0.5 bg-foreground/25" />
                    <div className="absolute left-3 top-40 w-6 h-0.5 bg-foreground/25" />
                    
                    {/* Liquid */}
                    <div 
                      className="w-full rounded-b-2xl transition-all duration-500 ease-in-out"
                      style={{ 
                        height: '50%', 
                        backgroundColor: getBeakerColor(),
                        boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.2)'
                      }}
                    />
                  </div>
                  <div className="text-center font-mono text-xs text-muted-foreground">
                    <div>Volume: <span className="text-foreground font-black">50.0 mL</span></div>
                    <div>Phenolphthalein Indicator Active</div>
                  </div>
                </div>

                {/* Controls and Stats */}
                <div className="space-y-6">
                  <div className="space-y-1.5 p-4 bg-muted/40 border border-border rounded-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">Titration Metrics</span>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>Drops Added:</span>
                      <span className="text-foreground font-black text-base">{drops}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>Calculated pH:</span>
                      <span className={`font-black text-lg ${getPH() > 7 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                        {getPH().toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setDrops(prev => prev + 1)}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Add Reagent Drop (+1)
                    </button>
                    <button
                      onClick={() => setDrops(0)}
                      className="px-4 py-4 border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Reset
                    </button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    Note: Watch for the equivalence point at 5 drops (neutral pH 7.0), where the phenolphthalein indicator starts to trigger its chemical shift.
                  </p>
                </div>
              </div>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Key Curricular Experiments Supported</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our full application contains sandbox workspaces designed to mirror standardized laboratory procedures:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Dynamic Periodic Table Analysis:</strong> Explore atomic shells, electronegativity, and ionization potentials through our fully integrated <Link to="/chemistry-lab" className="text-primary hover:underline">Interactive Periodic Table</Link>.</li>
                <li><strong>Gas Law Modeling:</strong> Adjust pressure and temperature toggles to isolate Charles's Law and Boyle's Law.</li>
                <li><strong>Redox Reaction Sandbox:</strong> Conduct galvanic cells modeling, analyzing anode/cathode voltages and electron pathways.</li>
              </ul>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Explore More STEM Tools</h3>
              <p className="text-muted-foreground leading-relaxed">
                Once you master chemical thermodynamics, pivot to thermodynamics and motion in our <Link to="/physics-lab" className="text-primary hover:underline">Virtual Physics Lab</Link>. If you need to verify your vocabulary of organic groups, construct a customized set of cards inside the <Link to="/flashcards" className="text-primary hover:underline">Interactive Flashcards</Link> page.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Experience Zero-Risk Science</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Log in to access our full interactive molecule renderer, custom reaction catalogs, and grading metrics.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              Initialize Lab Session <Shield size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
