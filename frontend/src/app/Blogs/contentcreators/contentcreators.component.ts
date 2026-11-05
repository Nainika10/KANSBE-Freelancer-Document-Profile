import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';

@Component({
  selector: 'app-contentcreators',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './contentcreators.component.html',
  styleUrls: ['./contentcreators.component.css']

})
export class ContentcreatorsComponent implements OnInit {
  showModal = false;

  // Modal state for Privacy and Terms
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;

  isNearFooter = false;
  showScroll = true;
  currentYear: number = new Date().getFullYear();

  isGlobal = false;
  activeComingSoon: string | null = null;

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  faqs = [
    {
      question: 'How do I find a Content Creator in India on Kansbe?',
      answer: 'Simply create an account and share your content requirement. Our algorithm will match you with the best-fit content creators and social media managers from our curated network.',
      isOpen: false
    },
    {
      question: 'Why choose Kansbe for finding creative designers?',
      answer: 'We vet the top 1% of talent, focusing on technical depth, creative vision, and delivery speed to ensure your brand stands out.',
      isOpen: false
    },
    {
      question: 'Can I find a designer quickly on Kansbe?',
      answer: 'Yes, our requirement-based matching system identifies suitable candidates in under 24 hours, skipping weeks of manual vetting.',
      isOpen: false
    },
    {
      question: 'What makes Kansbe different from other platforms?',
      answer: 'Unlike generic marketplaces, we focus on algorithmic precision and curated talent, removing the noise of traditional networking.',
      isOpen: false
    },
    {
      question: 'How are payments handled on Kansbe?',
      answer: 'Payments are handled through secure, structured transactions, ensuring transparency and protection for both you and the creative.',
      isOpen: false
    }
  ];

  globalFaqs = [
    {
      question: 'How do I choose the right content creator for my brand?',
      answer: 'The right content creator depends on your audience, platform goals, content style, and overall brand communication requirements.',
      isOpen: false
    },
    {
      question: 'What are the benefits of working with freelance content creators?',
      answer: 'Freelance content creators offer flexible collaboration, creative specialization, and platform-focused content workflows for modern digital brands.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support content collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and streamlined workflows for modern content and social media projects.',
      isOpen: false
    },
    {
      question: 'Can I find creators for long-term content projects?',
      answer: 'Yes. The ecosystem supports both project-based and long-term content creation and social media collaboration.',
      isOpen: false
    }
  ];

  workSteps = [
    { step: '01', title: 'Create Account', description: 'Get started by setting up your profile on Kansbe.' },
    { step: '02', title: 'Share Requirement', description: 'Describe your brand voice, platform needs, and content strategy.' },
    { step: '03', title: 'Get Matched', description: 'Relevant content creators are aligned based on your audience and creative tone.' },
    { step: '04', title: 'Start Collaborating', description: 'Connect with the selected creator and move forward with high-impact production.' },
    { step: '05', title: 'Structured Payments', description: 'Payments are handled smoothly through Kansbe, ensuring a reliable process for both you and the creator.' }
  ];

  globalWorkSteps = [
    { step: '01', title: 'Create your account', description: 'Get started by setting up your profile on Kansbe.' },
    { step: '02', title: 'Share your requirement', description: 'Describe your brand voice, platform needs, and content strategy.' },
    { step: '03', title: 'Get matched with relevant creators or managers', description: 'Relevant creators are aligned based on your audience and creative tone.' },
    { step: '04', title: 'Start collaborating', description: 'Connect with the selected creator and move forward with high-impact production.' },
    { step: '05', title: 'Smooth and structured payments', description: 'Payments are handled smoothly through Kansbe, ensuring a reliable process for both you and the creator.' }
  ];

  constructor(private router: Router, private seo: SeoService) { }

  ngOnInit(): void {
    this.isGlobal = this.router.url.includes('-global');

    if (this.isGlobal) {
      this.seo.updateTags({
        title: 'Best Freelance Content Creators & Social Media Managers | Kansbe',

        description: 'Discover freelance content creators and social media managers specializing in branding, digital campaigns, audience growth, content strategy, and modern social media ecosystems.',

        keywords: 'best freelance content creators, content creators, social media managers, freelance social media managers, digital content creators, remote content creators, content strategists, social media marketing',

        canonicalUrl: 'https://kansbe.com/content-creators-global',

        ogTitle: 'Best Freelance Content Creators & Social Media Managers | Kansbe',

        ogDescription: 'Explore freelance content creators and social media professionals for branding, digital campaigns, audience engagement, and modern content strategies.',

        ogUrl: 'https://kansbe.com/content-creators-global',

        ogImage: 'https://kansbe.com/assets/content2.webp',

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
        title: 'Best Freelance Content Creators & Social Media Managers in India | Kansbe',

        description: 'Discover freelance content creators and social media managers in India specializing in branding, digital campaigns, audience growth, content strategy, and modern social media ecosystems.',

        keywords: 'best freelance content creators in India, content creators India, social media managers India, freelance content creators, digital content creators, content strategists, social media marketing India',
        canonicalUrl: 'https://kansbe.com/content-creators-india',
        ogTitle: 'Best Content Creators in India | Kansbe',
        ogDescription: 'Discover content creators and social media managers in India for brand growth and digital strategy.',
        ogUrl: 'https://kansbe.com/content-creators-india',
        ogImage: 'https://kansbe.com/assets/content2.webp',
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: 'Best Content Creators in India',
        twitterDescription: 'Find freelance content creators and social media managers based on your brand needs.',
        twitterImage: 'https://kansbe.com/assets/content2.webp'
      });

      this.seo.addFaqStructuredData(
        this.faqs.map(faq => ({
          question: faq.question,
          answer: faq.answer
        }))
      );
    }

    this.setupFooterObserver();
    this.setupScrollListener();
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

  private setupScrollListener(): void {
    window.addEventListener('scroll', () => {
      this.showScroll = window.scrollY < 200;
    });
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
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

  registerAsFreelancer(): void {
    this.router.navigate(['/freelancerlogin']);
  }

  registerAsClient(): void {
    this.router.navigate(['/clientlogin']);
  }

  navigateToHowItWorks(): void {
    this.router.navigate(['/how-kansbe-works']);
  }

  navigateToAbout(): void {
    this.router.navigate(['/about-kansbe']);
  }

  navigateToBlogs(): void {
    this.router.navigate(['/blogs']);
  }

  navigateToWhyFreelancers(): void {
    this.router.navigate(['/why-kansbe-freelancers']);
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  startAsFreelancer(): void {
    this.router.navigate(['/freelancersignup']);
  }

  joinAsClient(): void {
    this.router.navigate(['/clientsignup']);
  }
}

