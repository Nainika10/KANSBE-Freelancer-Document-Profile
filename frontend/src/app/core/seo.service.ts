import { Injectable, Inject, Optional } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) { }

  updateTags(config: {
    title: string;
    description: string;
    keywords?: string;
    author?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
    // Open Graph
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    ogType?: string;
    // Twitter
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  }) {
    // Title
    this.title.setTitle(config.title);

    // Basic meta tags
    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }
    this.meta.updateTag({ name: 'author', content: config.author || 'Kansbe' });

    // Robots
    if (config.noIndex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    }

    // Canonical URL
    if (config.canonicalUrl) {
      this.updateCanonicalUrl(config.canonicalUrl);
    }

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: config.ogTitle || config.title });
    this.meta.updateTag({ property: 'og:description', content: config.ogDescription || config.description });
    this.meta.updateTag({ property: 'og:type', content: config.ogType || 'website' });
    if (config.ogUrl) {
      this.meta.updateTag({ property: 'og:url', content: config.ogUrl });
    }
    if (config.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: config.ogImage });
    }
    this.meta.updateTag({ property: 'og:site_name', content: 'Kansbe' });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: config.twitterCard || 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.twitterTitle || config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.twitterDescription || config.description });
    if (config.twitterImage || config.ogImage) {
      this.meta.updateTag({ name: 'twitter:image', content: config.twitterImage || config.ogImage || '' });
    }
  }

  /**
   * Update or create the canonical URL link element
   */
  private updateCanonicalUrl(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (link) {
      link.setAttribute('href', url);
    } else {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    }
  }

  /**
   * Add FAQ structured data (JSON-LD) to the page
   */
  addFaqStructuredData(faqs: { question: string; answer: string }[]): void {
    // Remove any existing FAQ structured data
    const existing = this.document.querySelector('script[data-schema="faq"]');
    if (existing) {
      existing.remove();
    }

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };

    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-schema', 'faq');
    script.textContent = JSON.stringify(faqSchema);
    this.document.head.appendChild(script);
  }
}