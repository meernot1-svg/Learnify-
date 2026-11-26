import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_ARTICLES } from '../../data/blogArticles';
import Header from '../Header';
import Footer from '../Footer';
import SEO from '../SEO';
import { Calendar, User, Clock, ArrowLeft, BookOpen } from 'lucide-react';

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = BLOG_ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-4 text-red-500">Article Not Found</h1>
          <p className="text-muted-foreground mb-8 font-medium">The requested publication could not be located in our index logs.</p>
          <Link to="/blog" className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl">
            Return to Blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const SITE_URL = (import.meta as any).env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://applet-orpin.vercel.app');

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${SITE_URL}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `${SITE_URL}/blog/${article.slug}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title={`${article.title} | Learnify Academic Blog`}
        description={article.summary}
        canonicalPath={`/blog/${article.slug}`}
        ogImage={article.image}
        ogType="article"
        schema={breadcrumbSchema}
      />
      <Header />

      <main className="flex-1 py-12 px-6 max-w-4xl mx-auto w-full">
        {/* Back Link */}
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-10"
        >
          <ArrowLeft size={14} /> Back to Blog
        </Link>

        {/* Article Header */}
        <header className="space-y-6 mb-10">
          <span className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
            {article.category}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap gap-6 items-center text-xs font-bold uppercase tracking-wider text-muted-foreground/70 pt-4 border-y border-border/50 py-4">
            <span className="flex items-center gap-1.5"><User size={14} className="text-primary" /> By {article.author}</span>
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {article.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {article.readTime}</span>
          </div>
        </header>

        {/* Featured Image */}
        <div className="h-64 sm:h-[400px] w-full rounded-3xl overflow-hidden mb-12 shadow-2xl">
          <img 
            src={article.image} 
            alt={article.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Rich Article Body */}
        <article 
          className="prose prose-sm sm:prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6 pb-16 border-b border-border"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Cross-linking widget */}
        <div className="mt-12 p-8 border border-border/60 rounded-3xl bg-card flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-black text-lg uppercase tracking-tight text-foreground flex items-center gap-2">
              <BookOpen size={18} className="text-primary" /> Master STEM Concepts Today
            </h3>
            <p className="text-xs text-muted-foreground max-w-md font-medium leading-relaxed">
              Consolidate what you read by conducting chemical experiments and vector physics simulations directly inside our high-fidelity digital workspaces.
            </p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shrink-0"
          >
            Access Free Platform
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
