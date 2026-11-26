import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BLOG_ARTICLES } from '../../data/blogArticles';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';
import { BookOpen, Calendar, User, Clock } from 'lucide-react';

export default function BlogIndex() {
  const navigate = useNavigate();

  const SITE_URL = (import.meta as any).env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://applet-orpin.vercel.app');

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog/#blog`,
    "name": "Learnify Academic Blog",
    "description": "Scientific breakthroughs, learning protocols, active recall science, and virtual lab guides compiled by the Learnify academic panel.",
    "publisher": {
      "@type": "Organization",
      "name": "Learnify",
      "logo": "https://lh3.googleusercontent.com/d/1mjlHJVtQeSVVmtFMkFwLLCs_ZRMfaOrf"
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Learnify Blog - Study Science, Active Recall & STEM Guides"
        description="Read original STEM articles, chemistry guides, physics tutorials, and active recall studies on the official Learnify learning blog."
        canonicalPath="/blog"
        schema={blogSchema}
      />
      <Header />

      <main className="flex-1 py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black tracking-widest uppercase mb-4">
            <BookOpen size={14} /> Academic Publications
          </div>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mb-4 leading-none">
            The Learnify <span className="text-[#f4b400]">Blog</span>
          </h1>
          <p className="text-base text-muted-foreground font-medium">
            Discover original educational research, spaced repetition studies, STEM tutorial guides, and lab walk-throughs written by our pedagogy panel.
          </p>
        </div>

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {BLOG_ARTICLES.map((article) => (
            <Link 
              key={article.id}
              to={`/blog/${article.slug}`}
              className="group flex flex-col justify-between border border-border hover:border-primary/40 rounded-3xl bg-card overflow-hidden transition-all hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5"
            >
              <div>
                {/* Image header */}
                <div className="h-52 w-full overflow-hidden relative">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/90 text-[10px] font-black uppercase tracking-widest text-primary border border-border">
                    {article.category}
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-3">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {article.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {article.readTime}</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium line-clamp-3">
                    {article.summary}
                  </p>
                </div>
              </div>

              {/* Author footer */}
              <div className="px-6 pb-6 pt-4 border-t border-border/50 flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><User size={12} className="text-primary" /> By {article.author}</span>
                <span className="text-primary font-black group-hover:translate-x-1 transition-transform">Read &gt;</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
