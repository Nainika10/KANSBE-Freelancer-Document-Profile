import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';
@Component({
  selector: 'app-designing',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './designing.component.html',
  styleUrls: ['./designing.component.css']
})
export class DesigningComponent implements OnInit, AfterViewInit, OnDestroy {
  showModal = false;
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;
  currentYear = new Date().getFullYear();
  isNearFooter = false;

  faqs = [
    {
      question: 'How do I find a freelance designer in India?',
      answer: 'Create an account and share your project requirements. Kansbe aligns relevant freelance designers based on your creative goals and design needs.',
      isOpen: false
    },
    {
      question: 'What types of designers are available?',
      answer: 'You can find UI UX designers, branding designers, graphic designers, product designers, and visual design specialists.',
      isOpen: false
    },
    {
      question: 'Why choose freelance designers for creative projects?',
      answer: 'Freelance designers provide flexible collaboration, creative expertise, and scalable workflows for modern digital and branding projects.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support creative collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and simplified creative workflows.',
      isOpen: false
    }
  ];

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  private footerObserver: IntersectionObserver | null = null;

  isGlobal = false;
  activeComingSoon: string | null = null;

  globalFaqs = [
    {
      question: 'How do I choose the right designer for my project?',
      answer: 'The right designer depends on your project goals, visual direction, branding requirements, and digital experience expectations.',
      isOpen: false
    },
    {
      question: 'What are the benefits of working with freelance designers?',
      answer: 'Freelance designers offer flexible collaboration, creative specialization, and scalable workflows for modern design projects.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support design collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and streamlined creative workflows.',
      isOpen: false
    },
    {
      question: 'Can I find designers for long-term projects?',
      answer: 'Yes. The ecosystem supports both project-based and long-term design collaboration.',
      isOpen: false
    }
  ];
  globalWorkSteps = [
    { step: '01', title: 'Create Account', description: 'Get started on Kansbe' },
    { step: '02', title: 'Share Requirement', description: 'Define your design needs and vision' },
    { step: '03', title: 'Get Matched', description: 'Relevant designers are aligned to your requirement' },
    { step: '04', title: 'Collaborate', description: 'Work with clarity and direction' },
    { step: '05', title: 'Structured Payments', description: 'Smooth and transparent transactions' }
  ];

  constructor(private router: Router, private seo: SeoService) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.isGlobal = this.router.url.includes('-global');

    if (this.isGlobal) {
      this.seo.updateTags({
        title: 'Best Freelance Designers | Kansbe',

        description: 'Discover freelance designers specializing in UI UX, branding, graphic design, product design, and digital experiences.',

        keywords: 'best freelance designers, graphic designers, UI UX designers, branding designers, product designers, freelance graphic designers',

        canonicalUrl: 'https://kansbe.com/best-designers-global',

        ogTitle: 'Best Freelance Designers | Kansbe',

        ogDescription: 'Explore freelance designers for branding, UI UX, graphic design, and digital experiences.',

        ogUrl: 'https://kansbe.com/best-designers-global',

        ogImage: 'https://kansbe.com/assets/Section 2.webp',

        ogType: 'website'
      });
      this.seo.addFaqStructuredData(
        this.globalFaqs.map(faq => ({ question: faq.question, answer: faq.answer }))
      );
    } else {
      this.seo.updateTags({
        title: 'Best Freelance Designers in India | Kansbe',

        description: 'Discover freelance designers in India specializing in UI UX, branding, graphic design, product design, and digital experiences.',

        keywords: 'best freelance designers in India, graphic designers India, UI UX designers India, branding designers India, product designers India',

        canonicalUrl: 'https://kansbe.com/best-designers-india',

        ogTitle: 'Best Freelance Designers in India | Kansbe',

        ogDescription: 'Explore freelance designers in India for branding, UI UX, graphic design, and digital experiences.',

        ogUrl: 'https://kansbe.com/best-designers-india',

        ogImage: 'https://kansbe.com/assets/Section 2.webp',

        ogType: 'website'
      });
      this.seo.addFaqStructuredData(
        this.faqs.map(faq => ({ question: faq.question, answer: faq.answer }))
      );
    }
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