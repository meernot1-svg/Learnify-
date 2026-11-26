import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Users, Calendar, Shield, Sparkles, Send, X } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function StemMentoring() {
  const navigate = useNavigate();
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mentors = [
    {
      id: 1,
      name: "Dr. Sarah Vance",
      title: "Biophysics Instructor",
      specialty: "Cellular Thermodynamics & Kinetics",
      school: "Ph.D. Stanford University",
      bio: "Dr. Sarah specializes in translating abstract chemical kinetic formulas into intuitive spatial diagrams for pre-med undergraduates."
    },
    {
      id: 2,
      name: "Prof. David Chen",
      title: "Full-Stack Software Mentor",
      specialty: "Data Structures, Algorithms & Node Systems",
      school: "M.S. Massachusetts Institute of Technology",
      bio: "Prof. David focuses on asynchronous computing architectures and has mentored over 200 software engineers into major tech institutions."
    },
    {
      id: 3,
      name: "Dr. Elena Rostova",
      title: "Organic Chemist & Toxicologist",
      specialty: "Nucleophilic Substitutions & Synthesis",
      school: "Ph.D. Oxford University",
      bio: "Dr. Elena leads our virtual chemistry sandbox developments, optimizing organic reactions and atomic shells modeling."
    }
  ];

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryEmail.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedMentor(null);
      setInquiryName('');
      setInquiryEmail('');
    }, 2500);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How are mentors verified on Learnify?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Every mentor undergoes a strict academic verification check. They must submit academic degrees, undergo coding skill testing (for computer science tracks), and demonstrate pedagogical proficiency before they can share study materials on our network."
        }
      },
      {
        "@type": "Question",
        "name": "Can I sign up to be a mentor myself?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Learnify welcomes applications from professional tutors, high school teachers, and university professors. Click register, select the 'Mentor' role, and submit your credentials."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="STEM Mentoring - Certified Science & Coding Tutors | Learnify"
        description="Connect with professional, fully-certified instructors online via Learnify STEM mentoring. Review customized curriculum guides, stream classes, and master subjects."
        canonicalPath="/stem-mentoring"
        schema={faqSchema}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden border-b border-border bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-black tracking-widest uppercase mb-6">
              <Users size={14} /> PEDAGOGICAL NETWORK
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
              Accelerate Comprehension with Elite <span className="text-yellow-500">STEM Mentoring</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              Never study alone. Our structured STEM mentoring program matches aspiring software developers, pre-med students, and engineering aspirants with veteran Stanford, Oxford, and MIT certified mentors.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-yellow-500/20"
              >
                Find Your STEM Mentor
              </button>
              <a 
                href="#mentor-grid"
                className="px-8 py-4 rounded-xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted transition-all"
              >
                Inquire With Mentors
              </a>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            
            <article>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is Learnify STEM Mentoring?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Learnify <strong>stem mentoring</strong> system is an elite, verified network of scientific minds, engineered to bypass standard public education deficiencies. In classical classrooms, a single instructor handles 30+ students, forcing a generalized learning speed. Our platform matches students into tailored active-recall channels, ensuring complete subject mastery.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By allowing students to directly access curated homework matrices, syllabus pathways, and real-time review queues, we remove operational friction. Mentors can push custom multiple choice files directly into your dashboard, and analyze your performance on our virtual simulation platforms.
              </p>
            </article>

            {/* Interactive Mentor Selection Block */}
            <div id="mentor-grid" className="my-16 p-8 rounded-3xl border-2 border-yellow-500/20 bg-card/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-xl" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <GraduationCap className="text-yellow-500" /> Interactive Mentor Inquiry Board
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                Click on any of our certified advisors below to request their availability and preview scheduling configurations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {mentors.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMentor(m)}
                    className="p-6 border border-border hover:border-yellow-500/40 rounded-2xl bg-muted/20 cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-yellow-600 uppercase tracking-widest block mb-1">{m.school}</span>
                      <h4 className="font-black uppercase text-sm mb-1">{m.name}</h4>
                      <p className="text-[11px] font-bold text-foreground/80 mb-3">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{m.bio}</p>
                    </div>
                    <button className="w-full mt-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-[10px] uppercase tracking-wider rounded-lg transition-colors">
                      Inquire
                    </button>
                  </div>
                ))}
              </div>

              {/* Inquiry Dialog Modal */}
              <AnimatePresence>
                {selectedMentor && (
                  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-card border-2 border-yellow-500/30 rounded-3xl p-8 max-w-md w-full relative shadow-2xl"
                    >
                      <button
                        onClick={() => setSelectedMentor(null)}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                      >
                        <X size={18} />
                      </button>

                      {!submitted ? (
                        <form onSubmit={handleInquirySubmit} className="space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600">Mentor Contact Channel</span>
                          <h4 className="text-xl font-black uppercase tracking-tight">Connect with {selectedMentor.name}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                            Dr. Sarah Vance will review your request and share a direct scheduling link to your Learnify dashboard profile.
                          </p>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Your Name</label>
                              <input
                                type="text"
                                required
                                value={inquiryName}
                                onChange={(e) => setInquiryName(e.target.value)}
                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-yellow-500"
                                placeholder="E.g. John Doe"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Your Email</label>
                              <input
                                type="email"
                                required
                                value={inquiryEmail}
                                onChange={(e) => setInquiryEmail(e.target.value)}
                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-yellow-500"
                                placeholder="E.g. john@example.com"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
                          >
                            Send Inquiry <Send size={12} />
                          </button>
                        </form>
                      ) : (
                        <div className="text-center py-8 space-y-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl animate-bounce">
                            ✓
                          </div>
                          <h4 className="text-lg font-black uppercase tracking-tight text-emerald-500">Inquiry Logged</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            The communication channel has been authenticated. Check your inbox for scheduling logs shortly!
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Strict Credentials & Verification Process</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We believe that learning from highly qualified professionals is paramount to STEM success. Unlike general tutoring services that lack structure, our advisors pass through rigorous quality checks:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Academic Degree Audits:</strong> Every mentor's transcripts, diplomas, and research publications are vetted by our internal pedagogy panel.</li>
                <li><strong>Interactive Teaching Simulations:</strong> Mentors demonstrate their ability to translate abstract formulas into relatable visual analogies.</li>
                <li><strong>Safe Digital Environments:</strong> All communications, whiteboard sharing, and file handovers take place within our secure, encrypted platform.</li>
              </ul>
            </article>

            <article>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Integrate Tutoring with Digital Laboratories</h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect your mentoring sessions with our interactive experiments. Ask your mentor to review your acid-base titrations in the <Link to="/chemistry-lab" className="text-primary hover:underline">Virtual Chemistry Lab</Link>, or model gravitational vectors together in our <Link to="/physics-lab" className="text-primary hover:underline">Virtual Physics Lab</Link>. If you need to prepare diagnostic review questions beforehand, utilize our <Link to="/free-quiz-maker" className="text-primary hover:underline">Free Quiz Maker</Link> tool.
              </p>
            </article>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">Connect with Academic Leaders</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-semibold">
              Create your account to browse our complete advisor roster, upload syllabus calendars, and schedule live review calls.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-yellow-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              Start Studying with Mentors <Sparkles size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
