import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { CommonModule } from '@angular/common';

interface ServiceCard {
  icon: string;
  title: string;
}

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

interface CityData {
  cityName: string;
  heroSubtext: string;
  aboutTag: string;
  aboutText: string[];
  whyReasons: string[];
  faqs: { question: string; answer: string }[];
}

const CITY_DATA: { [key: string]: CityData } = {
  hyderabad: {
    cityName: 'Hyderabad',
    heroSubtext:
      'Connect with top-rated designers, developers, marketers, and creative professionals in Hyderabad — fast, affordable, and trusted.',
    aboutTag: 'Tech & Startup Hub',
    aboutText: [
      'Hyderabad is one of India\'s fastest-growing tech and startup hubs. Whether you\'re a startup in Hitech City, a local business in Banjara Hills, or an entrepreneur launching your next idea, Kansbe helps you hire skilled freelancers in Hyderabad for design, development, marketing, content creation, and more.',
      'We connect clients with verified local freelancers who understand the Hyderabad market and deliver quality work on time.'
    ],
    whyReasons: [
      'Better understanding of local market',
      'Easy communication & time-zone alignment',
      'Affordable compared to agencies',
      'Flexible project-based hiring',
      'Startup-friendly pricing'
    ],
    faqs: [
      { question: 'How do I hire freelancers in Hyderabad on Kansbe?', answer: 'Post your project, receive proposals, compare profiles, and hire the best fit. It\'s that simple — start to finish in minutes.' },
      { question: 'Are freelancers on Kansbe verified?', answer: 'Yes, every freelancer goes through our rigorous verification process including skill assessment, portfolio review, and identity verification to ensure you get top-quality talent.' },
      { question: 'What is the cost of hiring a freelancer in Hyderabad?', answer: 'Costs depend on project scope. You can find both budget-friendly and premium freelancers.' },
      { question: 'Can I hire for short-term projects?', answer: 'Absolutely! Kansbe supports both short-term and long-term projects. Whether it\'s a one-day task or a 6-month engagement, you\'ll find the right freelancer for your needs.' }
    ]
  },
  bengaluru: {
    cityName: 'Bengaluru',
    heroSubtext:
      'Connect with top-rated designers, developers, marketers, and creative professionals in Bengaluru — fast, affordable, and trusted.',
    aboutTag: 'India\'s Silicon Valley',
    aboutText: [
      'Bengaluru is India\'s undisputed tech capital and startup ecosystem leader. Whether you\'re a startup in Koramangala, a business in Whitefield, or an entrepreneur building the next big thing, Kansbe helps you hire skilled freelancers in Bengaluru for design, development, marketing, content creation, and more.',
      'We connect clients with verified local freelancers who understand the Bengaluru market and deliver quality work on time.'
    ],
    whyReasons: [
      'Better understanding of local market',
      'Easy communication & time-zone alignment',
      'Affordable compared to agencies',
      'Flexible project-based hiring',
      'Startup-friendly pricing'
    ],
    faqs: [
      { question: 'How do I hire freelancers in Bengaluru on Kansbe?', answer: 'Post your project, receive proposals, compare profiles, and hire the best fit. It\'s that simple — start to finish in minutes.' },
      { question: 'Are freelancers on Kansbe verified?', answer: 'Yes, every freelancer goes through our rigorous verification process including skill assessment, portfolio review, and identity verification to ensure you get top-quality talent.' },
      { question: 'What is the cost of hiring a freelancer in Bengaluru?', answer: 'Costs depend on project scope. You can find both budget-friendly and premium freelancers.' },
      { question: 'Can I hire for short-term projects?', answer: 'Absolutely! Kansbe supports both short-term and long-term projects. Whether it\'s a one-day task or a 6-month engagement, you\'ll find the right freelancer for your needs.' }
    ]
  },
  mumbai: {
    cityName: 'Mumbai',
    heroSubtext:
      'Connect with top-rated designers, developers, marketers, and creative professionals in Mumbai — fast, affordable, and trusted.',
    aboutTag: 'India\'s Financial Capital',
    aboutText: [
      'Mumbai is India\'s financial and entertainment powerhouse. Whether you\'re a startup in Andheri, a business in Bandra, or an entrepreneur in Lower Parel, Kansbe helps you hire skilled freelancers in Mumbai for design, development, marketing, content creation, and more.',
      'We connect clients with verified local freelancers who understand the Mumbai market and deliver quality work on time.'
    ],
    whyReasons: [
      'Better understanding of local market',
      'Easy communication & time-zone alignment',
      'Affordable compared to agencies',
      'Flexible project-based hiring',
      'Startup-friendly pricing'
    ],
    faqs: [
      { question: 'How do I hire freelancers in Mumbai on Kansbe?', answer: 'Post your project, receive proposals, compare profiles, and hire the best fit. It\'s that simple — start to finish in minutes.' },
      { question: 'Are freelancers on Kansbe verified?', answer: 'Yes, every freelancer goes through our rigorous verification process including skill assessment, portfolio review, and identity verification to ensure you get top-quality talent.' },
      { question: 'What is the cost of hiring a freelancer in Mumbai?', answer: 'Costs depend on project scope. You can find both budget-friendly and premium freelancers.' },
      { question: 'Can I hire for short-term projects?', answer: 'Absolutely! Kansbe supports both short-term and long-term projects. Whether it\'s a one-day task or a 6-month engagement, you\'ll find the right freelancer for your needs.' }
    ]
  },
  chennai: {
    cityName: 'Chennai',
    heroSubtext:
      'Connect with top-rated designers, developers, marketers, and creative professionals in Chennai — fast, affordable, and trusted.',
    aboutTag: 'Gateway to South India',
    aboutText: [
      'Chennai is one of India\'s leading IT and manufacturing hubs. Whether you\'re a startup in OMR, a business in T. Nagar, or an entrepreneur in Anna Nagar, Kansbe helps you hire skilled freelancers in Chennai for design, development, marketing, content creation, and more.',
      'We connect clients with verified local freelancers who understand the Chennai market and deliver quality work on time.'
    ],
    whyReasons: [
      'Better understanding of local market',
      'Easy communication & time-zone alignment',
      'Affordable compared to agencies',
      'Flexible project-based hiring',
      'Startup-friendly pricing'
    ],
    faqs: [
      { question: 'How do I hire freelancers in Chennai on Kansbe?', answer: 'Post your project, receive proposals, compare profiles, and hire the best fit. It\'s that simple — start to finish in minutes.' },
      { question: 'Are freelancers on Kansbe verified?', answer: 'Yes, every freelancer goes through our rigorous verification process including skill assessment, portfolio review, and identity verification to ensure you get top-quality talent.' },
      { question: 'What is the cost of hiring a freelancer in Chennai?', answer: 'Costs depend on project scope. You can find both budget-friendly and premium freelancers.' },
      { question: 'Can I hire for short-term projects?', answer: 'Absolutely! Kansbe supports both short-term and long-term projects. Whether it\'s a one-day task or a 6-month engagement, you\'ll find the right freelancer for your needs.' }
    ]
  },
  pune: {
    cityName: 'Pune',
    heroSubtext:
      'Connect with top-rated designers, developers, marketers, and creative professionals in Pune — fast, affordable, and trusted.',
    aboutTag: 'Oxford of the East',
    aboutText: [
      'Pune is one of India\'s fastest-growing IT and education hubs. Whether you\'re a startup in Hinjawadi, a business in Koregaon Park, or an entrepreneur in Kharadi, Kansbe helps you hire skilled freelancers in Pune for design, development, marketing, content creation, and more.',
      'We connect clients with verified local freelancers who understand the Pune market and deliver quality work on time.'
    ],
    whyReasons: [
      'Better understanding of local market',
      'Easy communication & time-zone alignment',
      'Affordable compared to agencies',
      'Flexible project-based hiring',
      'Startup-friendly pricing'
    ],
    faqs: [
      { question: 'How do I hire freelancers in Pune on Kansbe?', answer: 'Post your project, receive proposals, compare profiles, and hire the best fit. It\'s that simple — start to finish in minutes.' },
      { question: 'Are freelancers on Kansbe verified?', answer: 'Yes, every freelancer goes through our rigorous verification process including skill assessment, portfolio review, and identity verification to ensure you get top-quality talent.' },
      { question: 'What is the cost of hiring a freelancer in Pune?', answer: 'Costs depend on project scope. You can find both budget-friendly and premium freelancers.' },
      { question: 'Can I hire for short-term projects?', answer: 'Absolutely! Kansbe supports both short-term and long-term projects. Whether it\'s a one-day task or a 6-month engagement, you\'ll find the right freelancer for your needs.' }
    ]
  },
  noida: {
    cityName: 'Noida',
    heroSubtext:
      'Connect with top-rated designers, developers, marketers, and creative professionals in Noida — fast, affordable, and trusted.',
    aboutTag: 'Planned Industrial Hub',
    aboutText: [
      'Noida is a major hub for IT services and outsourcing in Northern India. Whether you\'re a startup in Sector 62, a business in Film City, or an entrepreneur building your brand, Kansbe helps you hire skilled freelancers in Noida for design, development, marketing, content creation, and more.',
      'We connect clients with verified local freelancers who understand the NCR market and deliver quality work on time.'
    ],
    whyReasons: [
      'Better understanding of local market',
      'Easy communication & time-zone alignment',
      'Affordable compared to agencies',
      'Flexible project-based hiring',
      'Startup-friendly pricing'
    ],
    faqs: [
      { question: 'How do I hire freelancers in Noida on Kansbe?', answer: 'Post your project, receive proposals, compare profiles, and hire the best fit. It\'s that simple — start to finish in minutes.' },
      { question: 'Are freelancers on Kansbe verified?', answer: 'Yes, every freelancer goes through our rigorous verification process including skill assessment, portfolio review, and identity verification to ensure you get top-quality talent.' },
      { question: 'What is the cost of hiring a freelancer in Noida?', answer: 'Costs depend on project scope. You can find both budget-friendly and premium freelancers.' },
      { question: 'Can I hire for short-term projects?', answer: 'Absolutely! Kansbe supports both short-term and long-term projects. Whether it\'s a one-day task or a 6-month engagement, you\'ll find the right freelancer for your needs.' }
    ]
  }
};

