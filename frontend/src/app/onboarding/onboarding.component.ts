import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { ALL_WORLD_COUNTRIES, CountryData } from './countries-data';

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  skills: string[];
}

export interface Avatar {
  id: string;
  name: string;
  image: string;
}

export interface Certification {
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string;
  fileName?: string;
  fileData?: string;
}

export interface ProjectExperience {
  domain: string;
  title: string;
  description: string;
  experience: string;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {

  // ─── Onboarding Step State ───
  currentStep: number = 1; // 1: Skills, 2: Profile Details

  @ViewChild('skillsContainer') skillsContainer!: ElementRef;

  // ─── Profile Details State ───
  selectedAvatar: Avatar | null = null;
  isAvatarModalOpen: boolean = false;
  avatars: Avatar[] = [
    { id: 'avatar-01', name: 'Avatar 1', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { id: 'avatar-02', name: 'Avatar 2', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
    { id: 'avatar-03', name: 'Avatar 3', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack' },
    { id: 'avatar-04', name: 'Avatar 4', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily' },
    { id: 'avatar-05', name: 'Avatar 5', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max' },
    { id: 'avatar-06', name: 'Avatar 6', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' }
  ];
  fullName: string = '';
  username: string = '';
  email: string = '';
  contactNumber: string = '';
  gender: string = '';
  dateOfBirth: string = '';
  nationality: string = '';
  country: string = '';

  // ─── Gender Dropdown State (Step 2) ───
  showGenderDropdown: boolean = false;
  allGenders: string[] = ['Male', 'Female', 'Other'];
  filteredGenders: string[] = [...this.allGenders];

  // ─── Nationality Dropdown State (Step 2) ───
  showNationalityDropdown: boolean = false;
  filteredNationalities: string[] = [];
  allNationalities: string[] = [
    'American', 'British', 'Canadian', 'Chinese', 'French', 'German', 'Indian', 'Italian', 'Japanese', 'Korean',
    'Mexican', 'Russian', 'Spanish', 'Australian', 'Brazilian', 'Egyptian', 'Greek', 'Indonesian', 'Nigerian',
    'Pakistani', 'Saudi Arabian', 'South African', 'Turkish', 'Vietnamese', 'Argentinian'
  ];

  // ─── Country Dropdown State (Step 2) ───
  showCountryDropdown: boolean = false;
  filteredCountries: string[] = [];
  allCountries: string[] = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Côte d\'Ivoire', 'Cabo Verde',
    'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Congo-Brazzaville)',
    'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia (Czech Republic)', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
    'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini (fmr. "Swaziland")', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Holy See', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
    'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
    'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar (formerly Burma)', 'Namibia', 'Nauru',
    'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
    'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
    'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
    'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
    'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America',
    'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  // ─── Date Picker State (Step 2) ───
  showDatePicker: boolean = false;
  minAge: number = 18;
  currentDate = new Date();
  calendarDays: number[] = [];
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years: number[] = [];
  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear() - 18;

  // ─── About Yourself State (Step 3) ───
  professionalHeadline: string = '';
  professionalBio: string = '';

  // ─── Languages State (Step 4) ───
  selectedLanguages: string[] = [];
  languageSearchTerm: string = '';
  filteredLanguages: string[] = [];

  readonly allLanguages: string[] = [
    'English', 'Tamil', 'Telugu', 'Hindi', 'Malayalam', 'Kannada',
    'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'French', 'German',
    'Spanish', 'Portuguese', 'Arabic', 'Japanese', 'Korean', 'Chinese',
    'Russian', 'Italian', 'Dutch', 'Turkish', 'Vietnamese', 'Urdu'
  ];
  readonly popularLanguages: string[] = ['English', 'Tamil', 'Hindi', 'Telugu', 'Spanish', 'French'];

  // ─── Social Links State (Step 5) ───
  linkedinUrl: string = '';
  instagramUrl: string = '';
  twitterUrl: string = '';
  githubUrl: string = '';
  portfolioUrl: string = '';

  // ─── Experience & Boosts State ───
  yearsOfExperience: string = '';
  showYearsDropdown: boolean = false;
  yearsOptions: string[] = ['0', '0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'];

  projects: ProjectExperience[] = [];

  showProjectModal: boolean = false;
  showProjectExperienceDropdown: boolean = false;
  newProject: ProjectExperience = { domain: '', title: '', description: '', experience: '' };

  resumeFileName: string = '';
  certifications: any[] = [];

  showCertModal: boolean = false;
  newCertification: any = { title: '', issuer: '', issueDate: '', credentialUrl: '', fileName: '' };

  isSubmitting: boolean = false;
  isSuccess: boolean = false;

  // ─── Skills Selection State ───
  searchTerm: string = '';
  selectedCategory: SkillCategory | null = null;
  selectedSkills: { name: string; level: string | null }[] = [];
  searchResults: { category: string; skill: string }[] = [];
  isSearching: boolean = false;
  maxLimitReached: boolean = false;

  // ─── Skill Levels State ───
  activeSkillLevelDropdown: string | null = null;
  readonly SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

  readonly MAX_SKILLS = 5;
  categories: SkillCategory[] = [
    {
      id: 'web-development',
      name: 'Web Development',
      icon: 'code',
      skills: ['Angular', 'React', 'Vue.js', 'Next.js', 'Nuxt.js', 'Svelte', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'SASS/SCSS', 'Node.js', 'Express.js', 'Django', 'Flask', 'Ruby on Rails', 'PHP', 'Laravel', 'WordPress', 'Shopify', 'REST APIs', 'GraphQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Webpack']
    },
    {
      id: 'mobile-development',
      name: 'Mobile Development',
      icon: 'smartphone',
      skills: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Dart', 'iOS Development', 'Android Development', 'Ionic', 'Xamarin', 'SwiftUI', 'Jetpack Compose', 'Objective-C', 'Mobile UI Design', 'App Store Optimization', 'Push Notifications', 'Firebase', 'SQLite', 'Realm', 'Core Data']
    },
    {
      id: 'ui-ux-design',
      name: 'UI/UX & Design',
      icon: 'palette',
      skills: ['Figma', 'Adobe XD', 'Sketch', 'InVision', 'Framer', 'UI Design', 'UX Design', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Responsive Design', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Graphic Design', 'Logo Design', 'Brand Identity', 'Typography', 'Color Theory', 'Interaction Design', 'Accessibility Design', 'Motion Design']
    },
    {
      id: 'writing-content',
      name: 'Writing & Content',
      icon: 'edit_note',
      skills: ['Content Writing', 'Copywriting', 'Blog Writing', 'Technical Writing', 'SEO Writing', 'Creative Writing', 'Ghostwriting', 'Editing & Proofreading', 'Script Writing', 'Grant Writing', 'White Papers', 'Case Studies', 'Email Marketing Copy', 'Social Media Content', 'Press Releases', 'Resume Writing', 'Academic Writing', 'UX Writing', 'Storyboarding']
    },
    {
      id: 'digital-marketing',
      name: 'Digital Marketing',
      icon: 'campaign',
      skills: ['SEO', 'SEM', 'Social Media Marketing', 'Email Marketing', 'Content Marketing', 'Google Ads', 'Facebook Ads', 'Marketing Automation', 'Affiliate Marketing', 'Influencer Marketing', 'Conversion Rate Optimization', 'Google Analytics', 'A/B Testing', 'PPC', 'Growth Hacking', 'Brand Management', 'E-commerce Marketing']
    },
    {
      id: 'data-science',
      name: 'Data Science & AI',
      icon: 'analytics',
      skills: ['Machine Learning', 'Deep Learning', 'Data Analysis', 'Data Visualization', 'Python', 'R', 'SQL', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-Learn', 'Natural Language Processing', 'Computer Vision', 'Data Engineering', 'Big Data', 'Hadoop', 'Spark', 'Tableau', 'Power BI']
    },
    {
      id: 'it-networking',
      name: 'IT & Networking',
      icon: 'dns',
      skills: ['System Administration', 'Network Engineering', 'Cloud Computing', 'AWS', 'Azure', 'Google Cloud Platform', 'DevOps', 'Docker', 'Kubernetes', 'Linux', 'Windows Server', 'Cybersecurity', 'Ethical Hacking', 'Information Security', 'IT Support', 'Database Administration']
    },
    {
      id: 'engineering-arch',
      name: 'Engineering & Architecture',
      icon: 'architecture',
      skills: ['AutoCAD', 'SolidWorks', 'Revit', 'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Structural Engineering', '3D Modeling', 'CAD/CAM', 'BIM', 'Product Design', 'Manufacturing', 'Robotics']
    },
    {
      id: 'video-animation',
      name: 'Video & Animation',
      icon: 'movie',
      skills: ['Video Editing', 'Adobe Premiere Pro', 'Final Cut Pro', 'After Effects', 'Motion Graphics', '2D Animation', '3D Animation', 'Blender', 'Maya', 'Cinema 4D', 'Video Production', 'Color Grading', 'Visual Effects', 'Explainer Videos']
    },
    {
      id: 'audio-music',
      name: 'Audio & Music',
      icon: 'headphones',
      skills: ['Audio Editing', 'Sound Design', 'Music Production', 'Voice Over', 'Mixing & Mastering', 'Logic Pro', 'Ableton Live', 'Pro Tools', 'FL Studio', 'Podcast Production', 'Audio Engineering']
    },
    {
      id: 'business-consulting',
      name: 'Business & Consulting',
      icon: 'business_center',
      skills: ['Business Analysis', 'Project Management', 'Agile/Scrum', 'Management Consulting', 'Financial Analysis', 'Accounting', 'Bookkeeping', 'Excel', 'Data Entry', 'Virtual Assistance', 'Customer Support', 'Sales', 'Lead Generation', 'Human Resources', 'Recruiting']
    },
    {
      id: 'legal',
      name: 'Legal Services',
      icon: 'gavel',
      skills: ['Contract Law', 'Corporate Law', 'Intellectual Property', 'Legal Writing', 'Legal Research', 'Paralegal Services', 'Tax Law', 'Immigration Law', 'Employment Law', 'Family Law']
    },
    {
      id: 'translation',
      name: 'Translation & Localization',
      icon: 'translate',
      skills: ['Translation', 'Transcription', 'Localization', 'Proofreading', 'Subtitling', 'Interpretation', 'Language Tutoring']
    }
  ];

  constructor(
    private router: Router,
    private service: ServiceService
  ) { }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: any): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.persistStep();
    } else {
      this.persistStep();
    }
  }

  ngOnInit(): void {
    // Role guard: Ensure clients do not access freelancer onboarding
    const loginType = sessionStorage.getItem('loginType');
    if (loginType === 'client') {
      const cid = sessionStorage.getItem('c_id') || '';
      const isComplete = localStorage.getItem(`client_onboarding_completed_${cid}`) === 'true';
      if (isComplete) {
        this.router.navigate(['/home/client-dash'], { replaceUrl: true });
      } else {
        this.router.navigate(['/client-onboarding'], { replaceUrl: true });
      }
      return;
    }

    const flId = sessionStorage.getItem('fl_id') || 'guest';

    // Restore step if user previously left
    const savedStep = localStorage.getItem(`onboarding_current_step_${flId}`) || sessionStorage.getItem('onboarding_current_step');
    if (savedStep) {
      const stepNum = parseInt(savedStep, 10);
      if (stepNum >= 1 && stepNum <= 6) {
        this.currentStep = stepNum;
      }
    }

    // Pre-populate Full Name & Email from signup session/local storage
    const regName = sessionStorage.getItem('registered_fullname') || localStorage.getItem('registered_fullname') || '';
    const regEmail = sessionStorage.getItem('registered_email') || localStorage.getItem('registered_email') || '';
    if (regName && !this.fullName) this.fullName = regName;
    if (regEmail && !this.email) this.email = regEmail;

    // Restore domain
    const savedDomain = localStorage.getItem(`onboarding_domain_${flId}`) || sessionStorage.getItem('onboarding_selected_domain');
    if (savedDomain) {
      try {
        const d = JSON.parse(savedDomain);
        const found = this.categories.find(c => c.id === d.id || c.name === d.name);
        if (found) {
          this.selectedCategory = found;
        }
      } catch { }
    }

    // Restore skills
    const savedSkills = localStorage.getItem(`onboarding_skills_${flId}`) || sessionStorage.getItem('onboarding_selected_skills');
    if (savedSkills) {
      try { this.selectedSkills = JSON.parse(savedSkills); } catch { }
    }

    // Restore profile details
    const savedProfile = localStorage.getItem(`onboarding_profile_${flId}`) || sessionStorage.getItem('onboarding_profile');
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        this.fullName = p.fullName || this.fullName;
        this.username = p.username || '';
        this.email = p.email || this.email;
        this.contactNumber = p.contactNumber || '';
        this.gender = p.gender || '';
        this.dateOfBirth = p.dateOfBirth || '';
        this.nationality = p.nationality || '';
        this.country = p.country || '';
        if (p.selectedAvatarId) {
          const found = this.avatars.find(a => a.id === p.selectedAvatarId);
          if (found) this.selectedAvatar = found;
        }
        this.professionalHeadline = p.professionalHeadline || '';
        this.professionalBio = p.professionalBio || '';
      } catch { }
    }

    // Restore languages
    const savedLanguages = localStorage.getItem(`onboarding_languages_${flId}`) || sessionStorage.getItem('onboarding_languages');
    if (savedLanguages) {
      try { this.selectedLanguages = JSON.parse(savedLanguages); } catch { }
    }

    // Restore social links
    const savedLinks = localStorage.getItem(`onboarding_links_${flId}`) || sessionStorage.getItem('onboarding_links');
    if (savedLinks) {
      try {
        const links = JSON.parse(savedLinks);
        this.linkedinUrl = links.linkedinUrl || '';
        this.instagramUrl = links.instagramUrl || '';
        this.twitterUrl = links.twitterUrl || '';
        this.githubUrl = links.githubUrl || '';
        this.portfolioUrl = links.portfolioUrl || '';
      } catch { }
    }

    // Restore Step 6 data
    const savedStep6 = localStorage.getItem(`onboarding_step6_${flId}`);
    if (savedStep6) {
      try {
        const s6 = JSON.parse(savedStep6);
        this.yearsOfExperience = s6.yearsOfExperience || '';
        this.projects = s6.projects || [];
        this.certifications = s6.certifications || [];
        this.resumeFileName = s6.resumeFileName || '';
      } catch { }
    }

    // Hydrate from backend if available
    if (flId && flId !== 'guest') {
      this.service.get(`/users/getdata/${flId}`).subscribe({
        next: (u: any) => {
          if (u) {
            if (u.fullname && !this.fullName) this.fullName = u.fullname;
            if (u.email && !this.email) this.email = u.email;
            if (u.contact && !this.contactNumber) this.contactNumber = u.contact;
            if (u.country && !this.country) this.country = u.country;
            if (u.nationality && !this.nationality) this.nationality = u.nationality;
            if (u.gender && !this.gender) this.gender = u.gender;
            if (u.dob && !this.dateOfBirth) this.dateOfBirth = u.dob.substring(0, 10);
            if ((u.skillTitle || u.profession) && !this.professionalHeadline) this.professionalHeadline = u.skillTitle || u.profession;
            if (u.description && !this.professionalBio) this.professionalBio = u.description;
          }
        },
        error: () => { }
      });
    }

    // Initialize filtered languages
    this.filteredLanguages = [];
  }

  // ─── Category Selection (Required for Step 1) ───
  selectCategory(category: SkillCategory): void {
    this.selectedCategory = category;
    this.isSearching = false;
    this.searchTerm = '';
    this.persistSkills();
  }

  clearCategory(): void {
    this.selectedCategory = null;
    this.isSearching = false;
    this.searchTerm = '';
    this.persistSkills();
  }

  isSkillSelected(skillName: string): boolean {
    return this.selectedSkills.some(s => s.name === skillName);
  }

  areSkillLevelsSelected(): boolean {
    return this.selectedSkills.length > 0 && this.selectedSkills.every(s => s.level !== null);
  }

  toggleSkill(skillName: string): void {
    const index = this.selectedSkills.findIndex(s => s.name === skillName);

    if (index > -1) {
      // Remove skill
      this.selectedSkills.splice(index, 1);
      this.maxLimitReached = false;
      if (this.activeSkillLevelDropdown === skillName) {
        this.activeSkillLevelDropdown = null;
      }
    } else {
      // Add skill if limit not reached
      if (this.selectedSkills.length < this.MAX_SKILLS) {
        this.selectedSkills.push({ name: skillName, level: null });
        // Automatically open the level dropdown for the newly added skill
        this.activeSkillLevelDropdown = skillName;

        this.scrollToBottom();
        this.scrollSkillsToRight();
      } else {
        this.showLimitBanner();
      }
    }
    this.persistSkills();
  }

  showLimitBanner(): void {
    this.maxLimitReached = true;
    setTimeout(() => {
      this.maxLimitReached = false;
    }, 10000);
  }

  scrollSkillsToRight(): void {
    setTimeout(() => {
      if (this.skillsContainer && this.skillsContainer.nativeElement) {
        const el = this.skillsContainer.nativeElement;
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }
    }, 50);
  }

  // ─── Skill Level Selection ───
  toggleSkillLevelDropdown(skillName: string): void {
    if (this.activeSkillLevelDropdown === skillName) {
      this.activeSkillLevelDropdown = null; // Close if already open
    } else {
      this.activeSkillLevelDropdown = skillName; // Open for this skill
    }
  }

  setSkillLevel(skillName: string, level: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const skill = this.selectedSkills.find(s => s.name === skillName);
    if (skill) {
      skill.level = level;
      // Close dropdown after selection
      this.activeSkillLevelDropdown = null;
      this.persistSkills();
    }
  }

  getSkillLevel(skillName: string): string | null {
    const skill = this.selectedSkills.find(s => s.name === skillName);
    return skill ? skill.level : null;
  }

  addCustomSkill(customSkillName: string): void {
    if (customSkillName.trim() && !this.isSkillSelected(customSkillName)) {
      if (this.selectedSkills.length < this.MAX_SKILLS) {
        this.selectedSkills.push({ name: customSkillName.trim(), level: null });
        this.activeSkillLevelDropdown = customSkillName.trim();
        this.searchTerm = ''; // clear search after adding
        this.onSearchChange(); // refresh search state

        this.persistSkills();
        this.scrollToBottom();
        this.scrollSkillsToRight();
      } else {
        this.showLimitBanner();
      }
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const selectedPanels = document.querySelectorAll('.panel-selected .panel-scroll');
      selectedPanels.forEach(panel => {
        panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
      });
    }, 50);
  }

  // ─── Remove Skill ───
  removeSkill(skillName: string): void {
    const index = this.selectedSkills.findIndex(s => s.name === skillName);
    if (index > -1) {
      this.selectedSkills.splice(index, 1);
      this.maxLimitReached = false;
      if (this.activeSkillLevelDropdown === skillName) {
        this.activeSkillLevelDropdown = null;
      }
      this.persistSkills();
    }
  }

  // ─── Search (Scoped to selected domain) ───
  onSearchChange(): void {
    if (!this.selectedCategory) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    const term = this.searchTerm.toLowerCase().trim();

    // Search strictly within selected domain
    this.searchResults = this.selectedCategory.skills
      .filter(skill => skill.toLowerCase().includes(term))
      .map(skill => ({ category: this.selectedCategory!.name, skill }))
      .slice(0, 20);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  // ─── Get Display Skills (for middle panel) ───
  get displaySkills(): string[] {
    if (this.selectedCategory) {
      return this.selectedCategory.skills;
    }
    return [];
  }

  // ─── Progress Bar & Step Label Logic ───
  get progressPercentage(): number {
    const totalSteps = 6;
    return (this.currentStep / totalSteps) * 100;
  }

  get currentStepLabel(): string {
    switch (this.currentStep) {
      case 1: return 'Skills Selection';
      case 2: return 'Profile Details';
      case 3: return 'About Yourself';
      case 4: return 'Languages';
      case 5: return 'Online Presence';
      case 6: return 'Experience & Boosts';
      default: return 'Onboarding';
    }
  }

  // ─── Profile Logic ───
  openAvatarModal(): void {
    this.isAvatarModalOpen = true;
  }

  closeAvatarModal(): void {
    this.isAvatarModalOpen = false;
  }

  selectAvatar(avatar: Avatar): void {
    this.selectedAvatar = avatar;
    this.persistProfile();
    this.closeAvatarModal();
  }

  // ─── Profile Initials (used in onboarding avatar display) ───
  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return parts[0].charAt(0).toUpperCase();
  }

  // ─── Error Messages for Validation ───
  errorMessages: {
    fullname: string;
    username: string;
    email: string;
    contact: string;
    gender: string;
    dob: string;
    nationality: string;
    country: string;
    headline: string;
    bio: string;
    years: string;
  } = {
      fullname: '',
      username: '',
      email: '',
      contact: '',
      gender: '',
      dob: '',
      nationality: '',
      country: '',
      headline: '',
      bio: '',
      years: ''
    };

  languageTouched: boolean = false;

  linkErrorMessages: {
    linkedin: string;
    instagram: string;
    twitter: string;
    github: string;
    portfolio: string;
  } = {
      linkedin: '',
      instagram: '',
      twitter: '',
      github: '',
      portfolio: ''
    };

  validateLink(platform: 'linkedin' | 'instagram' | 'twitter' | 'github' | 'portfolio'): void {
    let url = '';
    if (platform === 'linkedin') url = this.linkedinUrl;
    else if (platform === 'instagram') url = this.instagramUrl;
    else if (platform === 'twitter') url = this.twitterUrl;
    else if (platform === 'github') url = this.githubUrl;
    else if (platform === 'portfolio') url = this.portfolioUrl;

    const trimmed = url ? url.trim() : '';
    if (trimmed.length > 0) {
      if (!this.isValidUrl(trimmed)) {
        this.linkErrorMessages[platform] = 'Please enter a valid URL (e.g. https://...).';
      } else {
        this.linkErrorMessages[platform] = '';
      }
    } else {
      this.linkErrorMessages[platform] = '';
    }
    this.persistLinks();
  }

  validateLanguages(): void {
    this.languageTouched = true;
  }

  validateYears(): void {
    if (!this.yearsOfExperience) {
      this.errorMessages.years = 'Years of experience is required.';
    } else {
      this.errorMessages.years = '';
    }
  }

  validateField(fieldName: string): void {
    if (fieldName === 'username') {
      this.errorMessages.username = '';
      const val = this.username ? this.username.trim() : '';
      if (val) {
        if (/\d/.test(val)) {
          this.errorMessages.username = 'Numbers are not allowed in username.';
        } else if (/\s/.test(val)) {
          this.errorMessages.username = 'Spaces are not allowed in username.';
        } else if (!/^[a-zA-Z.]+$/.test(val)) {
          this.errorMessages.username = 'Only alphabets and full stop (.) are allowed. No other special characters permitted.';
        }
      }
      return;
    }

    if (fieldName === 'contact') {
      this.errorMessages.contact = '';
      const val = this.contactNumber ? this.contactNumber.trim() : '';
      if (!val) {
        this.errorMessages.contact = 'Contact number is required.';
      } else if (/[a-zA-Z]/.test(val)) {
        this.errorMessages.contact = 'Alphabets are not allowed in contact number.';
      } else if (/[^\d]/.test(val)) {
        this.errorMessages.contact = 'Special characters and spaces are not allowed in contact number.';
      } else if (val.length !== 10) {
        this.errorMessages.contact = 'Contact number must be exactly 10 digits.';
      }
      return;
    }

    if (fieldName === 'nationality') {
      this.errorMessages.nationality = '';
      const val = this.nationality ? this.nationality.trim() : '';
      if (!val) {
        this.errorMessages.nationality = 'Nationality is required.';
      } else if (/\d/.test(this.nationality)) {
        this.errorMessages.nationality = 'Numbers are not allowed in nationality.';
      } else if (!/^[a-zA-Z\s]+$/.test(this.nationality)) {
        this.errorMessages.nationality = 'Only alphabets are allowed. Special characters are not permitted.';
      }
      return;
    }

    if (fieldName === 'country') {
      this.errorMessages.country = '';
      const val = this.country ? this.country.trim() : '';
      if (!val) {
        this.errorMessages.country = 'Country of residence is required.';
      } else if (/\d/.test(this.country)) {
        this.errorMessages.country = 'Numbers are not allowed in country.';
      } else if (!/^[a-zA-Z\s]+$/.test(this.country)) {
        this.errorMessages.country = 'Only alphabets are allowed. Special characters are not permitted.';
      }
      return;
    }

    if (fieldName === 'gender') {
      this.errorMessages.gender = '';
      if (!this.gender) {
        this.errorMessages.gender = 'Gender is required.';
      }
      return;
    }

    if (fieldName === 'dob') {
      this.validateDob();
      return;
    }

    if (fieldName === 'fullname') {
      this.errorMessages.fullname = '';
      if (!this.fullName || !this.fullName.trim()) {
        this.errorMessages.fullname = 'Full name is required.';
      }
      return;
    }

    if (fieldName === 'headline') {
      this.errorMessages.headline = '';
      const val = this.professionalHeadline ? this.professionalHeadline.trim() : '';
      if (!val) {
        this.errorMessages.headline = 'Job title is required.';
      } else if (/\d/.test(this.professionalHeadline)) {
        this.errorMessages.headline = 'Numbers are not allowed in job title.';
      } else if (!/^[a-zA-Z\s]+$/.test(this.professionalHeadline)) {
        this.errorMessages.headline = 'Only alphabets and spaces are allowed. Numbers and special characters are not permitted.';
      }
      return;
    }

    if (fieldName === 'bio') {
      this.errorMessages.bio = '';
      const val = this.professionalBio ? this.professionalBio.trim() : '';
      if (!val) {
        this.errorMessages.bio = 'Biography is required.';
      } else if (val.length < 20) {
        this.errorMessages.bio = 'Biography must be at least 20 characters.';
      }
      return;
    }
  }

  onProfileChange(fieldName?: string): void {
    if (fieldName) {
      this.validateField(fieldName);
    } else {
      ['username', 'contact', 'nationality', 'country', 'gender', 'dob'].forEach(f => this.validateField(f));
    }
    this.persistProfile();
  }

  isUsernameValid(): boolean {
    if (!this.username || !this.username.trim()) return true; // Optional field
    return /^[a-zA-Z.]+$/.test(this.username.trim());
  }

  isContactValid(): boolean {
    return /^\d{10}$/.test(this.contactNumber ? this.contactNumber.trim() : '');
  }

  isNationalityValid(): boolean {
    const val = this.nationality ? this.nationality.trim() : '';
    return val.length > 0 && !/\d/.test(this.nationality) && /^[a-zA-Z\s]+$/.test(this.nationality);
  }

  isCountryValid(): boolean {
    const val = this.country ? this.country.trim() : '';
    return val.length > 0 && !/\d/.test(this.country) && /^[a-zA-Z\s]+$/.test(this.country);
  }

  isHeadlineValid(): boolean {
    const val = this.professionalHeadline ? this.professionalHeadline.trim() : '';
    return val.length > 0 && !/\d/.test(this.professionalHeadline) && /^[a-zA-Z\s]+$/.test(this.professionalHeadline);
  }

  isBioValid(): boolean {
    const val = this.professionalBio ? this.professionalBio.trim() : '';
    return val.length >= 20;
  }

  // ✅ DOB Validation (Matching Settings Page logic)
  validateDob(): string {
    this.errorMessages.dob = '';
    if (!this.dateOfBirth) {
      this.errorMessages.dob = 'Date of birth is required';
      return 'Date of birth is required';
    }
    const dobValue = new Date(this.dateOfBirth);
    const today = new Date();
    const minYear = today.getFullYear() - this.minAge;
    const minValidDob = new Date(minYear, today.getMonth(), today.getDate());

    if (dobValue > today) {
      this.errorMessages.dob = 'Date of birth cannot be in the future';
      return 'Date of birth cannot be in the future';
    } else if (dobValue > minValidDob) {
      this.errorMessages.dob = `You must be at least ${this.minAge} years old`;
      return `You must be at least ${this.minAge} years old`;
    }
    return '';
  }

  isDobValid(): boolean {
    this.validateDob();
    return !this.errorMessages.dob && !!this.dateOfBirth;
  }

  // ─── Date Picker Methods (Step 2) ───
  initializeDatePicker(): void {
    const startYear = 1950;
    const cutoffYear = new Date().getFullYear() - this.minAge;

    this.years = [];
    for (let i = cutoffYear; i >= startYear; i--) {
      this.years.push(i);
    }

    this.generateCalendar();
  }

  generateCalendar(): void {
    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  isDateSelectable(day: number): boolean {
    const selectedDate = new Date(this.selectedYear, this.selectedMonth, day);
    const today = new Date();
    const minValidDate = new Date(today.getFullYear() - this.minAge, today.getMonth(), today.getDate());
    return selectedDate <= minValidDate;
  }

  selectDate(day: number): void {
    if (!this.isDateSelectable(day)) return;

    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    this.dateOfBirth = formattedDate;
    this.showDatePicker = false;
    this.onProfileChange();
  }

  toggleDatePicker(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showDatePicker = !this.showDatePicker;
    if (this.showDatePicker) {
      if (this.years.length === 0) {
        this.initializeDatePicker();
      }

      const cutoffYear = new Date().getFullYear() - this.minAge;
      if (this.dateOfBirth) {
        const parts = this.dateOfBirth.split('-');
        if (parts.length === 3) {
          this.selectedYear = parseInt(parts[0], 10);
          this.selectedMonth = parseInt(parts[1], 10) - 1;
        }
      } else {
        this.selectedYear = cutoffYear;
      }
      this.generateCalendar();
    }
  }

  // ─── Gender Methods (Matching Settings) ───
  onGenderInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    this.filteredGenders = this.allGenders.filter(g => g.toLowerCase().includes(val));
    this.showGenderDropdown = this.filteredGenders.length > 0;
  }

  selectGender(gender: string): void {
    this.gender = gender;
    this.showGenderDropdown = false;
    this.validateField('gender');
    this.persistProfile();
  }

  // ─── Nationality Methods (Matching Settings) ───
  onNationalityInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    if (val.length > 0) {
      this.filteredNationalities = this.allNationalities.filter(n => n.toLowerCase().includes(val)).slice(0, 8);
      this.showNationalityDropdown = this.filteredNationalities.length > 0;
    } else {
      this.showNationalityDropdown = false;
    }
    this.validateField('nationality');
    this.persistProfile();
  }

  selectNationality(nat: string): void {
    this.nationality = nat;
    this.showNationalityDropdown = false;
    this.validateField('nationality');
    this.persistProfile();
  }

  // ─── Country Methods (Matching Settings) ───
  onCountryInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    if (val.length > 0) {
      this.filteredCountries = this.allCountries.filter(c => c.toLowerCase().includes(val)).slice(0, 8);
      this.showCountryDropdown = this.filteredCountries.length > 0;
    } else {
      this.showCountryDropdown = false;
    }
    this.validateField('country');
    this.persistProfile();
  }

