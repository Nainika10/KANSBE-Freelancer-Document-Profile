import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';

@Component({
  selector: 'app-photography',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './photography.component.html',
  styleUrls: ['./photography.component.css']
})
export class PhotographyComponent implements OnInit {
  showModal = false;
  showRegisterModal = false;

  // Modal state for Privacy and Terms
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;

  isNearFooter = false;
  currentYear: number = new Date().getFullYear();
  isGlobal = false;
  activeComingSoon: string | null = null;

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  specialists = [
    {
      title: 'Wedding',
      desc: 'Focus on capturing emotions, moments, and storytelling across events.',
      icon: 'heart',
      img: 'assets/wedding.webp'
    },
    {
      title: 'Pre-Wedding & Couple',
      desc: 'Creative shoots with concepts, locations, and themes.',
      icon: 'camera-plus',
      img: 'assets/couple.webp'
    },
    {
      title: 'Product',
      desc: 'Used for e-commerce and branding with attention to detail and lighting.',
      icon: 'box',
      img: 'assets/product.webp'
    },
    {
      title: 'Fashion / Model',
      desc: 'Work with styling, direction, and creative concepts.',
      icon: 'hanger',
      img: 'assets/fashion.webp'
    },
    {
      title: 'Event',
      desc: 'Capture live events like corporate functions, launches, and gatherings.',
      icon: 'calendar',
      img: 'assets/event.webp'
    },
    {
      title: 'Content / Social',
      desc: 'Focused on fast-paced, consistent content creation for brands.',
      icon: 'video',
      img: 'assets/social.webp'
    }
  ];

  faqs = [
    {
      question: 'How do I find a freelance photographer in India?',
      answer: 'Create an account and share your project requirements. Kansbe aligns relevant freelance photographers based on your creative vision and project goals.',
      isOpen: false
    },
    {
      question: 'What types of photographers are available?',
      answer: 'You can find wedding photographers, fashion photographers, product photographers, event photographers, and branding specialists.',
      isOpen: false
    },
    {
      question: 'Why choose freelance photographers for creative projects?',
      answer: 'Freelance photographers provide flexible collaboration, creative specialization, and scalable workflows for modern visual content projects.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support creative collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and simplified creative workflows.',
      isOpen: false
    }
  ];

  globalSpecialists = [
    {
      title: 'Event',
      desc: 'Capturing the pulse of the moment without disrupting the flow.',
      icon: 'calendar',
      img: 'assets/event.webp'
    },
    {
      title: 'Product',
      desc: 'Visual precision for product staging and commercial display.',
      icon: 'box',
      img: 'assets/product.webp'
    },
    {
      title: 'Fashion',
      desc: 'Raw emotion meets editorial direction for fashion narratives.',
      icon: 'hanger',
      img: 'assets/fashion.webp'
    },
    {
      title: 'Content',
      desc: 'Versatile, platform-ready imagery for digital distribution.',
      icon: 'video',
      img: 'assets/social.webp'
    },
    {
      title: 'Specialized',
      desc: 'Niche expertise for scientific, architectural, or technical photography.',
      icon: 'heart',
      img: 'assets/wedding.webp'
    }
  ];

  globalWorkSteps = [
    { num: '01', title: 'INTENT MAPPING', desc: 'We define the narrative goal before the lens is even attached.' },
    { num: '02', title: 'EXPERT CURATION', desc: 'Matching your project with a specialist from our vetted global roster.' },
    { num: '03', title: 'KINETIC EXECUTION', desc: 'On-site direction ensuring every frame hits the intended frequency.' }
  ];

  globalFaqs = [
    {
      question: 'How do I choose the right photographer for my project?',
      answer: 'The right photographer depends on your project goals, creative direction, visual style, and content requirements.',
      isOpen: false
    },
    {
      question: 'What are the benefits of working with freelance photographers?',
      answer: 'Freelance photographers offer flexible collaboration, creative expertise, and scalable workflows for modern visual storytelling projects.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support photography collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and streamlined creative workflows.',
      isOpen: false
    },
    {
      question: 'Can I find photographers for long-term projects?',
      answer: 'Yes. The ecosystem supports both project-based and long-term photography collaboration.',
      isOpen: false
    }
  ];

