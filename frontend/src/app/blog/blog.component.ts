import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface DomainContent {
  title: string;
  description: string;
  heroImage: string;
  activeExperts: string;
  successRate: string;
  subdomains: any[];
  trendingWorks: any[];
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {

  domainContent: { [key: string]: DomainContent } = {
    'programming-tech': {
      title: 'Programming & Tech',
      description: 'Technical engineering and architectural frontiers. We build the scaffolding for the future, where code meets structural elegance.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '14.2k',
      successRate: '98.4%',
      subdomains: [
        { title: 'Frontend', slug: 'frontend', description: 'Pioneering interface interaction models and declarative rendering patterns.', icon: 'bi bi-code-square' },
        { title: 'Backend', slug: 'backend', description: 'Designing distributed systems, microservices, and robust data orchestrators.', icon: 'bi bi-hdd-network' },
        { title: 'Cloud/DevOps', slug: 'cloud-devops', description: 'Continuous delivery pipelines and immutable infrastructure management.', icon: 'bi bi-gear-wide-connected' },
        { title: 'Cybersecurity', slug: 'cybersecurity', description: 'Hardening architectures through zero-trust principles and proactive audits.', icon: 'bi bi-shield-lock' }
      ],
      trendingWorks: [
        { title: 'The rise of fractional leadership roles in European tech startups.', readers: '4.2k' },
        { title: 'Cloud-native security: Beyond the perimeter and into the core.', readers: '1.9k' },
        { title: 'Microservices vs Monoliths: The architecture debate in 2024.', readers: '3.5k' },
        { title: 'Rust in Production: Why large enterprises are switching.', readers: '2.8k' },
        { title: 'Serverless computing costs: A hidden trap for scaling startups.', readers: '1.4k' }
      ]
    },
    'graphics-design': {
      title: 'Graphics & Design',
      description: 'Visual storytelling and aesthetic innovation. We craft the identities and experiences that resonate in a digital-first world.',
      heroImage: 'assets/design-bg.webp',
      activeExperts: '9.8k',
      successRate: '97.2%',
      subdomains: [
        { title: 'Logo Design', slug: 'logo-design', description: 'Creating memorable visual symbols and consistent brand marks.', icon: 'bi bi-vector-pen' },
        { title: 'Illustration', slug: 'illustration', description: 'Digital and vector artwork tailored for unique storytelling.', icon: 'bi bi-brush' },
        { title: 'Print Design', slug: 'print-design', description: 'High-quality layout design for physical media and marketing.', icon: 'bi bi-file-earmark-pdf' },
        { title: 'Brand Styling', slug: 'brand-styling', description: 'Developing full visual systems including patterns and textures.', icon: 'bi bi-palette' }
      ],
      trendingWorks: [
        { title: 'Why brutalist luxury is taking over corporate design trends.', readers: '2.8k' },
        { title: 'The impact of generative AI on professional illustration.', readers: '1.5k' },
        { title: 'Minimalist typography: Less is more in mobile-first web.', readers: '3.2k' },
        { title: 'Color psychology: How to influence user action through hues.', readers: '2.4k' },
        { title: 'Motion design: Adding life to static interfaces with micro-interactions.', readers: '1.9k' },
        { title: '3D assets in web design: The transition to spatial computing.', readers: '2.6k' }
      ]
    },
    'digital-marketing': {
      title: 'Digital Marketing',
      description: 'Strategic outreach and data-driven impact. We bridge the gap between innovation and the global marketplace.',
      heroImage: 'assets/marketing-bg.webp',
      activeExperts: '11.5k',
      successRate: '95.8%',
      subdomains: [
        { title: 'SEO Optimization', slug: 'seo', description: 'Optimizing digital presence for maximum organic visibility.', icon: 'bi bi-search' },
        { title: 'Social Media', slug: 'social-media', description: 'Building communities and engagement across all social platforms.', icon: 'bi bi-share' },
        { title: 'Email Marketing', slug: 'email-marketing', description: 'Crafting personalized campaigns that drive measurable conversions.', icon: 'bi bi-envelope' },
        { title: 'SEM / PPC', slug: 'sem-ppc', description: 'Scaling growth through targeted performance ad campaigns.', icon: 'bi bi-graph-up-arrow' }
      ],
      trendingWorks: [
        { title: 'Survival strategies for a cookieless marketing world in 2024.', readers: '5.1k' },
        { title: 'The psychology of viral content in short-form video platforms.', readers: '4.2k' },
        { title: 'Personalization at scale: The power of AI-driven messaging.', readers: '3.8k' },
        { title: 'The comeback of email: Why newsletters are the new TV.', readers: '2.9k' },
        { title: 'Influencer marketing: Moving from reach to resonance.', readers: '4.1k' },
        { title: 'SEO beyond Google: Optimizing for TikTok and Amazon.', readers: '3.4k' }
      ]
    },
    'writing-translation': {
      title: 'Writing & Translation',
      description: 'Crafting compelling narratives and bridging language barriers with precision and creative flair.',
      heroImage: 'assets/writing-bg.webp',
      activeExperts: '8.4k',
      successRate: '96.5%',
      subdomains: [
        { title: 'Copywriting', slug: 'copywriting', description: 'Persuasive content designed to drive action and sales.', icon: 'bi bi-pencil-square' },
        { title: 'Content Strategy', slug: 'content-strategy', description: 'Building long-term authority through editorial planning.', icon: 'bi bi-journal-text' },
        { title: 'Localization', slug: 'localization', description: 'Adapting products for global markets with cultural nuance.', icon: 'bi bi-translate' },
        { title: 'Ghostwriting', slug: 'ghostwriting', description: 'Professional writing that captures your unique voice and tone.', icon: 'bi bi-person-bounding-box' }
      ],
      trendingWorks: [
        { title: 'The art of the hook: Writing for attention-starved digital users.', readers: '3.3k' },
        { title: 'How translators are using AI to speed up complex localization.', readers: '2.1k' },
        { title: 'Creative Non-fiction: The growing demand for enterprise stories.', readers: '1.8k' },
        { title: 'Copywriting for SaaS: Converting technical specs into benefits.', readers: '2.5k' },
        { title: 'Ghostwriting for CEOs: How to capture a premium executive voice.', readers: '3.1k' },
        { title: 'Technical writing: Bridging the gap between engineers and users.', readers: '2.4k' }
      ]
    },
    'video-animation': {
      title: 'Video & Animation',
      description: 'Bringing stories to life through motion, sound, and visual effects for cinematic impact.',
      heroImage: 'assets/video-bg.webp',
      activeExperts: '7.2k',
      successRate: '94.9%',
      subdomains: [
        { title: 'Video Production', slug: 'video-production', description: 'Full-cycle production for commercials and corporate stories.', icon: 'bi bi-camera-reels' },
        { title: '2D/3D Animation', slug: 'animation', description: 'Constructing immersive worlds and character narratives.', icon: 'bi bi-controller' },
        { title: 'Visual Effects', slug: 'vfx', description: 'Enhancing reality with high-end CGI and compositing.', icon: 'bi bi-magic' },
        { title: 'Color Grading', slug: 'color-grading', description: 'Evoking emotion through tone and cinematic lighting.', icon: 'bi bi-brightness-high' }
      ],
      trendingWorks: [
        { title: 'Why short-form video is the absolute king of 2024 content.', readers: '6.5k' },
        { title: 'Rendering at speed: The full transition to Unreal Engine 5.', readers: '2.4k' },
        { title: 'The return of hand-drawn animation in digital advertising.', readers: '1.9k' },
        { title: 'Color grading for mood: How Hollywood styles its big hits.', readers: '3.1k' },
        { title: 'Drone cinematography: Taking visual storytelling to the skies.', readers: '2.2k' },
        { title: 'Sound design for motion: Why audio is 50% of the video.', readers: '2.8k' }
      ]
    },
    'ai-services': {
      title: 'AI Services',
      description: 'Leveraging cutting-edge artificial intelligence to automate, innovate, and solve complex problems.',
      heroImage: 'assets/ai-bg.webp',
      activeExperts: '5.1k',
      successRate: '99.1%',
      subdomains: [
        { title: 'Model Training', slug: 'model-training', description: 'Developing custom LLMs and specialized neural networks.', icon: 'bi bi-cpu' },
        { title: 'Prompt Engineering', slug: 'prompt-engineering', description: 'Optimizing AI outputs through structured input design.', icon: 'bi bi-terminal' },
        { title: 'AI Integration', slug: 'ai-integration', description: 'Seamlessly embedding AI agents into existing workflows.', icon: 'bi bi-robot' },
        { title: 'Data Labeling', slug: 'data-labeling', description: 'Preparing high-quality datasets for machine learning.', icon: 'bi bi-database' }
      ],
      trendingWorks: [
        { title: 'Fine-tuning LLMs for private enterprise data architectures.', readers: '4.8k' },
        { title: 'AI Ethics: Navigating the new frontier of digital laws.', readers: '3.1k' },
        { title: 'Prompt Engineering 2.0: Structured outputs and chain-of-thought.', readers: '2.9k' },
        { title: 'The autonomous agency: Building AI-first business units.', readers: '3.6k' },
        { title: 'Open source vs Proprietary AI: The battle for dominance.', readers: '4.2k' },
        { title: 'AI for developers: Copilots and the future of productivity.', readers: '5.1k' }
      ]
    },
    'music-audio': {
      title: 'Music & Audio',
      description: 'Auditory excellence for media, from professional scoring to high-end sound engineering.',
      heroImage: 'assets/music-bg.webp',
      activeExperts: '6.3k',
      successRate: '93.8%',
      subdomains: [
        { title: 'Sound Design', slug: 'sound-design', description: 'Creating custom soundscapes and auditory effects.', icon: 'bi bi-waveform' },
        { title: 'Music Scoring', slug: 'music-scoring', description: 'Original compositions for film, games, and advertising.', icon: 'bi bi-music-note-list' },
        { title: 'Audio Mixing', slug: 'audio-mixing', description: 'Precision balancing for professional release standards.', icon: 'bi bi-sliders' },
        { title: 'Voiceover', slug: 'voiceover', description: 'Professional vocal recording for narrations and ads.', icon: 'bi bi-mic' }
      ],
      trendingWorks: [
        { title: 'Immersive audio: The future of gaming experiences.', readers: '2.2k' },
        { title: 'Building a home studio that rivals the pros.', readers: '1.7k' }
      ]
    },
    'business-solutions': {
      title: 'Business Solutions',
      description: 'Optimizing operations and strategy to scale growth and enhance enterprise efficiency.',
      heroImage: 'assets/business-bg.webp',
      activeExperts: '10.2k',
      successRate: '95.2%',
      subdomains: [
        { title: 'Project Management', slug: 'pm', description: 'Leading teams through complex project lifecycles.', icon: 'bi bi-kanban' },
        { title: 'Operations Consulting', slug: 'ops', description: 'Streamlining processes for maximum performance.', icon: 'bi bi-gear' },
        { title: 'ERP Integration', slug: 'erp', description: 'Connecting enterprise resources for unified data.', icon: 'bi bi-plus-circle' },
        { title: 'Sales Strategy', slug: 'sales', description: 'Building scalable revenue engines and lead pipelines.', icon: 'bi bi-cart-check' }
      ],
      trendingWorks: [
        { title: 'Fractional COOs: The new way to scale startups.', readers: '3.9k' },
        { title: 'Agile vs Waterfall in a remote-first world.', readers: '2.5k' }
      ]
    },
    'consulting': {
      title: 'Consulting',
      description: 'Professional guidance for the modern era. We provide the strategic clarity and actionable roadmaps needed to navigate complex business landscapes.',
      heroImage: 'assets/consulting-bg.webp',
      activeExperts: '4.8k',
      successRate: '96.2%',
      subdomains: [
        { title: 'Strategy Consulting', slug: 'strategy', description: 'High-level business planning and growth roadmaps.', icon: 'bi bi-compass' },
        { title: 'Financial Advisory', slug: 'finance', description: 'Optimizing fiscal health and investment strategies.', icon: 'bi bi-cash-stack' },
        { title: 'HR & Culture', slug: 'hr', description: 'Building resilient teams and professional environments.', icon: 'bi bi-people' },
        { title: 'Risk Management', slug: 'risk', description: 'Identifying and mitigating organizational vulnerabilities.', icon: 'bi bi-exclamation-triangle' }
      ],
      trendingWorks: [
        { title: 'The rise of specialized boutique consultancies.', readers: '1.2k' },
        { title: 'Digital transformation: A roadmap for 2024.', readers: '2.1k' }
      ]
    },
    'architecture-design': {
      title: 'Architecture & Interior Design',
      description: 'Reimagining spaces for living and working. We blend functionality with high-end aesthetics to create environments that inspire.',
      heroImage: 'assets/architecture-bg.webp',
      activeExperts: '3.5k',
      successRate: '94.8%',
      subdomains: [
        { title: 'Residential Design', slug: 'residential', description: 'Crafting bespoke living spaces tailored to your lifestyle.', icon: 'bi bi-house-door' },
        { title: 'Commercial Architecture', slug: 'commercial', description: 'Designing functional and inspiring corporate environments.', icon: 'bi bi-building' },
        { title: 'Interior Styling', slug: 'interior', description: 'Elevating interiors through curated furniture and decor.', icon: 'bi bi-stars' },
        { title: 'Urban Planning', slug: 'urban', description: 'Sustainable design for communities and public spaces.', icon: 'bi bi-map' }
      ],
      trendingWorks: [
        { title: 'Sustainable materials in modern architecture.', readers: '2.5k' },
        { title: 'The psychology of color in office design.', readers: '1.8k' }
      ]
    },
    'ai-tech-development': {
      title: 'AI & Tech Development',
      description: 'Engineering the next wave of intelligent solutions. From custom algorithms to full-stack tech ecosystems.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '12.1k',
      successRate: '97.9%',
      subdomains: [
        { title: 'App Development', slug: 'app-dev', description: 'Building high-performance mobile and web applications.', icon: 'bi bi-phone' },
        { title: 'Custom Software', slug: 'custom-software', description: 'Tailored digital solutions for unique business needs.', icon: 'bi bi-terminal-plus' },
        { title: 'Tech Audits', slug: 'tech-audit', description: 'Evaluating and optimizing existing technology stacks.', icon: 'bi bi-clipboard-check' },
        { title: 'System Architecture', slug: 'architecture', description: 'Designing scalable and resilient digital infrastructures.', icon: 'bi bi-diagram-3' }
      ],
      trendingWorks: [
        { title: 'Low-code vs Custom code: Finding the right balance for scale.', readers: '4.5k' },
        { title: 'The future of Web4: A decentralized and AI-powered perspective.', readers: '3.1k' },
        { title: 'Frontend frameworks: Beyond React and into the future.', readers: '2.8k' },
        { title: 'Edge computing: Moving logic closer to the global user.', readers: '3.4k' },
        { title: 'Cybersecurity for startups: Protecting your seed data.', readers: '1.9k' },
        { title: 'API-First Design: Building for a connected ecosystem.', readers: '2.2k' }
      ]
    },
    'ai-automation': {
      title: 'AI & Automation',
      description: 'Streamlining workflows through intelligent automation. We help businesses reclaim their time by connecting AI with daily operations.',
      heroImage: 'assets/ai-bg.webp',
      activeExperts: '8.6k',
      successRate: '98.7%',
      subdomains: [
        { title: 'Workflow Automation', slug: 'workflow', description: 'Connecting apps to automate repetitive business tasks.', icon: 'bi bi-lightning-charge' },
        { title: 'Bot Development', slug: 'bots', description: 'Creating custom chat and process bots for engagement.', icon: 'bi bi-robot' },
        { title: 'Process Optimization', slug: 'optimization', description: 'Auditing and re-engineering workflows for speed.', icon: 'bi bi-speedometer2' },
        { title: 'Tool Integration', slug: 'integration', description: 'Unifying your tech stack for seamless data flow.', icon: 'bi bi-link-45deg' }
      ],
      trendingWorks: [
        { title: 'Reclaiming 20 hours a week with no-code automation.', readers: '5.2k' },
        { title: 'Generative AI in customer service workflows.', readers: '3.9k' }
      ]
    },
    'data-analytics': {
      title: 'Data & Analytics',
      description: 'Turning raw data into strategic intelligence. We provide the insights that drive informed decision-making and business growth.',
      heroImage: 'assets/business-bg.webp',
      activeExperts: '6.7k',
      successRate: '96.4%',
      subdomains: [
        { title: 'Data Visualization', slug: 'viz', description: 'Creating interactive dashboards and visual stories.', icon: 'bi bi-pie-chart' },
        { title: 'Business Intelligence', slug: 'bi', description: 'Leveraging data to uncover market opportunities.', icon: 'bi bi-graph-up' },
        { title: 'Data Engineering', slug: 'data-eng', description: 'Building the pipelines for reliable and clean data.', icon: 'bi bi-database-gear' },
        { title: 'Big Data Strategy', slug: 'big-data', description: 'Scaling data architectures for massive information.', icon: 'bi bi-layers' }
      ],
      trendingWorks: [
        { title: 'Data-driven decision making for small businesses.', readers: '2.8k' },
        { title: 'The ethics of big data Analytics in 2024.', readers: '1.5k' }
      ]
    },
    'photography': {
      title: 'Photography',
      description: 'Capturing moments through a professional lens. We provide the visual clarity and artistic perspective needed to tell your brand story.',
      heroImage: 'assets/camera.webp',
      activeExperts: '4.2k',
      successRate: '97.5%',
      subdomains: [
        { title: 'Product Photography', slug: 'product', description: 'High-end studio shots for e-commerce and retail.', icon: 'bi bi-box-seam' },
        { title: 'Corporate Portraits', slug: 'portraits', description: 'Professional headshots and team photography.', icon: 'bi bi-person-badge' },
        { title: 'Event Coverage', slug: 'events', description: 'Full-cycle photography for conferences and launches.', icon: 'bi bi-calendar-event' },
        { title: 'Fashion & Editorial', slug: 'fashion', description: 'Creative visual narratives for magazines and brands.', icon: 'bi bi-image' }
      ],
      trendingWorks: [
        { title: 'Lighting techniques for minimalist product shots.', readers: '1.8k' },
        { title: 'The future of mobile photography in advertising.', readers: '2.4k' }
      ]
    },
    'mobile-apps': {
      title: 'Mobile Apps',
      description: 'Engineering the next generation of mobile experiences. We build high-performance applications for iOS and Android.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '9.1k',
      successRate: '98.2%',
      subdomains: [
        { title: 'iOS Development', slug: 'ios', description: 'Native Swift and SwiftUI development for the Apple ecosystem.', icon: 'bi bi-apple' },
        { title: 'Android Development', slug: 'android', description: 'Kotlin and Jetpack Compose for modern Android apps.', icon: 'bi bi-android2' },
        { title: 'React Native', slug: 'react-native', description: 'High-performance cross-platform mobile solutions.', icon: 'bi bi-code-slash' },
        { title: 'Flutter', slug: 'flutter', description: 'Expressive and fast UI development for all mobile platforms.', icon: 'bi bi-phone-flip' }
      ],
      trendingWorks: [
        { title: 'Optimizing app performance for low-bandwidth users.', readers: '3.1k' },
        { title: 'The rise of super-apps in the global marketplace.', readers: '4.5k' }
      ]
    },
    'e-commerce': {
      title: 'E-commerce',
      description: 'Building the digital storefronts of tomorrow. We specialize in high-conversion retail platforms and global marketplaces.',
      heroImage: 'assets/business-bg.webp',
      activeExperts: '7.8k',
      successRate: '96.9%',
      subdomains: [
        { title: 'Shopify Development', slug: 'shopify', description: 'Custom Shopify themes and app integrations.', icon: 'bi bi-shop' },
        { title: 'WooCommerce', slug: 'woo', description: 'Flexible WordPress-based retail solutions.', icon: 'bi bi-cart' },
        { title: 'Custom Marketplaces', slug: 'marketplaces', description: 'Multi-vendor platforms for specialized industries.', icon: 'bi bi-people' },
        { title: 'Payment Integration', slug: 'payments', description: 'Secure and seamless checkout experiences.', icon: 'bi bi-credit-card' }
      ],
      trendingWorks: [
        { title: 'Conversion rate optimization for luxury brands.', readers: '2.9k' },
        { title: 'The impact of social commerce on retail growth.', readers: '5.2k' }
      ]
    }
  };

  currentDomain!: DomainContent;

  constructor(private route: ActivatedRoute, private router: Router) { }

  fromSource: string | null = null;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['domain'] || 'programming-tech';
      this.currentDomain = this.domainContent[slug] || this.domainContent['programming-tech'];
    });

    this.route.queryParams.subscribe(params => {
      this.fromSource = params['from'] || null;
    });
  }

  goBack(): void {
    if (this.fromSource === 'blogs') {
      this.router.navigate(['/blogs']);
    } else {
      this.router.navigate(['/'], { fragment: 'capabilities' });
    }
  }

  navigateToSubdomain(subSlug: string): void {
    this.router.navigate(['/sub-domain', subSlug]);
  }

  // ============================================
  // FOOTER METHODS & PROPERTIES (CLONED FROM HOME)
  // ============================================
  currentYear: number = 2026;
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

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

  scrollToSection(sectionId: string): void {
    // Navigate home with fragment for these specific sections
    if (['section1', 'timeline-section', 'contact', 'capabilities'].includes(sectionId)) {
      this.router.navigate(['/'], { fragment: sectionId });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  registerAsFreelancer(): void {
    this.router.navigate(['/freelancerlogin']);
  }

  registerAsClient(): void {
    this.router.navigate(['/clientlogin']);
  }

  toggleModal(): void {
    this.router.navigate(['/freelancersignup']);
  }

  navigateToSignup(): void {
    this.router.navigate(['/freelancersignup']);
  }

  navigateToBlogs(): void {
    this.router.navigate(['/blogs']);
  }
}
