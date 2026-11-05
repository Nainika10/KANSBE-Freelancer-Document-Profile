import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';

@Component({
  selector: 'app-web-developers',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './web-developers.component.html',
  styleUrls: ['./web-developers.component.css']
})
export class WebDevelopersComponent implements OnInit, AfterViewInit, OnDestroy {
  isGlobal = false;
  activeComingSoon: string | null = null;
  private comingSoonTimeout: any;
  showModal = false;
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;
  currentYear = new Date().getFullYear();
  isNearFooter = false;

  faqs = [
    {
      question: 'How do I find a web developer in India on Kansbe?',
      answer: 'Simply create an account and share your project requirement. Our matching engine will align you with the right web developers based on your tech stack and vision.',
      isOpen: false
    },
    {
      question: 'Why choose Kansbe for finding web developers?',
      answer: 'Kansbe is a curated network, not a directory. We vet developers for both technical and communication skills, matching them to your specific business needs.',
      isOpen: false
    },
    {
      question: 'Can I find a developer quickly on Kansbe?',
      answer: 'Yes. By sharing your requirement upfront, our platform instantly identifies the best matches, reducing your hiring time significantly.',
      isOpen: false
    },
    {
      question: 'What makes Kansbe different from other platforms?',
      answer: 'We focus on requirement-based matching. No bidding wars or endless scrolling—just direct alignment with professionals who fit your project.',
      isOpen: false
    },
    {
      question: 'How are payments handled on Kansbe?',
      answer: 'Payments are managed through a secure and structured process within the platform, ensuring milestone-based transparency.',
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

  constructor(private router: Router, private route: ActivatedRoute, private seo: SeoService) { }

  ngOnInit(): void {
    this.isGlobal = this.router.url.includes('global');

    if (this.isGlobal) {
      this.seo.updateTags({
        title: 'Best Freelance Web Developers | Kansbe',

        description: 'Discover freelance web developers specializing in frontend, backend, full-stack development, and scalable digital solutions.',

        keywords: 'best freelance web developers, frontend developers, backend developers, full-stack developers, remote web developers, freelance developers',

        canonicalUrl: 'https://kansbe.com/best-web-developers-global',

        ogTitle: 'Best Freelance Web Developers | Kansbe',

        ogDescription: 'Explore freelance web developers for scalable web platforms and modern digital projects.',

        ogUrl: 'https://kansbe.com/best-web-developers-global',

        ogImage: 'https://kansbe.com/assets/developer1.webp',

        ogType: 'website'
      });

      this.faqs = [
        {
          question: 'How do I define my needs?',
          answer: 'Start with the problem you are solving, not the features. Clarity on requirements leads to the most accurate matching.',
          isOpen: false
        },
        {
          question: 'What project types are supported?',
          answer: 'From MVPs and consumer apps to complex enterprise systems and API-heavy architecture.',
          isOpen: false
        },
        {
          question: 'What about delivery speed?',
          answer: 'Kansbe prioritizes velocity by removing the selection noise, often reducing onboarding time by 60%.',
          isOpen: false
        },
        {
          question: 'Is there a cost to start?',
          answer: 'Creating an account and sharing requirements is the first step toward clarity and is fully supported by our guide.',
          isOpen: false
        }
      ];
      this.seo.addFaqStructuredData(this.faqs.map(f => ({ question: f.question, answer: f.answer })));
    } else {
      this.seo.updateTags({

        title: 'Best Freelance Web Developers in India | Kansbe',

        description: 'Discover freelance web developers in India specializing in frontend, backend, full-stack development, and scalable digital solutions.',

        keywords: 'best freelance web developers in India, web developers India, frontend developers India, backend developers India, full-stack developers India',

        canonicalUrl: 'https://kansbe.com/best-web-developers-india',

        ogTitle: 'Best Freelance Web Developers in India | Kansbe',

        ogDescription: 'Explore freelance web developers in India for scalable web platforms and digital projects.',

        ogUrl: 'https://kansbe.com/best-web-developers-india',

        ogImage: 'https://kansbe.com/assets/developer1.webp',

        ogType: 'website'
      });

      this.seo.addFaqStructuredData([
        {
          question: 'How do I find a web developer in India on Kansbe?',
          answer: 'Create an account and share your requirement. Kansbe matches you with relevant freelance web developers based on your project needs.'
        },
        {
          question: 'Why choose Kansbe for web developers?',
          answer: 'Kansbe focuses on requirement-based matching instead of browsing multiple profiles.'
        },
        {
          question: 'Can I find a developer quickly?',
          answer: 'Yes, once your requirement is clear, you can quickly connect with the right developer.'
        },
        {
          question: 'What types of developers are available?',
          answer: 'You can find frontend, backend, and full-stack developers depending on your project.'
        },
        {
          question: 'How are payments handled?',
          answer: 'Payments are structured and handled securely.'
        }
      ]);
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
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
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

  showComingSoon(country: string): void {
    if (this.comingSoonTimeout) {
      clearTimeout(this.comingSoonTimeout);
    }
    this.activeComingSoon = country;
    this.comingSoonTimeout = setTimeout(() => {
      this.activeComingSoon = null;
    }, 3000);
  }

  navigateToIndia(): void {
    this.router.navigate(['/best-web-developers-india'], { queryParams: { from: 'developer-page' } });
  }
}
