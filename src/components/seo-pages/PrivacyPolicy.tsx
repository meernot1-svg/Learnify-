import React from 'react';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Privacy Policy - AdSense Compliant | Learnify"
        description="Review the Learnify privacy policy. Learn about how we manage user data, our strict security measures, cookie usage, and Google AdSense partner terms."
        canonicalPath="/privacy-policy"
      />
      <Header />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-8">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-10">Last Updated: July 16, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">1. Information We Collect</h2>
            <p>
              At Learnify, we prioritize our users' digital security and data transparency. We collect individual identifiers when you choose to register, such as your name and email address. In addition, our systems automatically collect network diagnostic details (IP address, browser metadata, operating system configs, and diagnostic telemetry) to guarantee stable connectivity with our virtual science servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">2. How We Use Your Data</h2>
            <p>
              We process your metrics to authenticate your academic profiles, schedule direct online classes with certified STEM mentors, track active study histories, and save custom flashcard decks. We do not sell or lease user metadata to data brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">3. Cookies and Advertising Disclosures (Google AdSense)</h2>
            <p className="font-semibold text-foreground">
              This section contains critical disclosures regarding third-party vendors and tracking mechanisms:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google AdSense & DoubleClick Cookies:</strong> Google, as a third-party advertising vendor, utilizes cookies to serve personalized advertisements across our public resource pages based on your browsing history on Learnify and other external platforms.</li>
              <li><strong>The DART Cookie:</strong> Google's use of advertising cookies enables it and its partner network to serve targeted ads to our users based on their visits to our site and other sites on the internet.</li>
              <li><strong>Opting Out:</strong> You may choose to opt-out of personalized advertising and interest-based tracking at any time by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads Settings</a>. Alternatively, you can block cookie scripts via your standard browser configurations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">4. Third-Party Services</h2>
            <p>
              Our virtual labs and learning engines coordinate with various third-party infrastructure providers to run assessments, render chemical compounds, and process Google OAuth tokens securely. These partners operate under independent privacy regulations which we encourage our users to review during setup.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">5. User Control and CCPA/GDPR Compliance</h2>
            <p>
              Depending on your regional jurisdiction (e.g. EU General Data Protection Regulation or California Consumer Privacy Act), you possess absolute rights to access, update, export, or completely delete your authenticated account profile. To execute these actions, please contact our privacy compliance officer through our dedicated support desk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-wider">6. Contact Information</h2>
            <p>
              For legal inquiries regarding our privacy standards, database security protocols, or cookie-consent policies, please reach out directly via:
            </p>
            <div className="p-4 bg-muted border border-border rounded-xl text-xs font-mono text-foreground space-y-1">
              <div>Entity: LEARNIFY CORE SYSTEMS</div>
              <div>Privacy Officer: Safiullah</div>
              <div>Email: meernot1@gmail.com</div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
