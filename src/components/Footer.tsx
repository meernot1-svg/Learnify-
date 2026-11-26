import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Logo } from './Logo';

export default function Footer() {
  return (
    <footer className="py-16 sm:py-24 px-6 border-t border-border bg-card/50 backdrop-blur-md relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 sm:gap-8 mb-16">
        {/* Brand Column */}
        <div className="flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-3 font-black text-2xl tracking-tighter uppercase italic text-primary">
            <Logo className="w-10 h-10 shadow-xl shadow-primary/10" />
            Learnify
          </Link>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xs">
            The ultimate ecosystem for interactive mastery. Engineered for deep-learning retention, high-fidelity STEM simulations, and dynamic AI-powered training.
          </p>
        </div>

        {/* Feature Landing Pages */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Learning Tools</h4>
          <ul className="space-y-3 text-xs font-bold uppercase tracking-wider">
            <li>
              <Link to="/free-quiz-maker" className="text-muted-foreground hover:text-primary transition-colors">
                Free Quiz Maker
              </Link>
            </li>
            <li>
              <Link to="/ai-quiz-maker" className="text-muted-foreground hover:text-primary transition-colors">
                AI Quiz Maker
              </Link>
            </li>
            <li>
              <Link to="/ai-explainer" className="text-muted-foreground hover:text-primary transition-colors">
                AI Explainer
              </Link>
            </li>
            <li>
              <Link to="/test-generator" className="text-muted-foreground hover:text-primary transition-colors">
                Test Generator
              </Link>
            </li>
            <li>
              <Link to="/flashcards" className="text-muted-foreground hover:text-primary transition-colors">
                Interactive Flashcards
              </Link>
            </li>
          </ul>
        </div>

        {/* STEM & Mentoring */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Stem & Pedagogy</h4>
          <ul className="space-y-3 text-xs font-bold uppercase tracking-wider">
            <li>
              <Link to="/chemistry-lab" className="text-muted-foreground hover:text-primary transition-colors">
                Virtual Chemistry Lab
              </Link>
            </li>
            <li>
              <Link to="/physics-lab" className="text-muted-foreground hover:text-primary transition-colors">
                Virtual Physics Lab
              </Link>
            </li>
            <li>
              <Link to="/stem-mentoring" className="text-muted-foreground hover:text-primary transition-colors">
                STEM Mentoring
              </Link>
            </li>
            <li>
              <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">
                Learnify Blog
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Compliance */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">System Info</h4>
          <ul className="space-y-3 text-xs font-bold uppercase tracking-wider">
            <li>
              <Link to="/about-us" className="text-muted-foreground hover:text-primary transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact-us" className="text-muted-foreground hover:text-primary transition-colors">
                Contact Us
              </Link>
            </li>
            <li>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                <Lock size={12} />
                <span>Admin Panel</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1.5">
          <div className="text-xs font-medium text-muted-foreground text-center sm:text-left">
            © 2026 LEARNIFY CORE SYSTEMS. All rights reserved.
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
            Created by <span className="text-primary italic font-extrabold">Safiullah</span>
          </div>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors whitespace-nowrap shrink-0"
        >
          <Lock size={13} />
          <span>Admin Panel</span>
        </Link>
      </div>
    </footer>
  );
}
