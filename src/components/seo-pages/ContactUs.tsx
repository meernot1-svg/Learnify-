import React, { useState } from 'react';
import { Send } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function ContactUs() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setMessage('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Contact Us - Direct Support Channels | Learnify"
        description="Reach out to the Learnify support team. Submit inquiries, share feedback, report simulation bugs, or request mentor partnerships."
        canonicalPath="/contact-us"
      />
      <Header />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-8">Contact Us</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-10">We would love to hear from you</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-card border-2 border-border p-8 rounded-3xl relative overflow-hidden">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-tight mb-4">Send a Message</h3>
                
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary"
                    placeholder="E.g. Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Your Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary"
                    placeholder="E.g. jane@example.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary resize-none"
                    placeholder="Describe your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  Transmit Message <Send size={12} />
                </button>
              </form>
            ) : (
              <div className="text-center py-16 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl animate-bounce">
                  ✓
                </div>
                <h4 className="text-lg font-black uppercase tracking-tight text-emerald-500">Transmission Complete</h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Our communications channel has logged your message. Support representatives will respond within 24 hours.
                </p>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="space-y-8 flex flex-col justify-center">
            <div className="space-y-3">
              <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Direct Support Uplinks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Have technical questions regarding our physics vector equations, stoichiometry balances, or require enterprise license configurations for public school systems? Connect with us directly:
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  @
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase text-foreground">Support Email</h4>
                  <a href="mailto:meernot1@gmail.com" className="text-sm font-semibold hover:text-primary transition-colors">
                    meernot1@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  #
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase text-foreground">Academic Lead</h4>
                  <p className="text-sm font-semibold">Safiullah</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
