import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonicalPath: string; // e.g. "/free-quiz-maker"
  ogImage?: string;
  ogType?: 'website' | 'article';
  schema?: Record<string, any> | Record<string, any>[];
}

const DEFAULT_DOMAIN = (import.meta as any).env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://applet-orpin.vercel.app');
const DEFAULT_IMAGE = 'https://lh3.googleusercontent.com/d/1mjlHJVtQeSVVmtFMkFwLLCs_ZRMfaOrf'; // Mascot banner

export default function SEO({
  title,
  description,
  canonicalPath,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  schema
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper to get or create a meta tag
    const getOrCreateMeta = (attrName: string, attrValue: string): HTMLMetaElement => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      return element;
    };

    // Helper to get or create link tag
    const getOrCreateLink = (relValue: string): HTMLLinkElement => {
      let element = document.querySelector(`link[rel="${relValue}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', relValue);
        document.head.appendChild(element);
      }
      return element;
    };

    const fullUrl = `${DEFAULT_DOMAIN}${canonicalPath}`;

    // 2. Meta Tags
    const metaDesc = getOrCreateMeta('name', 'description');
    metaDesc.setAttribute('content', description);

    // Robots
    const metaRobots = getOrCreateMeta('name', 'robots');
    metaRobots.setAttribute('content', 'index, follow');

    // Remove legacy keyword tag if present to adhere to guidelines
    const legacyKeywords = document.querySelector('meta[name="keywords"]');
    if (legacyKeywords) {
      legacyKeywords.remove();
    }

    // 3. Canonical Link
    const canonicalLink = getOrCreateLink('canonical');
    canonicalLink.setAttribute('href', fullUrl);

    // 4. Open Graph Tags
    const ogTitle = getOrCreateMeta('property', 'og:title');
    ogTitle.setAttribute('content', title);

    const ogDesc = getOrCreateMeta('property', 'og:description');
    ogDesc.setAttribute('content', description);

    const ogUrlMeta = getOrCreateMeta('property', 'og:url');
    ogUrlMeta.setAttribute('content', fullUrl);

    const ogTypeMeta = getOrCreateMeta('property', 'og:type');
    ogTypeMeta.setAttribute('content', ogType);

    const ogImgMeta = getOrCreateMeta('property', 'og:image');
    ogImgMeta.setAttribute('content', ogImage);

    // 5. Twitter Card Tags
    const twCard = getOrCreateMeta('name', 'twitter:card');
    twCard.setAttribute('content', 'summary_large_image');

    const twTitle = getOrCreateMeta('name', 'twitter:title');
    twTitle.setAttribute('content', title);

    const twDesc = getOrCreateMeta('name', 'twitter:description');
    twDesc.setAttribute('content', description);

    const twImg = getOrCreateMeta('name', 'twitter:image');
    twImg.setAttribute('content', ogImage);

    // 6. JSON-LD Structured Data
    let scriptTag: HTMLScriptElement | null = null;
    if (schema) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.text = JSON.stringify(schema);
      document.head.appendChild(scriptTag);
    }

    // Cleanup on unmount
    return () => {
      if (scriptTag) {
        scriptTag.remove();
      }
    };
  }, [title, description, canonicalPath, ogImage, ogType, schema]);

  return null;
}
