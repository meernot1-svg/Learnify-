import React from 'react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Terms of Service - System Usage Rules | Learnify"
        description="Read the Learnify terms of service. Understand user responsibilities, code licensing, scientific lab limits, and mentor guidelines."
        canonicalPath="/terms-of-service"
      />
      <Header />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-8">Terms of Service</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-10">Last Updated: July 16, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">1. Agreement to Terms</h2>
            <p>
              By accessing, browsing, or registering with Learnify, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not accept these operational rules, you are prohibited from utilizing our virtual labs or AI quiz services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">2. Account Registration and Roles</h2>
            <p>
              To engage with customized testing decks and science simulations, users must establish an authenticated profile via Google OAuth. You agree to provide accurate registration parameters. Learnify provides dual-role access interfaces:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Students:</strong> Permitted to consume learning materials, run chemistry/physics simulations, and review personal performance logs.</li>
              <li><strong>Mentors:</strong> Permitted to generate and upload physical study resources and manage students. Mentors undergo academic degree audits before receiving verified tags.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">3. Permitted Sandbox Conduct</h2>
            <p>
              Users must not utilize our python IDE or virtual labs to run malicious scripts, flood server pipelines, bypass security layers, or upload copyrighted curricula without direct publisher consent. All simulation interactions are logged.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">4. Scientific Accuracy Disclaimer</h2>
            <p>
              While our developers and academic advisors optimize chemical stoichiometries and Newtonian gravitational matrices to ensure high-fidelity accuracy, virtual experiments are model-based representations. They do not fully replace physical physical safety assessments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">5. System Termination</h2>
            <p>
              Learnify reserves the right to suspend or completely terminate access credentials for users who violate intellectual integrity, engage in role-spoofing payloads, or spam public testing directories.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">6. Governing Law</h2>
            <p>
              These agreements and any legal disputes related to the Learnify ecosystem are governed and structured under international cloud software licensing standards.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