@Component({
  selector: 'app-location-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './location-page.component.html',
  styleUrls: ['./location-page.component.css']
}) export class LocationPageComponent implements OnInit {

  @ViewChild('headerRef') headerRef!: ElementRef;

  isScrolled = false;
  showRegisterModal = false;
  menuOpen = false;

  // Dynamic city data
  cityName: string = '';
  heroSubtext: string = '';
  aboutTag: string = '';
  aboutText: string[] = [];
  whyReasons: string[] = [];
  footerText: string = '';
  previousPage: string | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showRegisterModal && this.headerRef) {
      const headerEl = this.headerRef.nativeElement;
      if (!headerEl.contains(event.target)) {
        this.closeAllModals();
      }
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) {
      this.showRegisterModal = false;
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.showRegisterModal = false;
  }

  toggleRegisterModal(): void {
    this.showRegisterModal = !this.showRegisterModal;
  }

  closeAllModals(): void {
    this.showRegisterModal = false;
    this.closeMenu();
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    this.closeMenu();
  }

  scrollToAbout(): void {
    this.closeMenu();
    setTimeout(() => {
      const element = document.querySelector('.about-section') as HTMLElement;
      if (element) {
        const header = document.querySelector('.header') as HTMLElement;
        const headerHeight = header ? header.offsetHeight + 40 : 100;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 80;
  }

  services: ServiceCard[] = [
    { icon: 'fa-solid fa-palette', title: 'Graphic Designers' },
    { icon: 'fa-solid fa-code', title: 'Web Developers' },
    { icon: 'fa-brands fa-android', title: 'Android App Developers' },
    { icon: 'fa-brands fa-apple', title: 'iOS Developers' },
    { icon: 'fa-solid fa-bullhorn', title: 'Digital Marketing Experts' },
    { icon: 'fa-solid fa-pen-nib', title: 'Content Writers' },
    { icon: 'fa-solid fa-film', title: 'Video Editors' },
    { icon: 'fa-solid fa-object-group', title: 'UI/UX Designers' }
  ];

  features: FeatureCard[] = [
    {
      icon: 'fa-solid fa-user-check',
      title: 'Verified Profiles',
      description: 'Every freelancer is verified through our rigorous screening process ensuring quality talent.'
    },
    {
      icon: 'fa-solid fa-tags',
      title: 'Transparent Pricing',
      description: 'No hidden fees. Know the cost upfront before you hire and manage your budget effectively.'
    },
    {
      icon: 'fa-solid fa-shield-halved',
      title: 'Secure Communication',
      description: 'Built-in secure messaging and file sharing to keep your project discussions safe.'
    },
    {
      icon: 'fa-solid fa-bolt',
      title: 'Fast Hiring Process',
      description: 'Post a project and start receiving proposals within minutes from top talent.'
    },
    {
      icon: 'fa-solid fa-flag',
      title: 'Built for India',
      description: 'Designed specifically for the Indian market with local payment support and understanding.'
    }
  ];

  industries: string[] = [
    'Startups',
    'Real Estate',
    'E-Commerce',
    'Restaurants & Cafes',
    'EdTech Companies',
    'IT Companies',
    'Influencers & Brands'
  ];

  faqs: FaqItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService
  ) { }

  registerAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancersignup']);
  }

  registerAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['/clientsignup']);
  }

  ngOnInit(): void {
    // Read the 'from' query parameter to handle back navigation
    this.route.queryParamMap.subscribe(params => {
      this.previousPage = params.get('from');
    });

    this.route.data.subscribe(data => {
      const citySlug = data['city'] || '';

      const cityData: CityData | undefined = CITY_DATA[citySlug];

      if (!cityData) {
        this.router.navigate(['/']);
        return;
      }

      // Set dynamic city data
      this.cityName = cityData.cityName;
      this.heroSubtext = cityData.heroSubtext;
      this.aboutTag = cityData.aboutTag;
      this.aboutText = cityData.aboutText;
      this.whyReasons = cityData.whyReasons;
      this.footerText = `The trusted freelance ecosystem for businesses and professionals in ${this.cityName}.`;

      // Set FAQs with isOpen state
      this.faqs = cityData.faqs.map(faq => ({
        ...faq,
        isOpen: false
      }));

      // SEO via SeoService
      this.seo.updateTags({
        title: `Hire Freelancers in ${this.cityName} | Kansbe`,
        description: `Hire skilled freelancers in ${this.cityName} for web development, design, marketing and more on Kansbe. Fast, affordable, and trusted.`,
        keywords: `hire freelancers ${this.cityName}, freelancers in ${this.cityName}, web developers ${this.cityName}, graphic designers ${this.cityName}, kansbe ${this.cityName}`,
        canonicalUrl: `https://kansbe.com/hire-freelancers-in-${citySlug}`,
        ogUrl: `https://kansbe.com/hire-freelancers-in-${citySlug}`,
        ogImage: 'https://kansbe.com/assets/pics.webp',
        twitterCard: 'summary_large_image'
      });

      // Add FAQ structured data for Google rich snippets
      this.seo.addFaqStructuredData(cityData.faqs);
    });
  }

  toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  goBack(): void {
    if (this.previousPage) {
      this.router.navigate([`/${this.previousPage}`]);
    } else {
      window.history.back();
    }
  }
}
