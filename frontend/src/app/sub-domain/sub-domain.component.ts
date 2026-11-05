import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface SubDomainContent {
  title: string;
  description: string;
  heroImage: string;
  activeExperts: string;
  successRate: string;
  overviewHeading: string;
  overviewText: string[];
  toolkit: any[];
  trendingWorks: any[];
}

@Component({
  selector: 'app-sub-domain',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sub-domain.component.html',
  styleUrls: ['./sub-domain.component.css']
})
export class SubDomainComponent implements OnInit {

  subdomainData: { [key: string]: SubDomainContent } = {
    'frontend': {
      title: 'Frontend & UI Engineering',
      description: 'Pioneering interface interaction models and declarative rendering patterns for the modern web.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '14.2k', successRate: '98.4%',
      overviewHeading: 'Frontend Overview',
      overviewText: [
        "In a digital-first era, the frontend is more than just a presentation layer; it's the primary engine of user engagement and business value.",
        "We specialize in high-performance application architectures, leveraging the power of modern frameworks like React, Next.js, and Angular to build deep-interactive experiences.",
        "Our approach combines aesthetic perfection with engineering discipline, ensuring accessibility, speed, and seamless cross-platform compatibility."
      ],
      toolkit: [
        { label: 'JS', name: 'React & Next.js', desc: 'The industry-standard library for building modern UIs.', icon: '' },
        { label: 'CSS', name: 'Tailwind CSS', desc: 'Utility-first CSS for rapid design-led development.', icon: '' },
        { label: '', name: 'TypeScript', desc: 'Static typing for building scalable and error-free apps.', icon: 'bi bi-shield-check' },
        { label: '', name: 'Vite', desc: 'The next generation of frontend tooling.', icon: 'bi bi-lightning-charge' }
      ],
      trendingWorks: [
        { id: '01', title: 'The state of server components in production environments.', readers: '4.2k' },
        { id: '02', title: 'Mastering micro-frontend orchestration at global scale.', readers: '2.5k' },
        { id: '03', title: 'Next.js 14: Radical performance benchmarks.', readers: '1.9k' },
        { id: '04', title: 'The future of CSS: Container queries and layers.', readers: '3.1k' },
        { id: '05', title: 'WebAssembly in the browser: Hardcore performance.', readers: '1.4k' },
        { id: '06', title: 'Hydration vs Resumability: The rendering war.', readers: '2.8k' }
      ]
    },
    'backend': {
      title: 'Systems & Backend Architecture',
      description: 'Building distributed systems, fault-tolerant APIs, and robust data orchestrators that power global businesses.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '12.8k', successRate: '97.2%',
      overviewHeading: 'Backend Systems',
      overviewText: [
        "Behind every great experience is a robust architecture that manages state, enforces security, and scales to millions of requests.",
        "We focus on microservices, event-driven messaging, and serverless compute models to ensure your infrastructure is ready for the future.",
        "We believe in the philosophy of 'secure by default' and 'data-first' engineering, building resilient systems that stand the test of time."
      ],
      toolkit: [
        { label: 'NODE', name: 'NextJS & Node.js', desc: 'The leading ecosystem for modern server-side apps.', icon: '' },
        { label: 'DB', name: 'PostgreSQL', desc: 'High-performance relational data storage.', icon: '' },
        { label: '', name: 'GraphQL', desc: 'Efficient data fetching with specialized query models.', icon: 'bi bi-shuffle' },
        { label: '', name: 'Redis', desc: 'Extreme performance with in-memory data structures.', icon: 'bi bi-speedometer2' }
      ],
      trendingWorks: [
        { id: '01', title: 'Why Go is becoming the language of infrastructure.', readers: '3.8k' },
        { id: '02', title: 'Event-sourcing patterns in distributed backend systems.', readers: '2.1k' },
        { id: '03', title: 'PostgreSQL vs NoSQL: Making the final choice.', readers: '4.5k' },
        { id: '04', title: 'Zero-downtime migrations: Strategies for scale.', readers: '1.7k' },
        { id: '05', title: 'Rust for the backend: Performance at what cost?', readers: '2.9k' },
        { id: '06', title: 'Caching strategies for 10M+ concurrent users.', readers: '3.4k' }
      ]
    },
    'cloud-devops': {
      title: 'Cloud & Infrastructure Engineering',
      description: 'Engineering immutable infrastructure, automated delivery pipelines, and global cloud scale.',
      heroImage: 'assets/tech-bg.webp', // Reuse a high-tech image
      activeExperts: '9.4k', successRate: '99.1%',
      overviewHeading: 'Cloud Operations',
      overviewText: [
        "Moving from traditional operations to modern Cloud Engineering means embracing Infrastructure as Code (IaC) and zero-downtime deployments.",
        "We help organizations migrate to highly available cloud architectures on AWS, GCP, and Azure, while optimizing for cost and performance.",
        "Continuous Delivery is not a goal; it's a standard. We automate everything from testing to production releases."
      ],
      toolkit: [
        { label: '', name: 'Kubernetes', desc: 'Orchestrating containerized systems at scale.', icon: 'bi bi-gear-wide-connected' },
        { label: '', name: 'Terraform', desc: 'Industry-leading Infrastructure as Code tool.', icon: 'bi bi-diagram-3' },
        { label: '', name: 'Docker', desc: 'Ensuring consistent environments from dev to prod.', icon: 'bi bi-cpu' },
        { label: 'AWS', name: 'AWS Cloud Services', desc: 'Global computing with maximum reliability.', icon: '' }
      ],
      trendingWorks: [
        { id: '01', title: 'The full cost of serverless: When to stick to K8s.', readers: '5.1k' },
        { id: '02', title: 'Zero-trust security in the cloud-native era.', readers: '3.2k' },
        { id: '03', title: 'GitOps workflows for multi-region clusters.', readers: '2.8k' },
        { id: '04', title: 'FinOps: Optimizing your cloud spend at scale.', readers: '1.9k' },
        { id: '05', title: 'The state of platform engineering in 2024.', readers: '4.2k' },
        { id: '06', title: 'Automated remediation: Beyond basic alerting.', readers: '2.5k' }
      ]
    },
    'cybersecurity': {
      title: 'Global Cybersecurity & Trust',
      description: 'Hardening architectures through proactive audits, zero-trust principles, and cryptographic engineering.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '6.8k', successRate: '99.8%',
      overviewHeading: 'Security Audit',
      overviewText: [
        "Security is no longer a box to check; it's a fundamental part of the architectural design of any modern application.",
        "We provide end-to-end security audits, penetration testing, and implementation of advanced cryptographic protocols to keep data safe.",
        "Our expertise spans from identity management to secure supply chain practices, ensuring your ecosystem is resilient to evolving threats."
      ],
      toolkit: [
        { label: '', name: 'Zero Trust Control', desc: 'Implementing strict verification for every user.', icon: 'bi bi-shield-lock' },
        { label: '', name: 'Penetration Testing', desc: 'Proactively identifying system vulnerabilities.', icon: 'bi bi-search' },
        { label: 'SSL', name: 'Cryptographic Auth', desc: 'Advanced encryption for data-at-rest and transit.', icon: '' },
        { label: '', name: 'Security Compliance', desc: 'Ensuring GDPR, HIPAA, and SOC2 standards.', icon: 'bi bi-check-circle' }
      ],
      trendingWorks: [
        { id: '01', title: 'Defending against AI-driven phishing attacks.', readers: '4.5k' },
        { id: '02', title: 'Post-quantum cryptography: Are you prepared?', readers: '2.8k' },
        { id: '03', title: 'The evolution of Ransomware-as-a-Service.', readers: '3.9k' },
        { id: '04', title: 'Securing the software supply chain: SBOMs.', readers: '1.7k' },
        { id: '05', title: 'Privacy-preserving compute in the cloud.', readers: '2.1k' },
        { id: '06', title: 'Mastering the NIST cybersecurity framework.', readers: '3.4k' }
      ]
    },
    'logo-design': {
      title: 'Logo & Visual Identity',
      description: 'Creating iconic visual symbols that communicate brand essence across all digital and physical mediums.',
      heroImage: 'assets/design-bg.webp',
      activeExperts: '8.2k', successRate: '96.5%',
      overviewHeading: 'Brand Identity',
      overviewText: [
        "A logo is more than just a mark; it is the visual heartbeat of a commercial entity and its first promise to a customer.",
        "We specialize in minimalist and timeless logo design, using golden ratio principles and semantic color theory to ensure impact.",
        "Our collaborative design process ensures that your visual identity works seamlessly from small favicons to large-scale billboards."
      ],
      toolkit: [
        { label: 'AI', name: 'Adobe Illustrator', desc: 'Vector precision for high-end brand marks.', icon: '' },
        { label: '', name: 'Logo Grid Systems', desc: 'Architectural balance for timeless designs.', icon: 'bi bi-grid-3x3' },
        { label: '', name: 'Brand Typography', desc: 'Curating fonts that speak the brand voice.', icon: 'bi bi-fonts' },
        { label: '', name: 'Color Psychology', desc: 'Scientific color pairing for emotional resonance.', icon: 'bi bi-palette' }
      ],
      trendingWorks: [
        { id: '01', title: 'Why minimalist logos are returning to maximalism.', readers: '3.1k' },
        { id: '02', title: 'Designing for the metaverse: Fluid logo identities.', readers: '1.9k' },
        { id: '03', title: 'Generative design: AI as a co-creator.', readers: '2.5k' },
        { id: '04', title: 'The psychology of color in luxury branding.', readers: '4.2k' },
        { id: '05', title: 'Variable fonts: The future of brand typography.', readers: '1.4k' },
        { id: '06', title: 'Motion branding: Logos that live in 3D.', readers: '2.1k' }
      ]
    },
    'seo': {
      title: 'SEO & Growth Strategy',
      description: 'Maximizing organic visibility through data-driven technical audits and content excellence.',
      heroImage: 'assets/marketing-bg.webp',
      activeExperts: '10.5k', successRate: '95.1%',
      overviewHeading: 'Growth Engine',
      overviewText: [
        "SEO is now at the intersection of technical excellence, user experience, and specialized content authority.",
        "We help brands dominate the search landscape through deep keyword research, technical site architecture, and backlink strategies.",
        "Growth is a science. We use real-time analytics to monitor rankings and adapt strategies to the ever-changing algorithms of major search engines."
      ],
      toolkit: [
        { label: '', name: 'Search Consoles', desc: 'Direct feedback from the world’s major search engines.', icon: 'bi bi-search' },
        { label: '', name: 'Technical Audits', desc: 'Fixing crawl errors and site speed issues.', icon: 'bi bi-speedometer2' },
        { label: 'Data', name: 'A/B Testing Content', desc: 'Scientific conversion rate optimization.', icon: '' },
        { label: '', name: 'Backlink Analysis', desc: 'Building authority through trust and relevance.', icon: 'bi bi-link-45deg' }
      ],
      trendingWorks: [
        { id: '01', title: 'AI-generated content and the new Google standards.', readers: '5.8k' },
        { id: '02', title: 'Voice search SEO: Optimizing for a screenless future.', readers: '2.4k' },
        { id: '03', title: 'Entity-based SEO: Beyond simple keywords.', readers: '3.7k' },
        { id: '04', title: 'Core Web Vitals: The performance-ranking link.', readers: '4.2k' },
        { id: '05', title: 'Local SEO strategies for global franchises.', readers: '1.9k' },
        { id: '06', title: 'The decline of the backlink: Reality or myth?', readers: '2.8k' }
      ]
    },
    'vfx': {
      title: 'Visual Effects & Motion Graphics',
      description: 'Blending reality with imagination through high-end CGI, compositing, and dynamic effects.',
      heroImage: 'assets/video-bg.webp',
      activeExperts: '5.4k', successRate: '94.2%',
      overviewHeading: 'Creative Motion',
      overviewText: [
        "VFX is where storytelling meets cutting-edge technology. We bring the impossible to the screen through precision and artistry.",
        "From particle simulations to photorealistic environments, our VFX team pushes the boundaries of digital visual storytelling.",
        "We specialize in seamless compositing, ensuring that CGI elements look as real as the practical footage they live in."
      ],
      toolkit: [
        { label: 'AE', name: 'After Effects', desc: ' Industry-standard for motion design and 2D VFX.', icon: '' },
        { label: 'C4D', name: 'Cinema 4D', desc: 'High-end 3D modeling and animation suite.', icon: '' },
        { label: '', name: 'Particle FX', desc: 'Realistic smoke, fire, and liquid simulations.', icon: 'bi bi-magic' },
        { label: '', name: 'Color Grading', desc: 'Evoking emotion through specialized color tones.', icon: 'bi bi-brightness-high' }
      ],
      trendingWorks: [
        { id: '01', title: 'Why real-time rendering in Unreal is the future.', readers: '4.1k' },
        { id: '02', title: 'Mastering liquid shaders in a remote pipeline.', readers: '1.5k' },
        { id: '03', title: 'Neural rendering: AI-powered world building.', readers: '3.2k' },
        { id: '04', title: 'Virtual production vs Traditional green screen.', readers: '2.7k' },
        { id: '05', title: 'Procedural workflows for massive environment art.', readers: '1.9k' },
        { id: '06', title: 'The physics of light: Advanced raytracing.', readers: '2.4k' }
      ]
    },
    'model-training': {
      title: 'AI Model Training & R&D',
      description: 'Developing custom LLMs, specialized neural networks, and high-performance datasets for enterprise AI.',
      heroImage: 'assets/ai-bg.webp',
      activeExperts: '4.2k', successRate: '99.5%',
      overviewHeading: 'AI Solutions',
      overviewText: [
        "In the AI age, the quality of your output is defined by the quality of your training data and architecture.",
        "We help organizations build fine-tuned LLMs on private datasets, ensuring security, privacy, and industry-specific expertise.",
        "Our R&D team works at the edge of machine learning, implementing the latest transformers and diffusion models into business workflows."
      ],
      toolkit: [
        { label: 'PY', name: 'PyTorch / TensorFlow', desc: 'Core frameworks for deep learning and neural ops.', icon: '' },
        { label: '', name: 'Dataset Curation', desc: 'Cleaning and labeling vast sets of training data.', icon: 'bi bi-database-check' },
        { label: '', name: 'GPU Clusters', desc: 'High-performance cloud compute for model training.', icon: 'bi bi-cpu' },
        { label: '', name: 'NLP Models', desc: 'Advanced natural language processing engines.', icon: 'bi bi-chat-left-text' }
      ],
      trendingWorks: [
        { id: '01', title: 'Fine-tuning GPT models on private medical data.', readers: '4.7k' },
        { id: '02', title: 'Low-latency inference for real-time AI agents.', readers: '3.1k' },
        { id: '03', title: 'Reinforcement learning from human feedback (RLHF).', readers: '2.9k' },
        { id: '04', title: 'Vector databases: The long-term memory for AI.', readers: '5.2k' },
        { id: '05', title: 'Quantization: Running LLMs on consumer hardware.', readers: '1.8k' },
        { id: '06', title: 'Multi-modal architectures: Vision meets logic.', readers: '3.4k' }
      ]
    },
    'illustration': {
      title: 'Digital Illustration & Concept Art',
      description: 'Bringing narratives to life through unique visual styles and custom digital artwork.',
      heroImage: 'assets/design-bg.webp',
      activeExperts: '5.8k', successRate: '96.2%',
      overviewHeading: 'Visual Narrative',
      overviewText: [
        "Illustration is the soul of brand storytelling. It provides a unique voice that stock photography cannot replicate.",
        "We specialize in vector art, raster illustration, and conceptual character design for digital products and publishing.",
        "Our process involves deep research into brand mood and tone before the first stroke is even made."
      ],
      toolkit: [
        { label: 'IP', name: 'Procreate / Photoshop', desc: 'Industry-standard tools for professional digital art.', icon: '' },
        { label: '', name: 'Vector Mastery', desc: 'Clean, infinitely scalable graphics for any medium.', icon: 'bi bi-vector-pen' },
        { label: '', name: 'Concept Design', desc: 'Building entire visual worlds from a simple brief.', icon: 'bi bi-lightbulb' },
        { label: '', name: 'Storyboarding', desc: 'Visualizing action and flow for motion projects.', icon: 'bi bi-layers' }
      ],
      trendingWorks: [
        { id: '01', title: 'The return of 90s hand-drawn aesthetics in SaaS.', readers: '2.4k' },
        { id: '02', title: 'Using generative AI as a sketching tool.', readers: '1.8k' },
        { id: '03', title: 'Visual storytelling: Beyond static characters.', readers: '3.1k' },
        { id: '04', title: 'Isometric design in the age of flat 2.0.', readers: '2.5k' },
        { id: '05', title: 'Digital painting: Emulating traditional oils.', readers: '1.4k' },
        { id: '06', title: 'The ethics of copyright in AI-assisted art.', readers: '4.2k' }
      ]
    },
    'social-media': {
      title: 'Social Media & Community Growth',
      description: 'Building authentic connections and scaling brand presence across all major social ecosystems.',
      heroImage: 'assets/marketing-bg.webp',
      activeExperts: '12.4k', successRate: '94.8%',
      overviewHeading: 'Social Strategy',
      overviewText: [
        "Modern social media is about community, not just broadcasting. We focus on building loyalty and active engagement.",
        "We manage end-to-end social strategy, from content creation and scheduling to community management and paid social ads.",
        "Our data-first approach ensures that every post contributes to a measurable business objective."
      ],
      toolkit: [
        { label: '', name: 'Paid Social Ads', desc: 'Precision targeting for maximum ROI on social spend.', icon: 'bi bi-megaphone' },
        { label: '', name: 'Community Management', desc: 'Fostering 1-to-1 relationships at a global scale.', icon: 'bi bi-people' },
        { label: 'DATA', name: 'Engagement Analytics', desc: 'Deep-dive metrics into what truly drives clicks.', icon: '' },
        { label: '', name: 'Viral Content Hooks', desc: 'Engineering content for high-shareability potential.', icon: 'bi bi-lightning' }
      ],
      trendingWorks: [
        { id: '01', title: 'Why community-led growth is the new standard.', readers: '4.1k' },
        { id: '02', title: 'Mastering the algorithm: Short-form strategy.', readers: '3.5k' },
        { id: '03', title: 'The decline of the mega-influencer.', readers: '2.8k' },
        { id: '04', title: 'Social proof: The science of trust engineering.', readers: '5.1k' },
        { id: '05', title: 'Dark social: Measuring the unmeasurable.', readers: '1.2k' },
        { id: '06', title: 'Building brand subcultures on niche platforms.', readers: '2.4k' }
      ]
    },
    'copywriting': {
      title: 'Direct Response & Brand Copywriting',
      description: 'Engineering words that drive action, build trust, and define professional brand voices.',
      heroImage: 'assets/writing-bg.webp',
      activeExperts: '9.1k', successRate: '97.4%',
      overviewHeading: 'The Art of Persuasion',
      overviewText: [
        "Copywriting is the strategic bridge between a product's features and the user's emotional needs.",
        "We specialize in high-conversion sales pages, landing page copy, and professional brand storytelling.",
        "Our writers focus on clarity, brevity, and the psychological hooks that move users from interest to action."
      ],
      toolkit: [
        { label: '', name: 'Conversion Logic', desc: 'Evidence-based writing that increases sign-up rates.', icon: 'bi bi-graph-up' },
        { label: '', name: 'UX Writing', desc: 'Clear, concise micro-copy for app interfaces.', icon: 'bi bi-layout-text-window' },
        { label: 'VIBE', name: 'Brand Voice Guides', desc: 'Ensuring consistency across every touchpoint.', icon: '' },
        { label: '', name: 'Headlining Systems', desc: 'Crafting hooks that stop the scroll.', icon: 'bi bi-type-h1' }
      ],
      trendingWorks: [
        { id: '01', title: 'How to write for a 5-second attention span.', readers: '3.8k' },
        { id: '02', title: 'The ethics of persuasive copy in fintech.', readers: '1.2k' },
        { id: '03', title: 'Semantic SEO and its impact on copywriting.', readers: '2.5k' },
        { id: '04', title: 'The return of the long-form sales letter.', readers: '1.9k' },
        { id: '05', title: 'Micro-copy: The unsung hero of UX design.', readers: '3.1k' },
        { id: '06', title: 'AI prompting: The next phase of copywriting.', readers: '4.4k' }
      ]
    },
    'video-production': {
      title: 'Full-Cycle Video Production',
      description: 'From concept to final cut, we create cinematic stories that elevate your brand narrative.',
      heroImage: 'assets/video-bg.webp',
      activeExperts: '6.5k', successRate: '95.5%',
      overviewHeading: 'Cinema Production',
      overviewText: [
        "Video is the most powerful medium for emotional connection. We handle the entire creative and technical process.",
        "Our experts range from cinematographers and sound recordists to creative directors and post-production specialists.",
        "Whether it is a 15-second social ad or a 10-minute brand documentary, we deliver high-end cinematic quality."
      ],
      toolkit: [
        { label: '4K', name: 'High-End Cinematography', desc: 'Using professional RED/Arri-grade equipment and logic.', icon: '' },
        { label: '', name: 'Directing & Vision', desc: 'Guiding talent and crew toward a unified message.', icon: 'bi bi-person-badge' },
        { label: '', name: 'Post-Production', desc: 'Polishing footage into a professional final product.', icon: 'bi bi-film' },
        { label: '', name: 'Lighting Design', desc: 'Sculpting mood and focus through specialized gear.', icon: 'bi bi-brightness-high' }
      ],
      trendingWorks: [
        { id: '01', title: 'Shooting vertical-first: Reimagining the frame.', readers: '2.9k' },
        { id: '02', title: 'Budgeting for corporate video in 2024.', readers: '1.6k' },
        { id: '03', title: 'The impact of HDR on mobile viewing habits.', readers: '2.1k' },
        { id: '04', title: 'Post-production: AI tools that actually work.', readers: '3.8k' },
        { id: '05', title: 'Lighting for skin tones: A technical deep dive.', readers: '1.4k' },
        { id: '06', title: 'Direction: How to work with non-professional talent.', readers: '2.5k' }
      ]
    },
    'pm': {
      title: 'Technical Project Management',
      description: 'Leading complex teams through high-stakes project lifecycles with precision and transparency.',
      heroImage: 'assets/business-bg.webp',
      activeExperts: '11.2k', successRate: '94.2%',
      overviewHeading: 'Operational Excellence',
      overviewText: [
        "Effective project management is the backbone of successful delivery. We specialize in Agile, Scrum, and Kanban methodologies.",
        "We act as the bridge between stakeholders and technical teams, ensuring alignment and managing dependencies.",
        "Our focus is on reducing friction, maintaining velocity, and delivering high-quality outcomes within scope."
      ],
      toolkit: [
        { label: '', name: 'Agile / Scrum', desc: 'Leading iterative development for fast delivery.', icon: 'bi bi-arrow-repeat' },
        { label: '', name: 'Resource Planning', desc: 'Optimizing team capacity and budget allocation.', icon: 'bi bi-calendar-check' },
        { label: 'JIRA', name: 'Jira & Linear Mastery', desc: 'Detailed tracking for complex software projects.', icon: '' },
        { label: '', name: 'Risk Mitigation', desc: 'Identifying bottlenecks before they delay delivery.', icon: 'bi bi-shield-exclamation' }
      ],
      trendingWorks: [
        { id: '01', title: 'Managing distributed teams across 12 timezones.', readers: '4.5k' },
        { id: '02', title: 'The end of the daily stand-up? New async models.', readers: '2.3k' }
      ]
    },
    'strategy': {
      title: 'Strategic Business Consulting',
      description: 'Providing high-level roadmaps and actionable intelligence for market leaders and scale-ups.',
      heroImage: 'assets/consulting-bg.webp',
      activeExperts: '4.5k', successRate: '96.8%',
      overviewHeading: 'Strategic Clarity',
      overviewText: [
        "In a noisy market, clarity is your greatest competitive advantage. We provide deep market analysis and internal audits.",
        "We work with leadership teams to define long-term visions and break them down into practical, quarterly execution plans.",
        "Our consulting is grounded in data, not just intuition, ensuring that every strategic move is backed by evidence."
      ],
      toolkit: [
        { label: '', name: 'Market Analysis', desc: 'Identifying gaps and opportunities in the landscape.', icon: 'bi bi-globe' },
        { label: '', name: 'Growth Roadmaps', desc: 'Sequential planning for sustainable business scale.', icon: 'bi bi-map' },
        { label: 'SWOT', name: 'Strategic Audits', desc: 'Internal deep-dives into operational health.', icon: '' },
        { label: '', name: 'Venture Advisory', desc: 'Guidance for fundraising and capital allocation.', icon: 'bi bi-currency-dollar' }
      ],
      trendingWorks: [
        { id: '01', title: 'Pivot or Persevere? Analyzing the 2024 market.', readers: '2.1k' },
        { id: '02', title: 'Building a moat in the age of generative AI.', readers: '3.4k' }
      ]
    },
    'residential': {
      title: 'Residential Architecture & Design',
      description: 'Crafting bespoke living environments that harmonize functionality with personal aesthetic vision.',
      heroImage: 'assets/architecture-bg.webp',
      activeExperts: '3.1k', successRate: '95.9%',
      overviewHeading: 'The Modern Home',
      overviewText: [
        "A home should be an extension of those who live in it. We focus on sustainable, ergonomic, and beautiful residential design.",
        "We handle the entire journey, from initial conceptual sketches and 3D walkthroughs to technical drafting and site supervision.",
        "Our designs prioritize natural light, material integrity, and intelligent use of space for modern lifestyles."
      ],
      toolkit: [
        { label: '', name: '3D Walkthroughs', desc: 'Immersive visualization before the first brick is laid.', icon: 'bi bi-eye' },
        { label: '', name: 'Sustainable Design', desc: 'Energy-efficient architecture for a greener future.', icon: 'bi bi-leaf' },
        { label: 'CAD', name: 'Precision Drafting', desc: 'High-detail blueprints for builders and engineers.', icon: '' },
        { label: '', name: 'Material Selection', desc: 'Curating stone, wood, and metal palettes.', icon: 'bi bi-palette' }
      ],
      trendingWorks: [
        { id: '01', title: 'The rise of the "Smart Cottage" aesthetic.', readers: '1.7k' },
        { id: '02', title: 'Passive heating: Designing without a furnace.', readers: '2.5k' }
      ]
    },
    'app-dev': {
      title: 'Global App Development',
      description: 'Building high-performance mobile and web applications with a focus on deep-interactive user experiences.',
      heroImage: 'assets/software-bg.webp',
      activeExperts: '12.4k', successRate: '98.1%',
      overviewHeading: 'Digital Products',
      overviewText: [
        "Modern applications need to stay performant across an fragmented landscape of devices and connection speeds.",
        "We specialize in React Native, Flutter, and native iOS/Android development, ensuring your product feels premium everywhere.",
        "Our dev process is user-centered, ensuring that every feature solves a real problem and fits seamlessly into user habits."
      ],
      toolkit: [
        { label: '', name: 'React Native / Flutter', desc: 'Cross-platform excellence with native performance.', icon: 'bi bi-phone' },
        { label: '', name: 'UI Polish', desc: 'Smooth animations and responsive interaction models.', icon: 'bi bi-magic' },
        { label: 'API', name: 'Real-time Integration', desc: 'Seamless data sync with backend systems.', icon: '' },
        { label: '', name: 'App Store Config', desc: 'Navigating Apple and Google submission guidelines.', icon: 'bi bi-check2-circle' }
      ],
      trendingWorks: [
        { id: '01', title: 'Is native dying? The case for high-perf web apps.', readers: '4.8k' },
        { id: '02', title: 'Optimizing for low-bandwidth users in emerging markets.', readers: '3.1k' }
      ]
    },
    'workflow': {
      title: 'Workflow Automation & Logic',
      description: 'Connecting your tech stack to eliminate repetitive tasks and reclaim hundreds of hours for your team.',
      heroImage: 'assets/ai-bg.webp',
      activeExperts: '7.8k', successRate: '99.3%',
      overviewHeading: 'Automation Flow',
      overviewText: [
        "Automation is the ultimate productivity multiplier. We replace manual data entry with automated logic gates.",
        "We use Zapier, Make, and custom webhooks to unify fragmented tools into a single, cohesive operating machine.",
        "Our audits often uncover dozens of hours of wasted time that can be reclaimed through simple, robust automation."
      ],
      toolkit: [
        { label: '', name: 'Multi-App Connect', desc: 'Bridging your CRM, Slack, and Project tools.', icon: 'bi bi-link' },
        { label: '', name: 'Logic Gates', desc: 'Conditional filtering for complex business flows.', icon: 'bi bi-diagram-3' },
        { label: 'HOOK', name: 'Webhooks & APIs', desc: 'Custom integrations for specialized software.', icon: '' },
        { label: '', name: 'Error Handling', desc: 'Failsafe systems to ensure reliability of data flow.', icon: 'bi bi-shield-check' }
      ],
      trendingWorks: [
        { id: '01', title: 'The "No-Code" operational revolution in mid-size firms.', readers: '5.2k' },
        { id: '02', title: 'Using AI to write your automation scripts.', readers: '3.9k' }
      ]
    },
    'viz': {
      title: 'Data Visualization & Intelligence',
      description: 'Transforming complex datasets into clear, actionable, and interactive visual narratives.',
      heroImage: 'assets/tech-bg.webp',
      activeExperts: '6.4k', successRate: '96.5%',
      overviewHeading: 'Visual Intelligence',
      overviewText: [
        "Raw data is valuable, but visual data is actionable. We bridge the gap between analytics and decision-making.",
        "We build custom dashboards in Tableau and PowerBI that allow stakeholders to see trends, not just numbers.",
        "Our goal is to make complex business metrics intuitive and accessible to everyone in your organization."
      ],
      toolkit: [
        { label: '', name: 'Interactive Dashboards', desc: 'Providing real-time views of business health.', icon: 'bi bi-bar-chart' },
        { label: '', name: 'Data Storytelling', desc: 'Narrative structures for reporting and analysis.', icon: 'bi bi-journal-text' },
        { label: 'BI', name: 'Tableau / PowerBI', desc: 'Leading tools for professional data visualization.', icon: '' },
        { label: '', name: 'Clean Data Layouts', desc: 'Design-led presentation of technical information.', icon: 'bi bi-layout-sidebar' }
      ],
      trendingWorks: [
        { id: '01', title: 'How to build dashboards that people actually use.', readers: '3.3k' },
        { id: '02', title: 'The psychology of color in data interpretation.', readers: '1.9k' }
      ]
    },
    'print-design': {
      title: 'High-End Print & Layout Design',
      description: 'Engineering tactile visual experiences through grid systems, typography, and material expertise.',
      heroImage: 'assets/design-bg.webp', activeExperts: '4.2k', successRate: '93.5%',
      overviewHeading: 'Print Architecture',
      overviewText: ["Print is where design meets the physical world. We specialize in complex layouts for magazines, books, and high-end brand collateral."],
      toolkit: [{ name: 'Adobe InDesign', desc: 'Layout mastery.', icon: '' }, { name: 'Pantone Matching', desc: 'Color accuracy.', icon: 'bi bi-palette' }],
      trendingWorks: [
        { title: 'The future of sustainable print materials.', readers: '1.4k' },
        { title: 'Modern grid systems in editorial design.', readers: '2.1k' },
        { title: 'Choosing the right paper stock for luxury books.', readers: '1.2k' },
        { title: 'Special finishes: Foil, emboss, and UV.', readers: '1.8k' },
        { title: 'Typography for high-density information.', readers: '1.1k' },
        { title: 'Color management for high-end photography books.', readers: '2.3k' }
      ]
    },
    'brand-styling': {
      title: 'Strategic Brand Styling',
      description: 'Developing full visual systems including patterns, textures, and comprehensive brand guidelines.',
      heroImage: 'assets/design-bg.webp', activeExperts: '5.1k', successRate: '97.2%',
      overviewHeading: 'Style Systems',
      overviewText: ["We create the visual grammar that allows your brand to remain consistent across every possible touchpoint."],
      toolkit: [{ name: 'Style Guides', desc: 'Immutable rules.', icon: 'bi bi-book' }, { name: 'Asset Management', desc: 'Organized scaling.', icon: 'bi bi-folder' }],
      trendingWorks: [
        { title: 'Developing a cohesive brand pattern language.', readers: '1.9k' },
        { title: 'Texture and materiality in digital branding.', readers: '1.4k' },
        { title: 'Iconography systems for global scale.', readers: '3.1k' },
        { title: 'The impact of spacing on brand prestige.', readers: '2.5k' },
        { title: 'Curating unique brand photography styles.', readers: '1.8k' },
        { title: 'Creating immutable brand guidelines.', readers: '2.2k' }
      ]
    },
    'email-marketing': {
      title: 'Retention & Email Automation',
      description: 'Building high-conversion lifecycle campaigns and automated retention flows for global brands.',
      heroImage: 'assets/marketing-bg.webp', activeExperts: '6.8k', successRate: '95.1%',
      overviewHeading: 'Lifecycle Ops',
      overviewText: ["Email is the most powerful channel for long-term customer value. We automate the entire journey."],
      toolkit: [{ name: 'Klaviyo / Mailchimp', desc: 'Automation tools.', icon: '' }, { name: 'CRM Integration', desc: 'Data sync.', icon: 'bi bi-link' }],
      trendingWorks: [
        { title: 'Optimizing post-purchase retention flows.', readers: '3.8k' },
        { title: 'Dynamic content in modern email campaigns.', readers: '2.5k' },
        { title: 'The end of open rates: New metric models.', readers: '4.1k' },
        { title: 'Accessibility in email design and code.', readers: '1.8k' },
        { title: 'A/B testing subject lines for high-volume lists.', readers: '2.1k' },
        { title: 'Lifecycle marketing for high-ticket services.', readers: '1.4k' }
      ]
    },
    'sem-ppc': {
      title: 'Performance Marketing (SEM/PPC)',
      description: 'Scaling growth through precision-targeted search engine marketing and performance ad management.',
      heroImage: 'assets/marketing-bg.webp', activeExperts: '9.4k', successRate: '94.8%',
      overviewHeading: 'Paid Acquisition',
      overviewText: ["We turn search intent into revenue using data-driven bidding strategies and high-converting ad copy."],
      toolkit: [{ name: 'Google Ads', desc: 'Search power.', icon: '' }, { name: 'Keyword Analysis', desc: 'Intent mapping.', icon: 'bi bi-search' }],
      trendingWorks: [
        { title: 'Bidding strategies for high-competition keywords.', readers: '2.8k' },
        { title: 'The role of AI in Google Ads performance.', readers: '4.2k' },
        { title: 'Scaling PPC budgets without decreasing ROI.', readers: '3.5k' },
        { title: 'Landing page optimization for paid traffic.', readers: '2.1k' },
        { title: 'Attribution modeling in a cookie-less world.', readers: '1.9k' },
        { title: 'YouTube ads for professional service brands.', readers: '1.4k' }
      ]
    },
    'content-strategy': {
      title: 'Editorial & Content Strategy',
      description: 'Building authority and organic growth through comprehensive editorial planning and lifecycle maps.',
      heroImage: 'assets/writing-bg.webp', activeExperts: '4.7k', successRate: '96.4%',
      overviewHeading: 'Strategic Narrative',
      overviewText: ["Content is not just words; it is a strategic asset that builds long-term brand authority and trust."],
      toolkit: [{ name: 'Authority Maps', desc: 'Content logic.', icon: 'bi bi-map' }, { name: 'SEO Planning', desc: 'Organic growth.', icon: 'bi bi-graph-up' }],
      trendingWorks: [
        { title: 'Authority architecture: Building a content moat.', readers: '2.5k' },
        { title: 'The editorial calendar for high-output teams.', readers: '1.8k' },
        { title: 'Content pillar strategies for technical SaaS.', readers: '3.1k' },
        { title: 'Repurposing long-form content for social scale.', readers: '2.4k' },
        { title: 'Measuring the ROI of strategic content.', readers: '1.9k' },
        { title: 'The intersection of SEO and brand voice.', readers: '4.4k' }
      ]
    },
    'localization': {
      title: 'Global Localization & Culture',
      description: 'Adapting products for international markets with cultural nuance, precision, and transcreation.',
      heroImage: 'assets/writing-bg.webp', activeExperts: '3.9k', successRate: '98.5%',
      overviewHeading: 'Global Expansion',
      overviewText: ["Moving beyond translation to ensure your product feels native to every culture it enters."],
      toolkit: [{ name: 'Cultural Audits', desc: 'Local nuance.', icon: 'bi bi-globe' }, { name: 'Translation Memory', desc: 'Consistent logic.', icon: 'bi bi-cpu' }],
      trendingWorks: [
        { title: 'Transcreation: Moving beyond simple translation.', readers: '1.7k' },
        { title: 'Cultural nuance in emerging market launches.', readers: '2.4k' },
        { title: 'Localization pipelines for global app releases.', readers: '1.1k' },
        { title: 'The business case for cultural adaptation.', readers: '2.1k' },
        { title: 'Managing global linguistic consistency.', readers: '1.4k' },
        { title: 'Legal and regulatory nuances in local markets.', readers: '1.9k' }
      ]
    },
    'ghostwriting': {
      title: 'Executive Ghostwriting',
      description: 'Professional silent authorship that captures your unique voice for books, articles, and thought leadership.',
      heroImage: 'assets/writing-bg.webp', activeExperts: '2.4k', successRate: '99.1%',
      overviewHeading: 'Silent Partnership',
      overviewText: ["We provide the words for your vision, maintaining absolute confidentiality and high-level structure."],
      toolkit: [{ name: 'Voice Matching', desc: 'Seamless tone.', icon: 'bi bi-mic' }, { name: 'Structure Labs', desc: 'Logical flow.', icon: 'bi bi-layers' }],
      trendingWorks: [
        { title: 'The silent partner: Managing high-level voices.', readers: '1.8k' },
        { title: 'Capturing unique executive tones on paper.', readers: '2.1k' },
        { title: 'The ethics of ghostwriting in leadership.', readers: '1.2k' },
        { title: 'Structuring a 50,000 word book in 90 days.', readers: '1.4k' },
        { title: 'Writing for the LinkedIn executive landscape.', readers: '3.1k' },
        { title: 'Research methods for deep expert ghostwriting.', readers: '1.9k' }
      ]
    },
    'animation': {
      title: '2D/3D Character Animation',
      description: 'Constructing immersive worlds and character narratives through fluid motion and keyframe artistry.',
      heroImage: 'assets/video-bg.webp', activeExperts: '5.2k', successRate: '94.5%',
      overviewHeading: 'Motion Narrative',
      overviewText: ["We bring characters to life for commercials, games, and digital products using advanced rigging."],
      toolkit: [{ name: 'Character Rigging', desc: 'Fluid bones.', icon: 'bi bi-controller' }, { name: 'Frame Artist', desc: 'Hand-crafted.', icon: 'bi bi-brush' }],
      trendingWorks: [
        { title: 'Mastering the 12 principles of animation.', readers: '3.2k' },
        { title: 'rigging for complex 2D character motion.', readers: '1.5k' },
        { title: 'The physics of motion in digital storytelling.', readers: '2.1k' },
        { title: 'Frame-by-frame: When the old ways are best.', readers: '1.4k' },
        { title: '3D character performance in Unreal Engine.', readers: '2.4k' },
        { title: 'Motion hooks for short-form social content.', readers: '3.8k' }
      ]
    },
    'color-grading': {
      title: 'Cinematic Color Grading',
      description: 'Evoking emotion through tone, contrast, and specialized color science for professional film.',
      heroImage: 'assets/video-bg.webp', activeExperts: '3.1k', successRate: '98.2%',
      overviewHeading: 'The Tone of Story',
      overviewText: ["Color is the final layer of storytelling. We define the look that defines the mood of your project."],
      toolkit: [{ name: 'DaVinci Resolve', desc: 'Color science.', icon: '' }, { name: 'LUT Design', desc: 'Custom looks.', icon: 'bi bi-magic' }],
      trendingWorks: [
        { title: 'The psychological impact of color contrast.', readers: '2.8k' },
        { title: 'Defining the "look" of modern sci-fi cinema.', readers: '1.5k' },
        { title: 'Color grading for skin tones in high-key.', readers: '1.2k' },
        { title: 'The transition from SDR to HDR workflows.', readers: '2.1k' },
        { title: 'Material and texture response in grading.', readers: '1.4k' },
        { title: 'LUT design for consistent commercial work.', readers: '1.9k' }
      ]
    },
    'prompt-engineering': {
      title: 'Prompt Engineering & Logic',
      description: 'Optimizing AI outputs through structured input design, chain-of-thought, and few-shot logic.',
      heroImage: 'assets/ai-bg.webp', activeExperts: '4.8k', successRate: '99.9%',
      overviewHeading: 'The AI Interface',
      overviewText: ["The quality of AI is limited by the quality of the prompt. We engineer the bridge to perfection."],
      toolkit: [{ name: 'Chain of Thought', desc: 'Iterative logic.', icon: 'bi bi-diagram-3' }, { name: 'Context Optimization', desc: 'Deep memory.', icon: 'bi bi-cpu' }],
      trendingWorks: [
        { title: 'Chain-of-thought logic: Guiding AI answers.', readers: '4.8k' },
        { title: 'Few-shot prompting for complex technical asks.', readers: '3.1k' },
        { title: 'The shift from prompting to orchestration.', readers: '5.2k' },
        { title: 'Security and bias in prompt engineering.', readers: '1.8k' },
        { title: 'Using AI to optimize your AI prompts.', readers: '3.4k' },
        { title: 'Managing context windows in deep prompts.', readers: '2.9k' }
      ]
    },
    'ai-integration': {
      title: 'Enterprise AI Integration',
      description: 'Seamlessly embedding AI agents and RAG architectures into existing business and tech workflows.',
      heroImage: 'assets/ai-bg.webp', activeExperts: '6.5k', successRate: '98.7%',
      overviewHeading: 'Applied Intelligence',
      overviewText: ["We connect powerful LLMs to your real-world data securely and efficiently."],
      toolkit: [{ name: 'LangChain / RAG', desc: 'Logic frameworks.', icon: '' }, { name: 'API Connectors', desc: 'Real-time sync.', icon: 'bi bi-link' }],
      trendingWorks: [
        { title: 'RAG vs Fine-tuning: Making the right choice.', readers: '6.5k' },
        { title: 'Security protocols for enterprise AI data.', readers: '3.8k' },
        { title: 'Integrating AI agents into existing ERPs.', readers: '2.1k' },
        { title: 'Zero-latency AI in customer-facing apps.', readers: '1.4k' },
        { title: 'The cost of scaling AI across large teams.', readers: '5.2k' },
        { title: 'Building custom memory for enterprise bots.', readers: '3.1k' }
      ]
    },
    'data-labeling': {
      title: 'Data Labeling & RLHF',
      description: 'Preparing high-quality datasets and human-feedback loops for machine learning and safety.',
      heroImage: 'assets/ai-bg.webp', activeExperts: '3.2k', successRate: '99.5%',
      overviewHeading: 'Ground Truth',
      overviewText: ["AI only learns what we teach it. We provide the precise labeling needed for expert models."],
      toolkit: [{ name: 'Multi-modal Label', desc: 'Visual & Text.', icon: 'bi bi-tags' }, { name: 'Quality Audits', desc: 'Zero error.', icon: 'bi bi-shield-check' }],
      trendingWorks: [
        { title: 'The impact of labeling quality on model safety.', readers: '3.2k' },
        { title: 'RLHF pipelines for specialized domains.', readers: '1.4k' },
        { title: 'Automating the first pass of data labeling.', readers: '2.1k' },
        { title: 'Bias detection in multi-modal training sets.', readers: '1.8k' },
        { title: 'Building high-fidelity datasets from raw logs.', readers: '1.9k' },
        { title: 'The future of synthetic data in AI training.', readers: '4.2k' }
      ]
    },
    'sound-design': {
      title: 'Global Sound Design & Foley',
      description: 'Creating custom soundscapes and auditory effects for cinematic media and digital products.',
      heroImage: 'assets/music-bg.webp', activeExperts: '4.1k', successRate: '94.9%',
      overviewHeading: 'Auditory Spaces',
      overviewText: ["We design the sounds you can't see, making every interaction feel tactile and immersive."],
      toolkit: [{ name: 'Synth Design', desc: 'Custom tones.', icon: 'bi bi-waveform' }, { name: 'Spatial Audio', desc: '3D soundscapes.', icon: 'bi bi-headphones' }],
      trendingWorks: [
        { title: 'Spatial audio: Creating immersive 3D zones.', readers: '4.1k' },
        { title: 'Synthesizing the sounds of future interfaces.', readers: '2.4k' },
        { title: 'Foley for the digital age: Modern textures.', readers: '1.8k' },
        { title: 'The science of audio-visual synchronicity.', readers: '2.1k' },
        { title: 'Generative soundscapes for gaming worlds.', readers: '3.2k' },
        { title: 'Mastering short-form social audio trends.', readers: '1.9k' }
      ]
    },
    'music-scoring': {
      title: 'Cinematic Music Scoring',
      description: 'Original compositions for film, games, and high-end advertising that define project identity.',
      heroImage: 'assets/music-bg.webp', activeExperts: '2.8k', successRate: '97.4%',
      overviewHeading: 'The Heart of Film',
      overviewText: ["We compose the emotional backbone of your project, from small cues to full orchestral scores."],
      toolkit: [{ name: 'Orchestration', desc: 'Full scale.', icon: 'bi bi-music-note-beamed' }, { name: 'MIDI Logic', desc: 'Digital speed.', icon: 'bi bi-cpu' }],
      trendingWorks: [
        { title: 'Writing the emotional backbone of high-end film.', readers: '2.8k' },
        { title: 'Modern orchestration for digital-only scores.', readers: '1.4k' },
        { title: 'The impact of minimalism in cinematic sound.', readers: '2.1k' },
        { title: 'Hybrid scores: Blending analog with digital.', readers: '1.9k' },
        { title: 'Music as branding: The 5-second sonic logo.', readers: '3.1k' },
        { title: 'Licensing and rights in the global media age.', readers: '1.2k' }
      ]
    },
    'audio-mixing': {
      title: 'Professional Audio Mixing',
      description: 'Precision balancing and mastering for professional release standards across all platforms.',
      heroImage: 'assets/music-bg.webp', activeExperts: '3.5k', successRate: '98.8%',
      overviewHeading: 'Release Standards',
      overviewText: ["Ensuring your audio sounds perfect on everything from phone speakers to theater systems."],
      toolkit: [{ name: 'EQ Balance', desc: 'Clarity logic.', icon: 'bi bi-sliders' }, { name: 'Loudness Compliance', desc: 'Global standards.', icon: 'bi bi-check-circle' }],
      trendingWorks: [
        { title: 'Mastering the final balance for global release.', readers: '3.5k' },
        { title: 'Loudness standards in the streaming-only era.', readers: '1.4k' },
        { title: 'The physics of sound in professional mixing.', readers: '2.1k' },
        { title: 'Remote mixing workflows for global teams.', readers: '1.9k' },
        { title: 'The intersection of mixing and sound design.', readers: '3.1k' },
        { title: 'Fidelity vs Portability: Mixing for mobile.', readers: '1.2k' }
      ]
    },
    'voiceover': {
      title: 'Executive Voiceover & Talent',
      description: 'Professional vocal recording for narrations, ads, and interactive media in a global studio.',
      heroImage: 'assets/music-bg.webp', activeExperts: '5.2k', successRate: '96.2%',
      overviewHeading: 'The Vocal Voice',
      overviewText: ["Finding the perfect tone and delivery to match your brand's unique identity."],
      toolkit: [{ name: 'Vocal Clarity', desc: 'Studio grade.', icon: 'bi bi-mic' }, { name: 'Language Nuance', desc: 'Global reach.', icon: 'bi bi-translate' }],
      trendingWorks: [
        { title: 'The nuances of international vocal delivery.', readers: '2.1k' },
        { title: 'Choosing the right mic for your brand voice.', readers: '1.4k' },
        { title: 'Mastering the audio-book narration flow.', readers: '3.1k' },
        { title: 'The impact of AI voices on professional talent.', readers: '4.2k' },
        { title: 'Spatial audio recording for VR and AR.', readers: '1.8k' },
        { title: 'Studio acoustics: Getting the perfect room tone.', readers: '1.5k' }
      ]
    },
    'ops': {
      title: 'Operations & Efficiency Consulting',
      description: 'Streamlining processes and organizational structures for maximum business performance.',
      heroImage: 'assets/business-bg.webp', activeExperts: '7.1k', successRate: '93.1%',
      overviewHeading: 'Business Health',
      overviewText: ["Auditing and re-engineering workflows to eliminate waste and accelerate output."],
      toolkit: [{ name: 'Process Audits', desc: 'Deep logic.', icon: 'bi bi-search' }, { name: 'OKRs Strategy', desc: 'Goal alignment.', icon: 'bi bi-graph-up' }],
      trendingWorks: [
        { title: 'The end of legacy operations in modern firms.', readers: '3.8k' },
        { title: 'Lean methodologies for high-output creative teams.', readers: '2.5k' },
        { title: 'Operational scaling: Avoiding the complexity trap.', readers: '1.9k' },
        { title: 'Using OKRs to drive meaningful brand growth.', readers: '2.1k' },
        { title: 'The science of meeting-less cultures.', readers: '4.4k' },
        { title: 'Process automation for executive workflows.', readers: '3.1k' }
      ]
    },
    'erp': {
      title: 'Enterprise ERP Integration',
      description: 'Connecting global enterprise resources for unified data, finance, and operational flow.',
      heroImage: 'assets/business-bg.webp', activeExperts: '4.4k', successRate: '95.5%',
      overviewHeading: 'Unified Enterprise',
      overviewText: ["We integrate complex SAP, Oracle, and Salesforce systems into a single source of truth."],
      toolkit: [{ name: 'Data Migration', desc: 'Safe scaling.', icon: 'bi bi-hdd-network' }, { name: 'Training Labs', desc: 'User adoption.', icon: 'bi bi-people' }],
      trendingWorks: [
        { title: 'The full cost of ERP integration failures.', readers: '5.2k' },
        { title: 'SAP vs Oracle: The 2024 enterprise showdown.', readers: '4.1k' },
        { title: 'Data migration: Zero-loss strategies for scale.', readers: '2.8k' },
        { title: 'Customizing Salesforce workflows for specialized niches.', readers: '3.1k' },
        { title: 'Cloud-native ERPs: The shift from on-prem.', readers: '2.4k' },
        { title: 'Security protocols in global ERP ecosystems.', readers: '1.9k' }
      ]
    },
    'sales': {
      title: 'Strategic Sales & Revenue Ops',
      description: 'Building scalable revenue engines and precision lead pipelines for modern enterprises.',
      heroImage: 'assets/business-bg.webp', activeExperts: '12.8k', successRate: '94.2%',
      overviewHeading: 'Revenue Engines',
      overviewText: ["Closing the gap between marketing and sales with high-performance pipelines."],
      toolkit: [{ name: 'Pipeline Design', desc: 'Lead logic.', icon: 'bi bi-cart-check' }, { name: 'Revenue Forecast', desc: 'Data foresight.', icon: 'bi bi-cash-stack' }],
      trendingWorks: [
        { title: 'Revenue Ops: The bridge between sales and tech.', readers: '4.1k' },
        { title: 'Predictive analytics in high-ticket pipelines.', readers: '3.5k' },
        { title: 'Building a moat with strategic sales logic.', readers: '2.8k' },
        { title: 'The science of lead scoring in 2024.', readers: '5.1k' },
        { title: 'Scaling outbound engines with personalized AI.', readers: '1.2k' },
        { title: 'Sales enablement tools that actually drive ROI.', readers: '2.4k' }
      ]
    },
    'finance': {
      title: 'Financial Advisory & Strategy',
      description: 'Optimizing fiscal health, investment strategies, and high-level capital allocation.',
      heroImage: 'assets/consulting-bg.webp', activeExperts: '3.8k', successRate: '97.5%',
      overviewHeading: 'Fiscal Growth',
      overviewText: ["Providing the deep financial insight needed for complex investments and mergers."],
      toolkit: [{ name: 'Fiscal Audits', desc: 'Zero leak.', icon: 'bi bi-bank' }, { name: 'M&A Advisory', desc: 'Strategic merging.', icon: 'bi bi-diagram-2' }],
      trendingWorks: [
        { title: 'Fiscal sanity in the age of global volatility.', readers: '3.8k' },
        { title: 'M&A strategies for high-growth tech firms.', readers: '2.1k' },
        { title: 'Capital allocation: Beyond simple investments.', readers: '1.4k' },
        { title: 'The rise of algorithmic financial auditing.', readers: '3.2k' },
        { title: 'Navigating tax logic in multi-jurisdiction teams.', readers: '1.9k' },
        { title: 'The future of decentralized corporate finance.', readers: '2.5k' }
      ]
    },
    'hr': {
      title: 'HR & Organizational Culture',
      description: 'Building resilient teams and professional environments through modern HR framework design.',
      heroImage: 'assets/consulting-bg.webp', activeExperts: '2.9k', successRate: '94.7%',
      overviewHeading: 'People First',
      overviewText: ["Designing cultures that attract and retain World-class talent in a remote-first world."],
      toolkit: [{ name: 'Culture Labs', desc: 'Brand energy.', icon: 'bi bi-people' }, { name: 'Policy Design', desc: 'Global safety.', icon: 'bi bi-shield-check' }],
      trendingWorks: [
        { title: 'Building resilient cultures in remote-first worlds.', readers: '3.1k' },
        { title: 'The science of retention for World-class talent.', readers: '4.2k' },
        { title: 'Modern HR policy: From rules to guidelines.', readers: '1.8k' },
        { title: 'Inclusion engineering: Beyond basic diversity.', readers: '2.5k' },
        { title: 'Measuring organizational health and happiness.', readers: '1.4k' },
        { title: 'AI in HR: The ethical and practical divide.', readers: '2.1k' }
      ]
    },
    'risk': {
      title: 'Global Risk & Compliance',
      description: 'Identifying and mitigating organizational vulnerabilities through deep-dive audits and policy.',
      heroImage: 'assets/consulting-bg.webp', activeExperts: '1.8k', successRate: '99.5%',
      overviewHeading: 'Organizational Safety',
      overviewText: ["Hardening your organization against legal, cyber, and operational threats."],
      toolkit: [{ name: 'Threat Mapping', desc: 'Proactive logic.', icon: 'bi bi-map' }, { name: 'Compliance Audits', desc: 'Regulatory safety.', icon: 'bi bi-file-earmark-check' }],
      trendingWorks: [
        { title: 'Identifying "Black Swan" events in tech ops.', readers: '4.8k' },
        { title: 'Compliance-as-code: The automation revolution.', readers: '3.1k' },
        { title: 'Navigating GDPR 2.0 and global data privacy.', readers: '5.2k' },
        { title: 'Risk mitigation in the supply chain of AI.', readers: '1.8k' },
        { title: 'The full cost of a data breach in 2024.', readers: '3.4k' },
        { title: 'Mastering the ISO internal audit pipeline.', readers: '2.9k' }
      ]
    },
    'commercial': {
      title: 'Commercial Architecture & Scale',
      description: 'Designing functional and inspiring corporate environments, retail spaces, and workspaces.',
      heroImage: 'assets/architecture-bg.webp', activeExperts: '2.5k', successRate: '92.9%',
      overviewHeading: 'Strategic Spaces',
      overviewText: ["Building the environments that drive productivity and brand presence in the physical world."],
      toolkit: [{ name: 'Building Codes', desc: 'Legal safety.', icon: 'bi bi-building' }, { name: 'Space Planning', desc: 'High efficiency.', icon: 'bi bi-grid' }],
      trendingWorks: [
        { title: 'The evolution of the "Strategic Workspace".', readers: '2.5k' },
        { title: 'Retail architecture: Designing for experience.', readers: '1.8k' },
        { title: 'Commercial building codes: Navigating safety.', readers: '3.1k' },
        { title: 'Sustainability in high-density office design.', readers: '2.4k' },
        { title: 'The psychogeography of business environments.', readers: '1.9k' },
        { title: 'Smart buildings: The integration of IoT and space.', readers: '4.4k' }
      ]
    },
    'interior': {
      title: 'High-End Interior Styling',
      description: 'Elevating interiors through curated furniture, decor, textiles, and expert space planning.',
      heroImage: 'assets/architecture-bg.webp', activeExperts: '4.1k', successRate: '96.2%',
      overviewHeading: 'Aesthetic Living',
      overviewText: ["Curating every detail of an interior to create a cohesive and luxurious atmosphere."],
      toolkit: [{ name: 'Textile Logic', desc: 'Tactile feel.', icon: 'bi bi-stars' }, { name: 'Furniture Curation', desc: 'Style balance.', icon: 'bi bi-palette' }],
      trendingWorks: [
        { title: 'The return of textures in high-end minimalism.', readers: '1.7k' },
        { title: 'Lighting as architecture: Designing with photons.', readers: '2.4k' },
        { title: 'Curating the modern "Executive Lounge".', readers: '1.1k' },
        { title: 'The ergonomics of productivity-led design.', readers: '2.1k' },
        { title: 'Material integrity: Solid vs Synthetic.', readers: '1.4k' },
        { title: 'The psychology of spatial flow in residential.', readers: '1.9k' }
      ]
    },
    'urban': {
      title: 'Sustainable Urban Planning',
      description: 'Designing resilient communities, public transit systems, and high-density sustainable living.',
      heroImage: 'assets/architecture-bg.webp', activeExperts: '1.2k', successRate: '98.1%',
      overviewHeading: 'Global Cities',
      overviewText: ["Engineering the futures of our cities with a focus on green energy and human connection."],
      toolkit: [{ name: 'GIS Mapping', desc: 'Data precision.', icon: 'bi bi-map' }, { name: 'Transit Logic', desc: 'Mass flow.', icon: 'bi bi-truck' }],
      trendingWorks: [
        { title: 'Cities for humans: Reclaiming the urban street.', readers: '1.8k' },
        { title: 'Transit-oriented development: The future of density.', readers: '2.1k' },
        { title: 'The impact of 15-minute cities on business health.', readers: '1.2k' },
        { title: 'Sustainable mass transit: Beyond the subway.', readers: '1.4k' },
        { title: 'Modeling urban heat islands with AI simulations.', readers: '3.1k' },
        { title: 'Urban greening: The ROI of nature in city-scapes.', readers: '1.9k' }
      ]
    },
    'custom-software': {
      title: 'Custom Software Engineering',
      description: 'Tailored digital solutions for unique business needs, legacy integrations, and feature scale.',
      heroImage: 'assets/software-bg.webp', activeExperts: '8.4k', successRate: '97.5%',
      overviewHeading: 'Logic Systems',
      overviewText: ["When off-the-shelf software fails, we build the precise logic your business requires."],
      toolkit: [{ name: 'Legacy Sync', desc: 'Bridging eras.', icon: 'bi bi-arrow-left-right' }, { name: 'Architecture Scale', desc: 'Growth ready.', icon: 'bi bi-layers' }],
      trendingWorks: [
        { title: 'Refactoring legacy spaghetti for modern scale.', readers: '3.2k' },
        { title: 'The case for custom software over SaaS tools.', readers: '1.5k' },
        { title: 'Secure API design: The first line of defense.', readers: '2.1k' },
        { title: 'Micro-services or Monolith? The honest guide.', readers: '1.4k' },
        { title: 'Real-time sync architectures for global teams.', readers: '2.4k' },
        { title: 'The transition from dev to production at scale.', readers: '3.8k' }
      ]
    },
    'tech-audit': {
      title: 'Professional Tech & Code Audits',
      description: 'Evaluating code health, architecture resilience, and performance bench-marking for leaders.',
      heroImage: 'assets/software-bg.webp', activeExperts: '3.1k', successRate: '99.2%',
      overviewHeading: 'System Health',
      overviewText: ["Deep-dive audits into your tech stack to identify vulnerabilities and optimization paths."],
      toolkit: [{ name: 'Code Review', desc: 'Quality audit.', icon: 'bi bi-code-slash' }, { name: 'Perf Benchmark', desc: 'Speed check.', icon: 'bi bi-speedometer2' }],
      trendingWorks: [
        { title: 'The 10 silent killers of code-base performance.', readers: '2.8k' },
        { title: 'Security audits: Beyond basics to zero-trust.', readers: '1.5k' },
        { title: 'Refactoring for the long-haul: Best practices.', readers: '1.2k' },
        { title: 'The impact of technical debt on business velocity.', readers: '2.1k' },
        { title: 'Benchmarking frameworks: React vs Angular in 2024.', readers: '1.4k' },
        { title: 'The executive guide to tech-stack health.', readers: '1.9k' }
      ]
    },
    'architecture': {
      title: 'Systems & Cloud Architecture',
      description: 'Designing scalable and resilient digital infrastructures and low-latency cloud systems.',
      heroImage: 'assets/software-bg.webp', activeExperts: '5.2k', successRate: '98.7%',
      overviewHeading: 'Digital Foundation',
      overviewText: ["Engineering the immutable infrastructures that power the modern global web."],
      toolkit: [{ name: 'Cloud Resilience', desc: 'Zero downtime.', icon: 'bi bi-cloud-check' }, { name: 'Modular Logic', desc: 'Easy scaling.', icon: 'bi bi-grid-3x3' }],
      trendingWorks: [
        { title: 'Designing for the 99.999% availability goal.', readers: '4.8k' },
        { title: 'Serverless scalability: Managing the cold start.', readers: '3.1k' },
        { title: 'Global state synchronization: The edge revolution.', readers: '5.2k' },
        { title: 'Immutable infrastructure in a mutable world.', readers: '1.8k' },
        { title: 'Cloud-native design patterns for complex apps.', readers: '3.4k' },
        { title: 'The evolution of infra-as-code: Pulumi vs TF.', readers: '2.9k' }
      ]
    },
    'bots': {
      title: 'NLP Conversational Bots',
      description: 'Creating custom chat and process bots for engagement, support, and intent mapping.',
      heroImage: 'assets/ai-bg.webp', activeExperts: '6.1k', successRate: '97.8%',
      overviewHeading: 'Conversational Logic',
      overviewText: ["Using NLP to build bots that represent your brand and solve user problems accurately."],
      toolkit: [{ name: 'Intent Mapping', desc: 'Human logic.', icon: 'bi bi-chat-left-dots' }, { name: 'Escalation Logic', desc: 'Smooth handoff.', icon: 'bi bi-person-up' }],
      trendingWorks: [
        { title: 'Conversational design: Beyond the simple chat.', readers: '6.5k' },
        { title: 'Intent mapping for high-stakes customer support.', readers: '3.8k' },
        { title: 'The transition from keyword to semantic search.', readers: '2.1k' },
        { title: 'Zero-hallucination bots in the enterprise world.', readers: '1.4k' },
        { title: 'Multi-modal bots: Vision and voice integration.', readers: '5.2k' },
        { title: 'The ethics of bot-to-human escalation logic.', readers: '3.1k' }
      ]
    },
    'optimization': {
      title: 'Process & Time Optimization',
      description: 'Auditing and re-engineering workflows for speed, productivity, and bottleneck elimination.',
      heroImage: 'assets/ai-bg.webp', activeExperts: '3.4k', successRate: '96.2%',
      overviewHeading: 'Productivity Systems',
      overviewText: ["Eliminating the friction that slows your team down and focusing energy on what matters."],
      toolkit: [{ name: 'Time Audits', desc: 'Waste search.', icon: 'bi bi-stopwatch' }, { name: 'Efficiency Stacks', desc: 'Tool synergy.', icon: 'bi bi-lightning' }],
      trendingWorks: [
        { title: 'Identifying operational friction: A time audit guide.', readers: '3.2k' },
        { title: 'Reclaiming high-value focus for technical teams.', readers: '1.4k' },
        { title: 'The 80/20 rule of process optimization.', readers: '2.1k' },
        { title: 'Bottleneck elimination in complex pipelines.', readers: '1.8k' },
        { title: 'Efficiency vs Effectiveness: The crucial divide.', readers: '1.9k' },
        { title: 'Using AI to automate your personal productivity.', readers: '4.2k' }
      ]
    },
    'integration': {
      title: 'Omni-Channel Tool Integration',
      description: 'Unifying your tech stack through webhooks, API auth, and middleware for seamless data flow.',
      heroImage: 'assets/ai-bg.webp', activeExperts: '5.2k', successRate: '98.5%',
      overviewHeading: 'Connected Ecosystems',
      overviewText: ["Breaking down data silos and ensuring your tools talk to each other in real-time."],
      toolkit: [{ name: 'Active Sync', desc: 'Live updates.', icon: 'bi bi-arrow-repeat' }, { name: 'Middleware Ops', desc: 'Data control.', icon: 'bi bi-cpu' }],
      trendingWorks: [
        { title: 'Unifying fragmented tool stacks with webhooks.', readers: '4.1k' },
        { title: 'The full cost of data silos in global firms.', readers: '2.4k' },
        { title: 'Real-time data synchronization at global scale.', readers: '1.8k' },
        { title: 'Security first: Authenticating tool integrations.', readers: '2.1k' },
        { title: 'Middleware architectures for complex data flow.', readers: '3.2k' },
        { title: 'The business case for stack consolidation.', readers: '1.9k' }
      ]
    },
    'bi': {
      title: 'Business Intelligence Strategy',
      description: 'Leveraging data to uncover market opportunities, KPI mapping, and descriptive analytics.',
      heroImage: 'assets/tech-bg.webp', activeExperts: '5.1k', successRate: '95.2%',
      overviewHeading: 'Strategic Data',
      overviewText: ["Using historical data to predict the future of your business and industry."],
      toolkit: [{ name: 'KPI Metrics', desc: 'Success logic.', icon: 'bi bi-check2-square' }, { name: 'Trend Vision', desc: 'Market insight.', icon: 'bi bi-graph-up' }],
      trendingWorks: []
    },
    'data-eng': {
      title: 'Data Engineering & Pipelines',
      description: 'Building the pipelines for reliable, clean data, ETL systems, and scalable stream processing.',
      heroImage: 'assets/tech-bg.webp', activeExperts: '4.4k', successRate: '99.1%',
      overviewHeading: 'Data Foundations',
      overviewText: ["Engineering the plumbing of the AI era. Clean data, delivered at scale."],
      toolkit: [{ name: 'ETL Pipelines', desc: 'Transform logic.', icon: 'bi bi-shuffle' }, { name: 'Stream Storage', desc: 'Massive scale.', icon: 'bi bi-hdd-network' }],
      trendingWorks: []
    },
    'big-data': {
      title: 'Global Big Data Strategy',
      description: 'Scaling data architectures for massive information, distributed storage, and low-latency processing.',
      heroImage: 'assets/tech-bg.webp', activeExperts: '2.8k', successRate: '98.5%',
      overviewHeading: 'Information Scale',
      overviewText: ["Managing the technical complexity of petabyte-scale information with ease."],
      toolkit: [{ name: 'Distributed Ops', desc: 'No bottleneck.', icon: 'bi bi-diagram-3' }, { name: 'Storage Logic', desc: 'Infinite scale.', icon: 'bi bi-database' }],
      trendingWorks: []
    }
  };

  currentSubdomain!: SubDomainContent;

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['sub'] || 'frontend';
      this.currentSubdomain = this.subdomainData[slug] || this.subdomainData['frontend'];
    });
  }

  goBack(): void {
    window.history.back();
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
}
