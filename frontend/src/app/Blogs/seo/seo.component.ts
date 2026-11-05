import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';

@Component({
  selector: 'app-seo',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './seo.component.html',
  styleUrls: ['./seo.component.css']
})
export class SeoComponent implements OnInit, AfterViewInit, OnDestroy {
  showModal = false;
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;
  currentYear = new Date().getFullYear();
  isNearFooter = false;

  private footerObserver: IntersectionObserver | null = null;

  isGlobal = false;
  activeComingSoon: string | null = null;



  seoAreas = [
    { num: '01', title: 'On-Page SEO', desc: 'Content optimization, keyword research, and meta tags for maximum visibility and relevance.' },
    { num: '02', title: 'Technical SEO', desc: 'Server optimization, site structure, and mobile agility for peak performance.' },
    { num: '03', title: 'Off-Page SEO', desc: 'Authority-building through premium backlinks and high-impact external positioning.' },
    { num: '04', title: 'Content SEO', desc: 'Deep research into semantic clusters to find high-audience-match niche topics.' },
    { num: '05', title: 'Local SEO', desc: 'Strategic local optimization for location-based searches and local territory dominance.' },
    { num: '06', title: 'Analytics & Tracking', desc: 'Monitoring performance and refining strategy with real-time industrial data sets.' }
  ];

  faqs = [
    {
      question: 'How do I find a freelance SEO specialist in India?',
      answer: 'Create an account and share your business goals. Kansbe aligns relevant freelance SEO specialists based on your optimization requirements.',
      isOpen: false
    },
    {
      question: 'What types of SEO specialists are available?',
      answer: 'You can find technical SEO specialists, local SEO experts, content SEO professionals, and digital growth strategists.',
      isOpen: false
    },
    {
      question: 'Why choose freelance SEO specialists for digital growth?',
      answer: 'Freelance SEO specialists provide flexible collaboration, focused optimization strategies, and scalable digital growth workflows.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support SEO collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and simplified SEO workflows.',
      isOpen: false
    }
  ];
  globalFaqs = [
    {
      question: 'How do I choose the right SEO specialist for my business?',
      answer: 'The right SEO specialist depends on your business goals, target audience, content strategy, and technical optimization requirements.',
      isOpen: false
    },
    {
      question: 'What are the benefits of working with freelance SEO specialists?',
      answer: 'Freelance SEO specialists offer flexible collaboration, focused expertise, and scalable optimization strategies for modern digital businesses.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support SEO collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and streamlined workflows for modern SEO projects.',
      isOpen: false
    },
    {
      question: 'Can I find SEO specialists for long-term growth projects?',
      answer: 'Yes. The ecosystem supports both project-based and long-term SEO and digital growth collaboration.',
      isOpen: false
    }
  ];

  globalSeoAreas = [
    { num: '01', title: 'On Page SEO', desc: 'Optimizing individual web pages to rank higher and earn more relevant traffic through structural precision.' },
    { num: '02', title: 'Technical SEO', desc: 'Ensuring website infrastructure supports search engine crawling, indexing, and performance.' },
    { num: '03', title: 'Content and Strategy', desc: 'Developing keyword-driven, audience-focused content that drives sustainable organic growth.' },
    { num: '04', title: 'Local SEO', desc: 'Improving visibility for location based searches and local audiences.' },
    { num: '05', title: 'Off Page SEO', desc: 'Building domain authority through backlinks, mentions, and external trust signals.' }
  ];

  workSteps = [
    { step: '01', title: 'Create Account', description: 'Get started by setting up your profile on Kansbe.' },
    { step: '02', title: 'Share Requirement', description: 'Describe your business goals, target keywords, and technical SEO needs.' },
    { step: '03', title: 'Get Matched', description: 'Relevant SEO experts are aligned based on your industry and ranking objectives.' },
    { step: '04', title: 'Start Collaborating', description: 'Connect with the selected specialist and begin optimizing your digital footprint.' },
    { step: '05', title: 'Structured Payments', description: 'Payments are handled smoothly through Kansbe, ensuring a reliable process for both you and the expert.' }
  ];