  selectCountry(country: string): void {
    this.country = country;
    this.showCountryDropdown = false;
    this.validateField('country');
    this.persistProfile();
  }

  // ─── HostListener for Clicking Outside Dropdowns ───
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close DOB Picker if clicked outside
    if (this.showDatePicker && !target.closest('.dob-picker-container')) {
      this.showDatePicker = false;
    }

    // Close Gender Dropdown if clicked outside
    if (this.showGenderDropdown && !target.closest('.gender-container')) {
      this.showGenderDropdown = false;
    }

    // Close Nationality Dropdown if clicked outside
    if (this.showNationalityDropdown && !target.closest('.nationality-container')) {
      this.showNationalityDropdown = false;
    }

    // Close Country Dropdown if clicked outside
    if (this.showCountryDropdown && !target.closest('.country-container')) {
      this.showCountryDropdown = false;
    }
  }

  isDateActive(day: number): boolean {
    if (!this.dateOfBirth) return false;
    const parts = this.dateOfBirth.split('-');
    if (parts.length !== 3) return false;

    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[0], 10);

    const currentMonth = Number(this.selectedMonth);
    const currentYear = Number(this.selectedYear);

    return d === day && m === (currentMonth + 1) && y === currentYear;
  }

  // ─── Languages Methods (Step 4) ───
  onLanguageSearch(): void {
    const term = this.languageSearchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredLanguages = [];
      return;
    }

    this.filteredLanguages = this.allLanguages
      .filter(lang => lang.toLowerCase().includes(term))
      .filter(lang => !this.selectedLanguages.includes(lang))
      .slice(0, 10);
  }

  selectLanguage(lang: string): void {
    if (!this.selectedLanguages.includes(lang)) {
      this.selectedLanguages.push(lang);
      this.languageSearchTerm = '';
      this.filteredLanguages = [];
      this.persistLanguages();
    }
  }

  removeLanguage(lang: string): void {
    this.selectedLanguages = this.selectedLanguages.filter(l => l !== lang);
    if (this.languageSearchTerm) {
      this.onLanguageSearch();
    }
    this.persistLanguages();
  }

  private isValidUrl(url: string): boolean {
    if (!url.trim()) return true; // empty is valid
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Validation ───
  canContinue(): boolean {
    if (this.currentStep === 1) {
      // Must have selected a domain AND at least 1 skill, AND every selected skill must have a level assigned
      return this.selectedCategory !== null &&
        this.selectedSkills.length > 0 &&
        this.selectedSkills.every(s => s.level !== null);
    } else if (this.currentStep === 2) {
      return this.fullName.trim().length > 0 &&
        this.isUsernameValid() &&
        this.email.trim().length > 0 &&
        this.isContactValid() &&
        this.gender.trim().length > 0 &&
        this.isDobValid() &&
        this.isNationalityValid() &&
        this.isCountryValid();
    } else if (this.currentStep === 3) {
      return this.isHeadlineValid() && this.isBioValid() && !this.errorMessages.headline && !this.errorMessages.bio;
    } else if (this.currentStep === 4) {
      return this.selectedLanguages.length > 0;
    } else if (this.currentStep === 5) {
      return this.isValidUrl(this.linkedinUrl) &&
        this.isValidUrl(this.instagramUrl) &&
        this.isValidUrl(this.twitterUrl) &&
        this.isValidUrl(this.githubUrl) &&
        this.isValidUrl(this.portfolioUrl);
    } else if (this.currentStep === 6) {
      return true;
    }
    return false;
  }

  // ─── Step Persistence ───
  persistStep(): void {
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    localStorage.setItem(`onboarding_current_step_${flId}`, this.currentStep.toString());
    sessionStorage.setItem('onboarding_current_step', this.currentStep.toString());
  }

  // ─── Navigation ───
  onNext(): void {
    if (!this.canContinue()) {
      return;
    }

    if (this.currentStep === 1) {
      this.persistSkills();
      this.currentStep = 2;

      // Assign random avatar if none is selected
      if (!this.selectedAvatar && this.avatars.length > 0) {
        const randomIndex = Math.floor(Math.random() * this.avatars.length);
        this.selectedAvatar = this.avatars[randomIndex];
        this.persistProfile();
      }
    } else if (this.currentStep === 2) {
      this.persistProfile();
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      this.persistProfile();
      this.currentStep = 4;
    } else if (this.currentStep === 4) {
      this.persistLanguages();
      this.currentStep = 5;
    } else if (this.currentStep === 5) {
      this.persistLinks();
      this.currentStep = 6;
    } else if (this.currentStep === 6) {
      this.onSubmit();
      return;
    }
    this.persistStep();
  }

  onSkip(): void {
    if (this.currentStep === 5) {
      // User chose to skip adding links
      this.currentStep = 6;
      this.persistStep();
    }
  }

  onBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.persistStep();
    } else if (this.currentStep === 1) {
      this.persistStep();
      this.persistSkills();
      this.router.navigate(['/new-home']);
    }
  }

  // ─── Persist to Session and LocalStorage ───
  private persistSkills(): void {
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    const data = JSON.stringify(this.selectedSkills);
    sessionStorage.setItem('onboarding_selected_skills', data);
    localStorage.setItem(`onboarding_skills_${flId}`, data);
    if (this.selectedCategory) {
      const catData = JSON.stringify({ id: this.selectedCategory.id, name: this.selectedCategory.name });
      sessionStorage.setItem('onboarding_selected_domain', catData);
      localStorage.setItem(`onboarding_domain_${flId}`, catData);
    } else {
      sessionStorage.removeItem('onboarding_selected_domain');
      localStorage.removeItem(`onboarding_domain_${flId}`);
    }
  }

  private persistProfile(): void {
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    const data = JSON.stringify({
      fullName: this.fullName,
      username: this.username,
      email: this.email,
      contactNumber: this.contactNumber,
      gender: this.gender,
      dateOfBirth: this.dateOfBirth,
      nationality: this.nationality,
      country: this.country,
      selectedAvatarId: this.selectedAvatar ? this.selectedAvatar.id : null,
      professionalHeadline: this.professionalHeadline,
      professionalBio: this.professionalBio
    });
    sessionStorage.setItem('onboarding_profile', data);
    localStorage.setItem(`onboarding_profile_${flId}`, data);
  }

  private persistLanguages(): void {
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    const data = JSON.stringify(this.selectedLanguages);
    sessionStorage.setItem('onboarding_languages', data);
    localStorage.setItem(`onboarding_languages_${flId}`, data);
  }

  private persistLinks(): void {
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    const data = JSON.stringify({
      linkedinUrl: this.linkedinUrl,
      instagramUrl: this.instagramUrl,
      twitterUrl: this.twitterUrl,
      githubUrl: this.githubUrl,
      portfolioUrl: this.portfolioUrl
    });
    sessionStorage.setItem('onboarding_links', data);
    localStorage.setItem(`onboarding_links_${flId}`, data);
  }

  resumeFileData: File | null = null;

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.resumeFileData = file;
      this.resumeFileName = file.name;
    }
  }

  removeResume(): void {
    this.resumeFileName = '';
    this.resumeFileData = null;
  }

  // --- Project Experience Methods ---
  toggleYearsDropdown() {
    this.showYearsDropdown = !this.showYearsDropdown;
  }

  selectYearsOfExperience(year: string) {
    this.yearsOfExperience = year;
    this.showYearsDropdown = false;
  }

  // ─── Project Modal Validation State ───
  projectErrorMessages = {
    domain: '',
    title: '',
    description: '',
    experience: ''
  };

  validateProjectField(fieldName: string): void {
    if (fieldName === 'domain') {
      this.projectErrorMessages.domain = '';
      const val = this.newProject.domain ? this.newProject.domain.trim() : '';
      if (!val) {
        this.projectErrorMessages.domain = 'Project domain is required.';
      } else if (/\d/.test(this.newProject.domain)) {
        this.projectErrorMessages.domain = 'Numbers are not allowed in project domain.';
      }
      return;
    }

    if (fieldName === 'title') {
      this.projectErrorMessages.title = '';
      const val = this.newProject.title ? this.newProject.title.trim() : '';
      if (!val) {
        this.projectErrorMessages.title = 'Project title is required.';
      } else if (/\d/.test(this.newProject.title)) {
        this.projectErrorMessages.title = 'Numbers are not allowed in project title.';
      } else if (!/^[a-zA-Z\s]+$/.test(this.newProject.title)) {
        this.projectErrorMessages.title = 'Only alphabets and spaces are allowed. Numbers and special characters are not permitted.';
      }
      return;
    }

    if (fieldName === 'description') {
      this.projectErrorMessages.description = '';
      return;
    }

    if (fieldName === 'experience') {
      this.projectErrorMessages.experience = '';
      if (!this.newProject.experience) {
        this.projectErrorMessages.experience = 'Project experience is required.';
      }
      return;
    }
  }

  isProjectValid(): boolean {
    const domainVal = this.newProject.domain ? this.newProject.domain.trim() : '';
    const isDomainValid = domainVal.length > 0 && !/\d/.test(this.newProject.domain);

    const titleVal = this.newProject.title ? this.newProject.title.trim() : '';
    const isTitleValid = titleVal.length > 0 && !/\d/.test(this.newProject.title) && /^[a-zA-Z\s]+$/.test(this.newProject.title);

    const isExperienceValid = !!this.newProject.experience;

    return isDomainValid && isTitleValid && isExperienceValid && !this.projectErrorMessages.domain && !this.projectErrorMessages.title && !this.projectErrorMessages.experience;
  }

  openProjectModal(): void {
    this.newProject = { domain: '', title: '', description: '', experience: '' };
    this.projectErrorMessages = { domain: '', title: '', description: '', experience: '' };
    this.showProjectModal = true;
  }

  closeProjectModal(): void {
    this.showProjectModal = false;
    this.showProjectExperienceDropdown = false;
  }

  toggleProjectExperienceDropdown(): void {
    this.showProjectExperienceDropdown = !this.showProjectExperienceDropdown;
  }

  selectProjectExperience(option: string): void {
    this.newProject.experience = option;
    this.showProjectExperienceDropdown = false;
    this.validateProjectField('experience');
  }

  addProject(): void {
    this.validateProjectField('domain');
    this.validateProjectField('title');
    if (this.isProjectValid()) {
      this.projects.push({ ...this.newProject });
      const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
      localStorage.setItem(`onboarding_step6_${flId}`, JSON.stringify({
        yearsOfExperience: this.yearsOfExperience,
        projects: this.projects,
        certifications: this.certifications,
        resumeFileName: this.resumeFileName
      }));
      this.closeProjectModal();
    }
  }

  removeProject(index: number): void {
    this.projects.splice(index, 1);
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    localStorage.setItem(`onboarding_step6_${flId}`, JSON.stringify({
      yearsOfExperience: this.yearsOfExperience,
      projects: this.projects,
      certifications: this.certifications,
      resumeFileName: this.resumeFileName
    }));
  }

  // ─── Certification Modal Validation State ───
  certErrorMessages = {
    title: '',
    issuer: '',
    url: ''
  };

  validateCertField(fieldName: string): void {
    if (fieldName === 'title') {
      this.certErrorMessages.title = '';
      if (!this.newCertification.title || !this.newCertification.title.trim()) {
        this.certErrorMessages.title = 'Certification title is required.';
      }
    } else if (fieldName === 'issuer') {
      this.certErrorMessages.issuer = '';
      if (!this.newCertification.issuer || !this.newCertification.issuer.trim()) {
        this.certErrorMessages.issuer = 'Issued by is required.';
      }
    } else if (fieldName === 'url') {
      this.certErrorMessages.url = '';
      const val = this.newCertification.credentialUrl ? this.newCertification.credentialUrl.trim() : '';
      if (val && !this.isValidUrl(val)) {
        this.certErrorMessages.url = 'Please enter a valid URL (e.g. https://...).';
      }
    }
  }

  isCertValid(): boolean {
    const hasTitle = !!(this.newCertification.title && this.newCertification.title.trim());
    const hasIssuer = !!(this.newCertification.issuer && this.newCertification.issuer.trim());
    const isUrlValid = !this.newCertification.credentialUrl || !this.newCertification.credentialUrl.trim() || this.isValidUrl(this.newCertification.credentialUrl.trim());
    return hasTitle && hasIssuer && isUrlValid && !this.certErrorMessages.title && !this.certErrorMessages.issuer && !this.certErrorMessages.url;
  }

  openCertModal(): void {
    this.newCertification = { title: '', issuer: '', issueDate: '', credentialUrl: '', fileName: '' };
    this.certErrorMessages = { title: '', issuer: '', url: '' };
    this.showCertModal = true;
  }

  closeCertModal(): void {
    this.showCertModal = false;
  }

  addCertification(): void {
    this.validateCertField('title');
    this.validateCertField('issuer');
    if (this.isCertValid()) {
      this.certifications.push({ ...this.newCertification });
      const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
      localStorage.setItem(`onboarding_step6_${flId}`, JSON.stringify({
        yearsOfExperience: this.yearsOfExperience,
        projects: this.projects,
        certifications: this.certifications,
        resumeFileName: this.resumeFileName
      }));
      this.closeCertModal();
    }
  }

  onCertFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.newCertification.fileName = file.name;
      this.newCertification.fileData = file;
    }
  }

  removeCertFile(): void {
    this.newCertification.fileName = '';
    this.newCertification.fileData = null;
  }

  removeCertification(index: number): void {
    this.certifications.splice(index, 1);
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id') || 'guest';
    localStorage.setItem(`onboarding_step6_${flId}`, JSON.stringify({
      yearsOfExperience: this.yearsOfExperience,
      projects: this.projects,
      certifications: this.certifications,
      resumeFileName: this.resumeFileName
    }));
  }

  onSubmit(): void {
    this.isSubmitting = true;
    this.isSuccess = false;
    const flId = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id');

    // Persist Step 6 details
    const step6Data = {
      yearsOfExperience: this.yearsOfExperience || '1 year',
      projects: this.projects,
      certifications: this.certifications,
      resumeFileName: this.resumeFileName
    };
    if (flId) {
      localStorage.setItem(`onboarding_step6_${flId}`, JSON.stringify(step6Data));
      if (this.selectedAvatar) {
        localStorage.setItem(`user_avatar_${flId}`, this.selectedAvatar.image);
      }
    }

    const formattedExternalProjects = this.projects.reduce((acc: any, proj) => {
      if (proj.domain) {
        acc[proj.domain] = {
          title: proj.title,
          description: proj.description,
          experience: proj.experience
        };
      }
      return acc;
    }, {});

    const userUpdatePayload: any = {
      fullname: this.fullName.trim(),
      username: this.username.trim() || this.fullName.trim().toLowerCase().replace(/\s+/g, '_'),
      email: this.email.trim(),
      contact: this.contactNumber.trim(),
      gender: this.gender,
      dob: this.dateOfBirth,
      nationality: this.nationality,
      country: this.country,
      skillTitle: this.professionalHeadline.trim(),
      description: this.professionalBio.trim(),
      languages: this.selectedLanguages,
      experience: this.yearsOfExperience || '1 year',
      external_projects: formattedExternalProjects,
      agree: true
    };

    if (flId && flId !== 'guest') {
      this.service.put(`/users/updatedata/${flId}`, userUpdatePayload).subscribe({
        next: () => {
          // Save skills to backend (Send one request per skill as expected by the backend)
          if (this.selectedSkills && this.selectedSkills.length > 0) {
            this.selectedSkills.forEach(skillObj => {
              const skillPayload = {
                fl_id: flId,
                skill: skillObj.name,
                status: skillObj.level
              };
              this.service.post('/skills/createskill', skillPayload).subscribe({
                next: () => (window as any).appLogger?.info(`Skill saved: ${skillObj.name}`),
                error: (err: any) => (window as any).appLogger?.error(`Error saving skill ${skillObj.name}:`, err)
              });
            });
          }

          // Upload Resume to backend
          if (this.resumeFileData) {
            const formData = new FormData();
            formData.append('file', this.resumeFileData, this.resumeFileName);
            this.service.postFormData(`/users/uploadResume/${flId}`, formData).subscribe({
              next: () => (window as any).appLogger?.info('Resume uploaded successfully'),
              error: (err: any) => (window as any).appLogger?.error('Error uploading resume:', err)
            });
          }

          // Upload Certifications to backend
          if (this.certifications && this.certifications.length > 0) {
            this.certifications.forEach(cert => {
              const certData = new FormData();
              certData.append('title', cert.title || '');
              certData.append('issuer', cert.issuer || '');
              certData.append('date', cert.issueDate || cert.date || '');
              certData.append('link', cert.credentialUrl || cert.link || '');
              
              if (cert.fileData) {
                certData.append('file', cert.fileData, cert.fileName);
              }

              this.service.postFormData(`/users/uploadCertificate/${flId}`, certData).subscribe({
                next: () => (window as any).appLogger?.info(`Certificate uploaded successfully: ${cert.title}`),
                error: (err: any) => (window as any).appLogger?.error(`Error uploading certificate ${cert.title}:`, err)
              });
            });
          }

          localStorage.setItem(`onboarding_completed_${flId}`, 'true');
          localStorage.setItem('onboarding_completed', 'true');
          sessionStorage.setItem('onboarding_completed', 'true');
          localStorage.setItem('profileComplete', 'true');
          localStorage.removeItem(`onboarding_current_step_${flId}`);
          sessionStorage.removeItem('onboarding_current_step');
          this.service.setProfileComplete(true);

          setTimeout(() => {
            this.isSubmitting = false;
            this.isSuccess = true;

            setTimeout(() => {
              this.router.navigate(['/home/freelancer-dash']);
            }, 1200);
          }, 800);
        },
        error: (err: any) => {
          (window as any).appLogger?.error('Failed to update user onboarding data:', err);
          localStorage.setItem(`onboarding_completed_${flId}`, 'true');
          localStorage.setItem('onboarding_completed', 'true');
          sessionStorage.setItem('onboarding_completed', 'true');
          localStorage.setItem('profileComplete', 'true');
          localStorage.removeItem(`onboarding_current_step_${flId}`);
          sessionStorage.removeItem('onboarding_current_step');
          this.service.setProfileComplete(true);

          setTimeout(() => {
            this.isSubmitting = false;
            this.isSuccess = true;

            setTimeout(() => {
              this.router.navigate(['/home/freelancer-dash']);
            }, 1200);
          }, 800);
        }
      });
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      sessionStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('profileComplete', 'true');
      this.service.setProfileComplete(true);

      setTimeout(() => {
        this.isSubmitting = false;
        this.isSuccess = true;

        setTimeout(() => {
          this.router.navigate(['/home/freelancer-dash']);
        }, 1200);
      }, 800);
    }
  }

  // ─── Track by for ngFor performance ───
  trackByCategory(index: number, category: SkillCategory): string {
    return category.id;
  }

  trackBySkill(index: number, skill: any): string {
    return typeof skill === 'string' ? skill : skill.name;
  }

  trackBySearchResult(index: number, result: { category: string; skill: string }): string {
    return result.category + '_' + result.skill;
  }
}
