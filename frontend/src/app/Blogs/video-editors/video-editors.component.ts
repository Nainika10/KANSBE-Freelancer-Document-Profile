import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';
@Component({
  selector: 'app-video-editors',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './video-editors.component.html',
  styleUrls: ['./video-editors.component.css']
})
export class VideoEditorsComponent implements OnInit {
  isGlobal: boolean = false;
  activeComingSoon: string | null = null;

  showModal = false;
  showRegisterModal = false;

  // Modal state for Privacy and Terms
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;

  isNearFooter = false;
  showScrollIndicator = true;
  currentYear: number = new Date().getFullYear();

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  faqs = [
    {

      question: 'How do I find a freelance video editor in India?',
      answer: 'Create an account and share your project requirements. Kansbe aligns relevant freelance video editors based on your content goals and editing style.',
      isOpen: false
    },
    {
      question: 'What types of video editors are available?',
      answer: 'You can find cinematic editors, reels editors, post-production specialists, and digital content editors depending on your project.',
      isOpen: false
    },
    {
      question: 'Why choose freelance video editors for content projects?',
      answer: 'Freelance video editors provide flexible collaboration, creative specialization, and scalable workflows for modern digital content.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support creative collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and simplified creative workflows.',
      isOpen: false
    }
  ];

  globalFaqs = [

    {
      question: 'How do I choose the right video editor for my project?',
      answer: 'The right video editor depends on your content goals, editing style, storytelling approach, and project requirements.',
      isOpen: false
    },
    {
      question: 'What are the benefits of working with freelance video editors?',
      answer: 'Freelance video editors offer flexible collaboration, creative specialization, and scalable workflows for modern digital content projects.',
      isOpen: false
    },
    {
      question: 'How does Kansbe support video editing collaboration?',
      answer: 'Kansbe focuses on structured collaboration, requirement-based alignment, and streamlined creative workflows.',
      isOpen: false
    },
    {
      question: 'Can I find editors for long-term projects?',
      answer: 'Yes. The ecosystem supports both project-based and long-term video editing collaboration.',
      isOpen: false
    }
  ];

  specialists = [
    {
      title: 'Commercial Video Editors',
      description: 'Experts in short-form, high-impact storytelling designed for ad campaigns and social media conversion.'
    },
    {
      title: 'Documentary & Long-Form Editors',
      description: 'Masters of narrative pacing, capable of turning terabytes of raw footage into compelling stories.'
    },
    {
      title: 'Color Grading Specialists',
      description: 'Technicians who ensure visual consistency and mood alignment across every frame.'
    },
    {
      title: 'Motion Graphics Designers',
      description: 'Artists who integrate 2D/3D elements seamlessly into live-action footage.'
    }
  ];

  globalSpecialists = [
    {
      title: 'Video Editing',
      description: 'Narrative flow and visual rhythm for cinema or digital platforms.'
    },
    {
      title: 'Photo Editing',
      description: 'Color grading and retouching that preserves the soul of the frame.'
    },
    {
      title: 'Content & Text Editing',
      description: 'Structural integrity and tone refinement for high-impact writing.'
    },
    {
      title: 'Audio Editing',
      description: 'Acoustic clarity and immersive soundscape engineering.'
    },
    {
      title: 'Specialized Editing',
      description: 'Niche requirements ranging from technical documentation to avant-garde mixed media.'
    }
  ];

  workSteps = [
    { step: '01', title: 'Create Account', description: 'Get started by setting up your profile on Kansbe.' },
    { step: '02', title: 'Share Requirement', description: 'Describe your project, the footage you have, and your editing vision.' },
    { step: '03', title: 'Get Matched', description: 'Relevant video editors are aligned based on your stylistic needs and project scope.' },
    { step: '04', title: 'Start Collaborating', description: 'Connect with the selected editor and move forward with clarity and creative direction.' },
    { step: '05', title: 'Structured Payments', description: 'Payments are handled smoothly through Kansbe, ensuring a reliable process for both you and the editor.' }
  ];

  globalWorkSteps = [
    { step: '01', title: 'CREATE YOUR ACCOUNT', description: 'Get started by setting up your profile on Kansbe.' },
    { step: '02', title: 'SHARE YOUR REQUIREMENT', description: 'Describe your project, the footage you have, and your editing vision.' },
    { step: '03', title: 'GET MATCHED WITH RELEVANT EDITORS', description: 'Relevant editors are aligned based on your stylistic needs and project scope.' },
    { step: '04', title: 'START COLLABORATING', description: 'Connect with the selected editor and move forward with clarity and creative direction.' },
    { step: '05', title: 'SMOOTH AND STRUCTURED PAYMENTS', description: 'Payments are handled smoothly through Kansbe, ensuring a reliable process for both you and the editor.' }
  ];

  constructor(private router: Router, private seo: SeoService) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.isGlobal = this.router.url.includes('-global');

    if (this.isGlobal) {
      this.seo.updateTags({
        title: 'Best Freelance Video Editors | Kansbe',

        description: 'Discover freelance video editors specializing in cinematic editing, brand storytelling, post-production, reels, and digital content workflows.',

        keywords: 'best freelance video editors, video editors, freelance video editors, post-production editors, cinematic editors, reels editors, remote video editors',

        canonicalUrl: 'https://kansbe.com/best-video-editors-global',

        ogTitle: 'Best Freelance Video Editors | Kansbe',

        ogDescription: 'Explore freelance video editors for cinematic storytelling, reels, and digital content projects.',

        ogUrl: 'https://kansbe.com/best-video-editors-global',

        ogImage: 'https://kansbe.com/assets/video-bg.webp',

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

        title: 'Best Freelance Video Editors in India | Kansbe',

        description: 'Discover freelance video editors in India specializing in cinematic editing, brand storytelling, post-production, reels, and digital content workflows.',

        keywords: 'best freelance video editors in India, video editors India, freelance video editors India, cinematic editors India, reels editors India, post-production editors India',

        canonicalUrl: 'https://kansbe.com/best-video-editors-india',

        ogTitle: 'Best Freelance Video Editors in India | Kansbe',

        ogDescription: 'Explore freelance video editors in India for cinematic storytelling and digital content projects.',

        ogUrl: 'https://kansbe.com/best-video-editors-india',

        ogImage: 'https://kansbe.com/assets/video-bg.webp',

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


  private setupFooterObserver(): void {
    setTimeout(() => {
      const footerElement = document.querySelector('.kansbe-footer-section');
      if (footerElement) {
        const footerObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isNearFooter = entry.isIntersecting;
            this.showScrollIndicator = !entry.isIntersecting;
          });
        }, { threshold: 0.1 });
        footerObserver.observe(footerElement);
      }
    }, 500);
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

  showComingSoon(region: string): void {
    this.activeComingSoon = region;
    setTimeout(() => {
      if (this.activeComingSoon === region) {
        this.activeComingSoon = null;
      }
    }, 2000);
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

