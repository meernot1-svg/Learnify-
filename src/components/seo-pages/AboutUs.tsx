import React from 'react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="About Us - Our Educational Vision | Learnify"
        description="Discover the history of Learnify. Learn how our founder Safiullah built an interactive STEM learning platform with smart labs and AI quiz engines."
        canonicalPath="/about-us"
      />
      <Header />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-8">About Learnify</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-10">THE ULTIMATE ECOSYSTEM FOR INTERACTIVE MASTERY</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Our Mission</h2>
            <p>
              Learnify was founded to demolish the barrier between complex mathematical theory and physical intuition. Traditional education relies on passive learning structures: reading textbooks, highlighting notes, and listening to long lectures. This model is inefficient.
            </p>
            <p>
              We believe in <strong>active engagement</strong>. By blending high-fidelity physics and chemistry sandbox simulators with smart generative AI quiz makers and collaborative mentor channels, we create an ecosystem where students learn by doing, failing, analyzing, and conquering.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Core Pillars</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Zero-Risk Laboratories:</strong> Perform chemical titrations and gravitational vector firing safely within a responsive 2D canvas workspace. Learn thermodynamics without spilling acids.</li>
              <li><strong>Generative Intelligence:</strong> Harness the power of generative LLM models to instantly convert lecture guides into structured active recall flashcards and diagnostic tests.</li>
              <li><strong>Verified Pedagogy:</strong> Connect directly with Stanford, MIT, and Oxford certified STEM mentors to clear learning bottlenecks and streamline study curricula.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Our Story</h2>
            <p>
              Learnify started as a digital sandbox concept designed to make high school physics less intimidating. Recognizing the global demand for accessible STEM simulation modules, our engineering team, spearheaded by lead developer <strong>Safiullah</strong>, scaled the platform into a robust, cloud-persistent educational network.
            </p>
            <p>
              Today, Learnify serves thousands of students, private tutors, and homeschool cooperatives worldwide, helping them ace exams and build genuine scientific curiosity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Meet the Founder</h2>
            <div className="p-6 border border-border rounded-2xl bg-card flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shrink-0 border border-primary/20">
                S
              </div>
              <div>
                <h4 className="font-black uppercase text-foreground">Safiullah</h4>
                <p className="text-xs text-muted-foreground mb-1">Founder & Lead Software Architect</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Safiullah engineered the core physical rendering loop, Google Auth integration, and spaced repetition schedulers powering the Learnify platform.
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
