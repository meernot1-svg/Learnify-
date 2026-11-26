import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play, RotateCcw, Activity, Shield, ArrowRight, HelpCircle } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function PhysicsLab() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gravity, setGravity] = useState(9.8); // m/s^2
  const [velocity, setVelocity] = useState(50); // m/s
  const [angle, setAngle] = useState(45); // degrees
  const [isSimulating, setIsSimulating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Simulated projectile parameters
  const projectileRef = useRef({
    x: 10,
    y: 240, // Ground level is 240 on 400px canvas
    vx: 0,
    vy: 0,
    time: 0,
    path: [] as { x: number; y: number }[]
  });

  const fireProjectile = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsSimulating(true);
    const angleRad = (angle * Math.PI) / 180;
    
    // Scale velocity down for canvas display
    const speedScale = velocity * 0.25;

    projectileRef.current = {
      x: 10,
      y: 240,
      vx: speedScale * Math.cos(angleRad),
      vy: -speedScale * Math.sin(angleRad),
      time: 0,
      path: [{ x: 10, y: 240 }]
    };

    animate();
  };

  const animate = () => {
    const p = projectileRef.current;
    
    // Physics update step
    // Delta time is small step
    const dt = 0.15;
    p.time += dt;
    
    p.x += p.vx * dt;
    p.vy += (gravity * 0.15) * dt; // Apply gravitational acceleration
    p.y += p.vy * dt;

    p.path.push({ x: p.x, y: p.y });

    // Draw canvas
    draw();

    // Check boundary
    if (p.y < 240 && p.x < 480) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsSimulating(false);
      // Snap to ground
      p.y = 240;
      draw();
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(canvas.width, 240);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Draw trajectory path
    const p = projectileRef.current;
    if (p.path.length > 1) {
      ctx.strokeStyle = '#6366f1'; // Indigo path
      ctx.lineWidth = 2.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p.path[0].x, p.path[0].y);
      for (let i = 1; i < p.path.length; i++) {
        ctx.lineTo(p.path[i].x, p.path[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset
    }

    // Draw projectile circle
    ctx.fillStyle = '#f4b400'; // Yellow projectile
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
    ctx.fill();
  };

  const resetSim = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsSimulating(false);
    projectileRef.current = {
      x: 10,
      y: 240,
      vx: 0,
      vy: 0,
      time: 0,
      path: []
    };
    draw();
  };

  useEffect(() => {
    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Update canvas size on mount/resize
  useEffect(() => {
    draw();
  }, [gravity, velocity, angle]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Can I test different gravitational environments in this physics lab?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! The Learnify virtual physics lab lets you adjust gravity constants (e.g., Earth's 9.8 m/s², Moon's 1.6 m/s², or Mars's 3.7 m/s²) to observe how vectors adapt."
        }
      },
      {
        "@type": "Question",
        "name": "Does this support kinematics, optics, and electric circuit loops?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, our full protected application suite contains extensive modules mapping Ohm's Law circuits, lenses/refraction optics, and mechanical collisions in 2D."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Virtual Physics Lab - Trajectories & Newtonian Math | Learnify"
        description="Run Newtonian vector calculations, model gravity equations, and design electric circuits in real-time inside the Learnify virtual physics lab."
        canonicalPath="/physics-lab"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black tracking-widest uppercase mb-6">
              <Activity size={14} className="animate-pulse" /> THERMODYNAMICS & CINEMATICS
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Explore Kinematic Vectors in our <span className="text-indigo-500">Physics Lab</span> Sandbox
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Eliminate physical limits. The Learnify virtual physics lab features an active 2D kinematics engine, allowing users to alter mass, velocity vectors, and gravity to visualize the laws of nature.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20"
              >
                Access Full Physics Lab
              </button>
              <a 
                href="#trajectory-sandbox"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Launch Cannon Sandbox
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is the Learnify Virtual Physics Lab?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>physics lab</strong> is an interactive modeling engine designed to convert dry kinematic equations into dynamic visual entities. For many students, equations like $d = v_0 t + \frac{1}{2} a t^2$ feel completely decoupled from reality. By allowing students to actively modify variables and instantly trace trajectory parabolas, the mathematics becomes intuitive.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our simulation platform covers a broad spectrum of physics sub-disciplines. From simple harmonic motion (spring constants, pendulum frequencies) to fluid mechanics and electrodynamics, students gain tactile insight into physical boundaries without requiring bulky and expensive physical calibration tools.
              </p>
            </article>

            {/* Trajectory Canvas Block */}
            <div id="trajectory-sandbox" className="my-16 p-8 rounded-3xl border-2 border-indigo-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Activity className="text-indigo-500" /> Kinematics Projectile Simulator
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                Adjust the sliders below to modify launch angle, muzzle velocity, and planetary gravity. Fire the cannon to plot the kinematic parabola!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Canvas Render */}
                <div className="md:col-span-7 flex flex-col items-center">
                  <canvas 
                    ref={canvasRef}
                    width={480}
                    height={260}
                    className="border border-border/60 rounded-2xl bg-muted/20 w-full aspect-[48/26]"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground mt-2">
                    Plot coordinates map real-time vectors ($x_t, y_t$) under constant gravity.
                  </div>
                </div>

                {/* Simulation Sliders */}
                <div className="md:col-span-5 space-y-5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <span>Launch Angle</span>
                      <span className="text-indigo-500 font-bold">{angle}°</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="85" 
                      value={angle} 
                      onChange={(e) => setAngle(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <span>Velocity (v₀)</span>
                      <span className="text-indigo-500 font-bold">{velocity} m/s</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="80" 
                      value={velocity} 
                      onChange={(e) => setVelocity(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <span>Gravity (g)</span>
                      <span className="text-indigo-500 font-bold">{gravity} m/s²</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.6" 
                      max="20" 
                      step="0.1"
                      value={gravity} 
                      onChange={(e) => setGravity(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={fireProjectile}
                      disabled={isSimulating}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Fire Cannon <Play size={14} />
                    </button>
                    <button
                      onClick={resetSim}
                      className="px-3 py-3 border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Tactile Kinetic Learning</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our virtual workspace maps natural kinematics perfectly. Here is how physical labs solidify mechanics:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Air Resistance Constants:</strong> Registered users can toggled drag coefficients to evaluate drag force vectors ($F_d$) and terminal velocity profiles.</li>
                <li><strong>Pendulum Periods:</strong> Swap planetary environments (Moon, Mars, Jupiter) to calculate how local gravitational variance adapts the pendulum period equation ($T = 2\pi\sqrt{"{"}L/g{"}"}$).</li>
                <li><strong>Spring Hooke's Law:</strong> Measure force vs displacement vectors ($F = -kx$) with various material constants.</li>
              </ul>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Explore More STEM Workspaces</h3>
              <p className="text-muted-foreground leading-relaxed">
                After plotting your velocity trajectories, transition to thermodynamics and reactions inside our <Link to="/chemistry-lab" className="text-primary hover:underline">Virtual Chemistry Lab</Link>. If you are ready to construct formal test worksheets for your study circles, explore the <Link to="/test-generator" className="text-primary hover:underline">Test Generator</Link> interface.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Ace Physics This Semester</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Create an account now to access complete spring networks, friction analysis models, and direct circuit simulators.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              Sign Up Free <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