  globalWorkSteps = [
    { step: '01', title: 'Create your account', subtitle: 'ONBOARDING', description: 'Get started by setting up your profile on Kansbe.' },
    { step: '02', title: 'Share your requirement', subtitle: 'BRIEFING', description: 'Describe your business goals, target keywords, and technical SEO needs.' },
    { step: '03', title: 'Get matched with relevant SEO experts', subtitle: 'SELECTION', description: 'Relevant SEO experts are aligned based on your industry and ranking objectives.' },
    { step: '04', title: 'Start working together', subtitle: 'EXECUTION', description: 'Connect with the selected specialist and begin optimizing your digital footprint.' },
    { step: '05', title: 'Experience smooth and structured payments', subtitle: 'RETENTION', description: 'Payments are handled smoothly through Kansbe, ensuring a reliable process for both you and the expert.' }
  ];

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  constructor(private router: Router, private seo: SeoService) { }
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.isGlobal = this.router.url.includes('-global');

    if (this.isGlobal) {
      this.seo.updateTags({
        title: 'Best Freelance SEO Specialists | Kansbe',

        description: 'Discover freelance SEO specialists for technical SEO, local SEO, content optimization, and scalable digital growth strategies.',

        keywords: 'best freelance SEO specialists, SEO experts, technical SEO specialists, local SEO experts, content SEO, SEO consultants, remote SEO professionals',

        canonicalUrl: 'https://kansbe.com/seo-experts-global',

        ogTitle: 'Best Freelance SEO Specialists | Kansbe',

        ogDescription: 'Explore freelance SEO specialists for technical SEO, content optimization, and digital growth.',

        ogUrl: 'https://kansbe.com/seo-experts-global',

        ogImage: 'https://kansbe.com/assets/seo1.webp',

        ogType: 'website'
      });

      this.seo.addFaqStructuredData(
        this.globalFaqs.map(faq => ({
          question: faq.question,
          answer: faq.answer
        }))
      );
    } else {
      this.seo.updateTags({
        title: 'Best Freelance SEO Specialists in India | Kansbe',

        description: 'Discover freelance SEO specialists in India for technical SEO, local SEO, content optimization, and scalable digital growth strategies.',

        keywords: 'best freelance SEO specialists in India, SEO experts India, technical SEO specialists India, local SEO experts India, content SEO India, SEO consultants India',

        canonicalUrl: 'https://kansbe.com/seo-experts-india',

        ogTitle: 'Best Freelance SEO Specialists in India | Kansbe',

        ogDescription: 'Explore freelance SEO specialists in India for technical SEO, content optimization, and digital growth.',

        ogUrl: 'https://kansbe.com/seo-experts-india',

        ogImage: 'https://kansbe.com/assets/seo1.webp',

        ogType: 'website'
      });

      this.seo.addFaqStructuredData(
        this.faqs.map(faq => ({
          question: faq.question,
          answer: faq.answer
        }))
      );
    }

    this.setupFooterObserver();
  }
  ngAfterViewInit(): void {
    this.setupFooterObserver();
  }

  ngOnDestroy(): void {
    if (this.footerObserver) {
      this.footerObserver.disconnect();
    }
    document.body.classList.remove('modal-open');
  }

  private setupFooterObserver(): void {
    const footerElement = document.querySelector('.kansbe-footer-section');
    if (footerElement) {
      this.footerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.isNearFooter = entry.isIntersecting;
        });
      }, { threshold: 0.1 });
      this.footerObserver.observe(footerElement);
    }
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  toggleFaq(index: number): void {
    if (this.isGlobal) {
      this.globalFaqs[index].isOpen = !this.globalFaqs[index].isOpen;
    } else {
      this.faqs[index].isOpen = !this.faqs[index].isOpen;
    }
  }

  showComingSoon(region: string): void {
    if (this.activeComingSoon === region) {
      this.activeComingSoon = null;
    } else {
      this.activeComingSoon = region;
      setTimeout(() => {
        if (this.activeComingSoon === region) {
          this.activeComingSoon = null;
        }
      }, 3000);
    }
  }

  openModal(type: 'privacy' | 'terms'): void {
    this.modalType = type;
    this.isModalOpen = true;
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    document.body.classList.remove('modal-open');
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateToAbout(): void { this.router.navigate(['/about-kansbe']); }
  navigateToHowItWorks(): void { this.router.navigate(['/how-kansbe-works']); }
  navigateToWhyFreelancers(): void { this.router.navigate(['/why-kansbe-freelancers']); }
  navigateToBlogs(): void { this.router.navigate(['/blogs']); }
  startAsFreelancer(): void { this.router.navigate(['/freelancersignup']); }
  joinAsClient(): void { this.router.navigate(['/clientsignup']); }
  registerAsFreelancer(): void { this.router.navigate(['/freelancerlogin']); }
  registerAsClient(): void { this.router.navigate(['/clientlogin']); }
}