  constructor(private router: Router, private route: ActivatedRoute, private seo: SeoService) { }

  ngOnInit(): void {
    this.route.url.subscribe(urlSegment => {
      const urlPath = urlSegment.join('/');
      this.isGlobal = urlPath.includes('global');
    });

    window.scrollTo(0, 0);
    if (this.isGlobal) {

      this.seo.updateTags({
        title: 'Best Freelance Photographers | Kansbe',

        description: 'Discover freelance photographers specializing in weddings, fashion, events, branding, product shoots, and visual storytelling.',

        keywords: 'best freelance photographers, wedding photographers, fashion photographers, product photographers, event photographers, freelance photography',

        canonicalUrl: 'https://kansbe.com/best-photographers-global',

        ogTitle: 'Best Freelance Photographers | Kansbe',

        ogDescription: 'Explore freelance photographers for weddings, branding, events, and visual storytelling projects.',

        ogUrl: 'https://kansbe.com/best-photographers-global',

        ogImage: 'https://kansbe.com/assets/Studiophotography.webp',

        ogType: 'website'
      });

    } else {

      this.seo.updateTags({
        title: 'Best Freelance Photographers in India | Kansbe',

        description: 'Discover freelance photographers in India specializing in weddings, fashion, events, branding, product shoots, and visual storytelling.',

        keywords: 'best freelance photographers in India, wedding photographers India, fashion photographers India, product photographers India, freelance photography India',

        canonicalUrl: 'https://kansbe.com/best-photographers-india',

        ogTitle: 'Best Freelance Photographers in India | Kansbe',

        ogDescription: 'Explore freelance photographers in India for weddings, branding, events, and visual storytelling.',

        ogUrl: 'https://kansbe.com/best-photographers-india',

        ogImage: 'https://kansbe.com/assets/Studiophotography.webp',

        ogType: 'website'
      });

    }


    const activeFaqs = this.isGlobal ? this.globalFaqs : this.faqs;
    this.seo.addFaqStructuredData(
      activeFaqs.map(faq => ({
        question: faq.question,
        answer: faq.answer
      }))
    );

    this.setupFooterObserver();
  }
  private setupFooterObserver(): void {
    setTimeout(() => {
      const footerElement = document.querySelector('.kansbe-footer-section');
      if (footerElement) {
        const footerObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isNearFooter = entry.isIntersecting;
          });
        }, { threshold: 0.1 });
        footerObserver.observe(footerElement);
      }
    }, 500);
  }


  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  showComingSoon(region: string): void {
    this.activeComingSoon = region;
    setTimeout(() => {
      if (this.activeComingSoon === region) {
        this.activeComingSoon = null;
      }
    }, 2000);
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

  closeAllModals(): void {
    this.showModal = false;
    this.showRegisterModal = false;
  }

  toggleFaq(index: number): void {
    if (this.isGlobal) {
      this.globalFaqs[index].isOpen = !this.globalFaqs[index].isOpen;
    } else {
      this.faqs[index].isOpen = !this.faqs[index].isOpen;
    }
  }

  startAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancersignup']);
  }

  joinAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['clientsignup']);
  }

  registerAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['clientlogin']);
  }

  navigateToHowItWorks(): void {
    this.closeAllModals();
    this.router.navigate(['/how-kansbe-works']);
  }

  navigateToAbout(): void {
    this.closeAllModals();
    this.router.navigate(['/about-kansbe']);
  }

  navigateToWhyFreelancers(): void {
    this.closeAllModals();
    this.router.navigate(['/why-kansbe-freelancers']);
  }

  navigateToBlogs(): void {
    this.closeAllModals();
    this.router.navigate(['/blogs']);
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
