import { Component, AfterViewInit, ElementRef, HostListener, ViewChild, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { SeoService } from '../core/seo.service';

interface Testimonial {
  id: number;
  name: string;
  image: string;
  testimonial: string;
  authorTitle?: string;
  isTextCard?: boolean;
  cardText?: string;
}

export interface FeatureCardData {
  number: string;
  title: string;
  description: string;
  shapeType: 'arrow' | 'gavel' | 'puzzle' | 'shield' | 'hexagon' | 'infinity';
  accent: string;
}

@Component({
  selector: 'app-new-home',
  templateUrl: './new-home.component.html',
  styleUrls: ['./new-home.component.css']
})
export class NewHomeComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('teamSection') teamSection!: ElementRef;
  @ViewChild('editorialSection') editorialSection!: ElementRef;
  @ViewChild('capabilitiesSection') capabilitiesSection!: ElementRef;
  @ViewChild('heroSection') heroSection!: ElementRef;
  @ViewChild('backgroundVideo') backgroundVideo!: ElementRef<HTMLVideoElement>;

  @ViewChildren('cardRef') cardRefs!: QueryList<ElementRef>;

  /** Typed card data array — single source of truth for all 6 features */
  cards: FeatureCardData[] = [
    {
      number: '01',
      title: 'Easy Project Posting',
      description: 'Clients post projects instantly. No browsing profiles, no shortlisting. The platform handles matching automatically.',
      shapeType: 'arrow',
      accent: '#FF4D4D'
    },
    {
      number: '02',
      title: 'No Bidding',
      description: 'No race to the bottom. Projects matched by relevance and skills not by who quotes the lowest price.',
      shapeType: 'gavel',
      accent: '#FF0100'
    },
    {
      number: '03',
      title: 'Smart Talent Matching',
      description: 'Skill-based and experience-based matching. Clients meet the right talent fast. Freelancers get aligned opportunities only.',
      shapeType: 'puzzle',
      accent: '#FF3B3B'
    },
    {
      number: '04',
      title: 'Verified Profiles',
      description: 'Freelancer profiles are not publicly searchable. Connections form only when there is genuine relevance.',
      shapeType: 'shield',
      accent: '#E84545'
    },
    {
      number: '05',
      title: 'Project Management',
      description: 'A built-in virtual office. Chat, share files, give feedback, approve work all in one secure place.',
      shapeType: 'hexagon',
      accent: '#FF5252'
    },
    {
      number: '06',
      title: 'Secure Collaboration',
      description: 'All communication encrypted. Personal details shared only when needed. Safe for clients and freelancers.',
      shapeType: 'infinity',
      accent: '#FF0100'
    }
  ];

  /** Tracks which cards have entered the viewport */
  cardVisible: boolean[] = [false, false, false, false, false, false];

  /** Tracks which thread lines should animate (fires after previous card enters) */
  threadVisible: boolean[] = [false, false, false, false, false];

  /** CTA visibility — delayed after card 6 enters */
  ctaVisible: boolean = false;

  /** Detected via matchMedia for mobile-specific animation simplification */
  isMobile: boolean = false;

  private section2Observer: IntersectionObserver | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

  showModal = false;
  showRegisterModal = false;
  menuOpen = false;

  // Modal state for Privacy and Terms
  private _isModalOpen = false;
  private _showJoinModal = false;

  get isModalOpen(): boolean {
    return this._isModalOpen;
  }

  set isModalOpen(val: boolean) {
    this._isModalOpen = val;
    this.updateBodyScrollLock();
  }

  get showJoinModal(): boolean {
    return this._showJoinModal;
  }

  set showJoinModal(val: boolean) {
    this._showJoinModal = val;
    this.updateBodyScrollLock();
  }

  modalType: 'privacy' | 'terms' | null = null;

  isAnimating = false;
  isTextAnimating = false;

  isTeamHeadlineVisible = false;
  isTeamNarrativeVisible = false;
  isTeamImageVisible = false;

  isEditorialImageVisible = false;
  isEditorialTextVisible = false;
  isCapabilitiesVisible = false;

  currentIndex: number = 0;
  activeCardIndex: number = 2;

  currentSlideIndex: number = 0;
  isSliding: boolean = false;

  private animationResetThrottle: any;
  isMobileOrTablet: boolean = false;
  isNearFooter: boolean = false;
  showScrollIndicator = true;

  curatedDomains = [
    // Slide 1
    { name: 'Programming & Tech', icon: '../../assets/pixel.png' },
    { name: 'Graphics & Design', icon: '../../assets/graphics.png' },
    { name: 'Digital Marketing', icon: '../../assets/marketing.png' },
    { name: 'Writing & Translation', icon: '../../assets/writing.png' },
    { name: 'Video & Animation', icon: '../../assets/video.png' },
    { name: 'AI Services', icon: '../../assets/AI.png' },
    { name: 'Music & Audio', icon: '../../assets/music.png' },
    { name: 'Business Solutions', icon: '../../assets/business.png' },
    { name: 'Consulting', icon: '../../assets/consult.png' },
    { name: 'Architecture & Interior Design', icon: '../../assets/architecture.png' },
    // Slide 2
    { name: 'Data Science & Analytics', icon: '../../assets/AI.png' },
    { name: 'Mobile App Development', icon: '../../assets/pixel.png' },
    { name: 'UI/UX Design', icon: '../../assets/graphics.png' },
    { name: 'SEO & Web Traffic', icon: '../../assets/marketing.png' },
    { name: 'Content Creation', icon: '../../assets/writing.png' },
    { name: 'Voice Over & Audio', icon: '../../assets/music.png' },
    { name: '3D Modeling & CAD', icon: '../../assets/video.png' },
    { name: 'Financial Consulting', icon: '../../assets/consult.png' },
    { name: 'HR & Recruiting', icon: '../../assets/business.png' },
    { name: 'Landscape Design', icon: '../../assets/architecture.png' },
    // Slide 3
    { name: 'Game Development', icon: '../../assets/pixel.png' },
    { name: 'Brand Identity', icon: '../../assets/graphics.png' },
    { name: 'Social Media Strategy', icon: '../../assets/marketing.png' },
    { name: 'Proofreading & Editing', icon: '../../assets/writing.png' },
    { name: 'Audio Editing', icon: '../../assets/music.png' },
    { name: 'Data Entry', icon: '../../assets/business.png' },
    { name: 'Virtual Assistant', icon: '../../assets/business.png' },
    { name: 'Blockchain & Crypto', icon: '../../assets/pixel.png' },
    { name: 'Photography & Editing', icon: '../../assets/video.png' },
    { name: 'Cybersecurity', icon: '../../assets/pixel.png' }
  ];

  currentDomainSlide: number = 0;

  nextDomainSlide(): void {
    if (this.currentDomainSlide < 2) {
      this.currentDomainSlide++;
    }
  }

  prevDomainSlide(): void {
    if (this.currentDomainSlide > 0) {
      this.currentDomainSlide--;
    }
  }

  ngOnInit(): void {
    // this.seo.updateTags({
    //   title: 'KANSBE | Lifestyle-Driven Freelancing for the New Generation',
    //   description: 'Escape the 9-to-5. Join the premier freelancing platform for creators and professionals seeking meaningful work, creative autonomy, and a career built on passion.',
    //   keywords: 'freelancing, hire freelancers, freelance platform, remote work, kansbe, freelancers India, web development, graphic design, digital marketing, content writing, video editing, UI UX design',
    //   canonicalUrl: 'https://kansbe.com/',
    //   ogUrl: 'https://kansbe.com/',
    //   ogImage: 'https://kansbe.com/assets/pics.webp',
    //   twitterCard: 'summary_large_image'
    // })
  }

  private updateBodyScrollLock(): void {
    if (typeof document !== 'undefined') {
      if (this._isModalOpen || this._showJoinModal) {
        document.body.classList.add('modal-open');
        document.documentElement.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    }
  }

  onCardMouseMove(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    if (card) {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    }
  }

  closeJoinModal(): void {
    this.showJoinModal = false;
  }

  /**
   * Open Privacy or Terms Modal
   * @param type - 'privacy' or 'terms'
   */
  openModal(type: 'privacy' | 'terms'): void {
    this.modalType = type;
    this.isModalOpen = true;
  }

  /**
   * Close Modal
   */
  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;

    // When closing hamburger menu (clicking X), also close register modal
    if (!this.menuOpen) {
      this.showRegisterModal = false;
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
    // Also close register modal when menu closes
    this.showRegisterModal = false;
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
    if (this.showModal) {
      this.showRegisterModal = false;
    }
    // Don't close menu anymore since Join Us is fixed
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

  startAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancersignup']);
  }

  joinAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['/clientsignup']);
  }

  registerAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['/clientlogin']);
  }

  closeAllModals(): void {
    this.showModal = false;
    this.showRegisterModal = false;
    this.menuOpen = false;
  }

  navigateToDomain(domain: string): void {
    const slug = domain.toLowerCase()
      .replace(/ & /g, '-')
      .replace(/ /g, '-');
    this.router.navigate(['/blog', slug]);
  }

  toggleRegisterModal(): void {
    this.showRegisterModal = !this.showRegisterModal;
    if (this.showRegisterModal) {
      this.showModal = false;
    }
  }

  constructor(private router: Router, private seo: SeoService) { }

  /**
   * Smooth scroll to a specific section by ID
   * @param sectionId - The ID of the section to scroll to
   */
  scrollToSection(sectionId: string): void {
    (window as any).appLogger?.info('Attempting to scroll to section:', sectionId);

    // Close menu and modals first
    this.closeMenu();

    // Small delay to ensure menu closes smoothly
    setTimeout(() => {
      const element = document.getElementById(sectionId);

      if (element) {
        (window as any).appLogger?.info('Section found, scrolling to:', sectionId);

        // Get header height to offset scroll position
        const header = document.querySelector('.header') as HTMLElement;
        const headerHeight = header ? header.offsetHeight + 40 : 100;

        // Calculate position accounting for fixed header
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } else {
        (window as any).appLogger?.error('Section not found:', sectionId);
        (window as any).appLogger?.info('Available sections:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      }
    }, 100);
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    this.closeMenu();
  }




  testimonials: Testimonial[] = [
    {
      id: 4,
      name: 'Sai Krishna',
      image: 'assets/kitti1.webp',
      testimonial: "Using Kansbe's tools, I was able to expand my wedding photography business significantly. From connecting with clients to managing shoots smoothly, Kansbe made it easier for me to focus on capturing beautiful moments and growing my brand.",
      authorTitle: 'FOUNDER, KRISHNA KATHA'
    },
    {
      id: 5,
      name: 'Arjun',
      image: 'assets/arjun1.webp',
      testimonial: "Im Arjun, a photographer passionate about capturing real moments. Kansbe gave me access to meaningful projects and the right tools to grow my skills. With their support, I'm now working with great companies and confidently building the career I've always wanted",
      authorTitle: 'FREELANCE PHOTOGRAPHER'
    }
  ];

  /**
   * Helper to get only testimonials with content.
   * This is used by the carousel logic to hide empty slots dynamically.
   */
  get filteredTestimonials(): Testimonial[] {
    return this.testimonials.filter(t =>
      t.isTextCard ||
      (t.name && t.name.trim() !== '') ||
      (t.testimonial && t.testimonial.trim() !== '') ||
      (t.image && t.image.trim() !== '')
    );
  }

  // Carousel state management
  currentVisibleIndices: number[] = [0, 1, 2];
  animationDirection: 'next' | 'prev' | null = null;
  isNewCardInPosition1: boolean = false;
  isNewCardInPosition3: boolean = false;

  /**
   * Get testimonial card at a specific visible position
   * @param position 0 = left small, 1 = middle small, 2 = right large
   */
  getCardAtPosition(position: number): Testimonial | null {
    const list = this.filteredTestimonials;
    if (list.length === 0) return null;

    // Ensure index is within range of the current filtered list
    const index = this.currentVisibleIndices[position] % list.length;
    return list[index] || null;
  }

  /**
   * Active testimonial is always the large card on the right (position 2)
   */
  get activeTestimonial(): Testimonial {
    const card = this.getCardAtPosition(2);
    return card || (this.filteredTestimonials[0] || { name: '', testimonial: '', image: '' });
  }

  /**
   * NEXT SLIDE - Right arrow click
   */
  nextSlide(): void {
    const listSize = this.filteredTestimonials.length;
    if (this.isAnimating || listSize < 2) return;

    this.isAnimating = true;
    this.isTextAnimating = true;
    this.animationDirection = 'next';
    this.isNewCardInPosition3 = false;

    setTimeout(() => {
      let nextIndex = (this.currentVisibleIndices[2] + 1) % listSize;

      // Handle smaller lists
      if (listSize > 3) {
        while (this.currentVisibleIndices.includes(nextIndex)) {
          nextIndex = (nextIndex + 1) % listSize;
        }
      }

      this.currentVisibleIndices = [
        this.currentVisibleIndices[1],
        this.currentVisibleIndices[2],
        nextIndex
      ];

      this.isNewCardInPosition3 = true;
      this.isAnimating = false;
      this.animationDirection = null;

      setTimeout(() => {
        this.isTextAnimating = false;
        this.isNewCardInPosition3 = false;
      }, 100);
    }, 400);
  }

  previousSlide(): void {
    const listSize = this.filteredTestimonials.length;
    if (this.isAnimating || listSize < 2) return;

    this.isAnimating = true;
    this.isTextAnimating = true;
    this.animationDirection = 'prev';
    this.isNewCardInPosition1 = false;

    setTimeout(() => {
      let prevIndex = this.currentVisibleIndices[0] === 0
        ? listSize - 1
        : this.currentVisibleIndices[0] - 1;

      // Handle smaller lists
      if (listSize > 3) {
        while (this.currentVisibleIndices.includes(prevIndex)) {
          prevIndex = prevIndex === 0 ? listSize - 1 : prevIndex - 1;
        }
      }

      this.currentVisibleIndices = [
        prevIndex,
        this.currentVisibleIndices[0],
        this.currentVisibleIndices[1]
      ];

      this.isNewCardInPosition1 = true;
      this.isAnimating = false;
      this.animationDirection = null;

      setTimeout(() => {
        this.isTextAnimating = false;
        this.isNewCardInPosition1 = false;
      }, 100);
    }, 400);
  }

  timeline2024 = {
    year: '2024',
    title: 'How\nKansbe Started:',
    content: 'The journey of Kansbe began in 2024 with a simple, yet bold idea" Passion as your profession". We believed work should be a spark that ignites your life, not a chain that ties you down. When a global pandemic stalled our vision, we didn\'t give up. Instead, we travelled the world, meeting creators and innovators, and learning a crucial lesson: in many places, freelancing is a celebrated as profession, but in others, it\'s just a side hustle. This fuelled our mission to create a platform that values your craft and gives you the tools to thrive.'
  };

  timeline2025 = {
    year: '2025',
    title: 'Redefining\nFreelance work',
    content: 'In 2025, with a team of passionate freelancers, we began building Kans. We faced every obstacle with a shared belief: work should fit into your life, not define it. Now in 2025, we became Kansbe which reflects more than just a platform. We are a lifestyle-driven company that empowers you to work from anywhere, on projects that light you up, and to build a life where your work is an extension of who you are.'
  };

  sectionData = {
    headline: 'Kansbe began with a simple observation.',
    narrativeParagraphs: [
      'Freelancing was giving people freedom, but it was also quietly taking away balance, privacy, and peace of mind.',
      'Freelancers were constantly chasing opportunities. Personal details were shared too easily. Boundaries between life and calls slowly disappeared.',
      'What was meant to feel independent started feeling overwhelming.',
      'Kansbe was created to change that experience.'
    ],
    teamImage: "../../assets/team.webp",
    image: "../../assets/teamm.webp",
    manifestoText: [
      'Not by pushing more speed or competition, but by bringing intention back into how freelancers and clients connect.',
      'This platform was built with one belief at its core: freelancing should support the life you want to live not consume it.',
      'In the coming months, Kansbe will expand beyond the web. Our mobile application is being built to support this same experience giving freelancers and clients a calm, secure way to connect, collaborate, and move forward from anywhere.',
      'Kansbe exists to help people build long-term independence with clarity, respect, and balance and to make freelancing a sustainable, respected way of life.'
    ]
  };
  ngAfterViewInit(): void {
    // Detect mobile/tablet layout for Section 2 scroll animation
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(max-width: 991px)');
      this.isMobile = this.mediaQuery.matches;
      this.mediaHandler = (e: MediaQueryListEvent) => {
        this.isMobile = e.matches;
      };
      this.mediaQuery.addEventListener('change', this.mediaHandler);
    }

    setTimeout(() => {
      this.setupIntersectionObservers();
      this.setupSection2Observer();
      this.checkIfMobileOrTablet();
      this.ensureVideoPlays();
    }, 100);
  }


  ngOnDestroy(): void {
    if (this.animationResetThrottle) {
      clearTimeout(this.animationResetThrottle);
    }
    if (this.section2Observer) {
      this.section2Observer.disconnect();
      this.section2Observer = null;
    }
    if (this.mediaQuery && this.mediaHandler) {
      this.mediaQuery.removeEventListener('change', this.mediaHandler);
    }
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }



  /**
   * Ensure background video plays immediately without delay
   */
  private ensureVideoPlays(): void {
    // Handle Hero Background Video
    if (this.backgroundVideo && this.backgroundVideo.nativeElement) {
      const video = this.backgroundVideo.nativeElement;
      video.muted = true; // Explicitly ensure muted for autoplay
      video.play().catch(err => {
        (window as any).appLogger?.info('Hero video playback failed:', err);
        // Retry playing once more just in case
        video.play().catch(() => { });
      });
    }


  }

  private checkIfMobileOrTablet(): void {
    this.isMobileOrTablet = window.innerWidth <= 1024;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const joinUsWrapper = document.querySelector('.fixed-join-us-wrapper');

    if (this.showModal && joinUsWrapper && !joinUsWrapper.contains(target)) {
      this.showModal = false;
    }
  }

  @HostListener('window:resize', [])
  onWindowResize(): void {
    this.checkIfMobileOrTablet();
  }





  private setupIntersectionObservers(): void {
    const options = {
      root: null,
      threshold: 0.2, // Trigger when 20% visible
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const isVisible = entry.isIntersecting;

        if (entry.target === this.capabilitiesSection?.nativeElement) {
          this.isCapabilitiesVisible = isVisible;
        } else if (entry.target === this.teamSection?.nativeElement) {
          if (isVisible) {
            this.isTeamHeadlineVisible = true;
            this.isTeamNarrativeVisible = true;
            this.isTeamImageVisible = true;
          }
        } else if (entry.target === this.editorialSection?.nativeElement) {
          if (isVisible) {
            this.isEditorialImageVisible = true;
            this.isEditorialTextVisible = true;
          }
        }
      });
    }, options);

    if (this.capabilitiesSection) observer.observe(this.capabilitiesSection.nativeElement);
    if (this.teamSection) observer.observe(this.teamSection.nativeElement);
    if (this.editorialSection) observer.observe(this.editorialSection.nativeElement);

    // Observer for Scroll Indicator and Footer
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
  }

  private setupSection2Observer(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const options: IntersectionObserverInit = {
      root: null,
      threshold: 0.15,
      rootMargin: '0px 0px -30px 0px'
    };

    this.section2Observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Find the index of this card
        const cardElements = this.cardRefs.toArray();
        const index = cardElements.findIndex(ref => ref.nativeElement === entry.target);
        if (index === -1) return;

        if (entry.isIntersecting) {
          // Card entering viewport — reveal it
          this.cardVisible[index] = true;

          // After card settles, draw the thread line below it
          if (index < this.threadVisible.length) {
            setTimeout(() => {
              this.threadVisible[index] = true;
            }, 500);
          }
        } else {
          // Card leaving viewport — reset for re-animation
          this.cardVisible[index] = false;

          // Reset the thread line above this card
          if (index > 0 && index - 1 < this.threadVisible.length) {
            this.threadVisible[index - 1] = false;
          }
          // Reset the thread line below this card
          if (index < this.threadVisible.length) {
            this.threadVisible[index] = false;
          }
        }
      });
    }, options);

    // Observe all card elements (kept observed for bidirectional animation)
    this.cardRefs.forEach(ref => {
      this.section2Observer?.observe(ref.nativeElement);
    });
  }

  getRowClass(index: number): string {
    return index % 2 !== 0 ? 'flex-lg-row-reverse' : 'flex-lg-row';
  }

  private checkScrollPosition(): void {
    // This is now simplified as most logic moved to IntersectionObserver
    // Only kept for very specific scroll-linked items if any
  }

  currentYear: number = 2026;
  currentVideoIndex: number = 0;
  videoSources: string[] = [
    '../../assets/lpage.mp4'
  ];

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  navLinks = [
    { label: 'Why kansbe', url: '/why-kansbe' },
    { label: 'Contact us', url: '/contact' },
    { label: 'About us', url: '/about' }
  ];

  selectedRegion: string = 'India';
  isRegionDropdownOpen: boolean = false;
  availableRegions: { name: string; flag: string }[] = [
    { name: 'India', flag: '🇮🇳' },
    { name: 'United States', flag: '🇺🇸' },
    { name: 'United Kingdom', flag: '🇬🇧' },
    { name: 'Canada', flag: '🇨🇦' },
    { name: 'Australia', flag: '🇦🇺' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Singapore', flag: '🇸🇬' },
    { name: 'Global', flag: '🌐' }
  ];

  toggleRegionDropdown(): void {
    this.isRegionDropdownOpen = !this.isRegionDropdownOpen;
  }

  selectRegion(regionName: string): void {
    this.selectedRegion = regionName;
    this.isRegionDropdownOpen = false;
  }

  rotateVideo(): void {
    this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videoSources.length;
    const video = this.backgroundVideo?.nativeElement;
    if (video) {
      video.src = this.videoSources[this.currentVideoIndex];
      video.load();
      video.play().catch(err => (window as any).appLogger?.info('Video rotation play error:', err));
    }
  }
}