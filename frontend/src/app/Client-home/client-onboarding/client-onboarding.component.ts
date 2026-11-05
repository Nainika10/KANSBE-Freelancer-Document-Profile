import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { ALL_WORLD_COUNTRIES } from 'src/app/onboarding/countries-data';

export interface Avatar {
  id: string;
  name: string;
  image: string;
}

export interface ClientErrorMessages {
  fullname: string;
  username: string;
  email: string;
  contact: string;
  gender: string;
  dob: string;
  nationality: string;
  country: string;
  bio: string;
  companyname: string;
  companytype: string;
  companyaddress: string;
  city: string;
  state: string;
  pincode: string;
  companydescrptn: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  github: string;
}

export interface ValidationRule {
  pattern: RegExp;
  message: string;
}

export interface ClientValidationRules {
  fullname: ValidationRule;
  username: ValidationRule;
  email: ValidationRule;
  contact: ValidationRule;
  nationality: ValidationRule;
  country: ValidationRule;
  gender: ValidationRule;
  bio: ValidationRule;
  companyaddress: ValidationRule;
  companyname: ValidationRule;
  city: ValidationRule;
  state: ValidationRule;
  companydescrptn: ValidationRule;
  linkedin: ValidationRule;
  twitter: ValidationRule;
  instagram: ValidationRule;
  github: ValidationRule;
}

@Component({
  selector: 'app-client-onboarding',
  templateUrl: './client-onboarding.component.html',
  styleUrls: ['./client-onboarding.component.css']
})
export class ClientOnboardingComponent implements OnInit {

  // ─── Onboarding Step State ───
  currentStep: number = 1; // 1: Profile Details, 2: About & Overview, 3: Company Info, 4: Online Presence
  readonly totalSteps: number = 4;

  // ─── Avatars ───
  selectedAvatar: Avatar | null = null;
  isAvatarModalOpen: boolean = false;
  avatars: Avatar[] = [
    { id: 'avatar-01', name: 'Executive Blue', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { id: 'avatar-02', name: 'Partner Amber', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
    { id: 'avatar-03', name: 'Director Slate', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack' },
    { id: 'avatar-04', name: 'Founder Coral', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily' },
    { id: 'avatar-05', name: 'Lead Obsidian', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max' },
    { id: 'avatar-06', name: 'Consultant Teal', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' }
  ];

  // ─── Step 1: Profile Details ───
  fullName: string = '';
  username: string = '';
  email: string = '';
  contactNumber: string = '';
  gender: string = '';
  dateOfBirth: string = '';
  nationality: string = '';
  country: string = '';

  // Dropdown States
  showGenderDropdown: boolean = false;
  allGenders: string[] = ['Male', 'Female', 'Other'];
  filteredGenders: string[] = [...this.allGenders];

  showNationalityDropdown: boolean = false;
  filteredNationalities: string[] = [];
  allNationalities: string[] = Array.from(
    new Set(
      (ALL_WORLD_COUNTRIES || []).map(c => c.nationality).filter(n => !!n && n.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  showCountryDropdown: boolean = false;
  filteredCountries: string[] = [];
  allCountries: string[] = Array.from(
    new Set([
      ...(ALL_WORLD_COUNTRIES || []).map(c => c.name),
      'United States of America',
      'United Kingdom'
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Date Picker State
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

  // ─── Step 2: About & Overview ───
  bio: string = '';

  // ─── Step 3: Company & Organization ───
  companyName: string = '';
  companyType: string = '';
  companyAddress: string = '';
  city: string = '';
  state: string = '';
  pincode: string = '';
  companyDescription: string = '';

  readonly companyTypes = [
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'private_limited', label: 'Private Limited' },
    { value: 'public_limited', label: 'Public Limited' },
    { value: 'llc', label: 'Limited Liability Company (LLC)' },
    { value: 'corporation', label: 'Corporation' }
  ];

  // ─── Step 4: Online Presence ───
  linkedinUrl: string = '';
  twitterUrl: string = '';
  instagramUrl: string = '';
  githubUrl: string = '';

  // ─── Submission State ───
  isSubmitting: boolean = false;
  isSuccess: boolean = false;
  submitError: string = '';

  // ─── Validation Error Messages (Aligned with CsettingsComponent) ───
  errorMessages: ClientErrorMessages = {
    fullname: '',
    username: '',
    email: '',
    contact: '',
    gender: '',
    dob: '',
    nationality: '',
    country: '',
    bio: '',
    companyname: '',
    companytype: '',
    companyaddress: '',
    city: '',
    state: '',
    pincode: '',
    companydescrptn: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    github: ''
  };

  // Validation Rules matching CsettingsComponent exactly
  private validationRules: ClientValidationRules = {
    fullname: { pattern: /^[a-zA-Z][a-zA-Z\s]*$/, message: 'Full name must start with a letter and contain only letters and spaces' },
    username: { pattern: /^[a-zA-Z][a-zA-Z0-9\._]*$/, message: 'Username must start with a letter and can contain numbers, dots, and underscores' },
    email: { pattern: /^[a-zA-Z0-9@\.]+$/, message: 'Only letters, numbers, @, and periods are allowed' },
    contact: { pattern: /^[0-9]{10}$/, message: 'Must be exactly 10 digits' },
    nationality: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    country: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    gender: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    bio: { pattern: /^[a-zA-Z][^<>]*$/, message: 'Bio must start with a letter and cannot contain < or >' },
    companyaddress: { pattern: /^[a-zA-Z].*$/, message: 'Company address must start with a letter' },
    companyname: { pattern: /^[a-zA-Z][a-zA-Z\s]*$/, message: 'Company name must start with a letter and contain only letters and spaces' },
    city: { pattern: /^[a-zA-Z][a-zA-Z\s]*$/, message: 'City must start with a letter and contain only letters and spaces' },
    state: { pattern: /^[a-zA-Z][a-zA-Z\s]*$/, message: 'State must start with a letter and contain only letters and spaces' },
    companydescrptn: { pattern: /^[a-zA-Z][^<>]{19,249}$/, message: 'Description must start with a letter and be 20-250 characters' },
    linkedin: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?linkedin\.com\/.*$/, message: 'Invalid LinkedIn URL' },
    twitter: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?twitter\.com\/.*$|^(https?:\/\/)?([\w\w\.]+\.)?x\.com\/.*$/, message: 'Invalid Twitter/X URL' },
    instagram: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?instagram\.com\/.*$/, message: 'Invalid Instagram URL' },
    github: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?facebook\.com\/.*$|^(https?:\/\/)?([\w\w\.]+\.)?github\.com\/.*$/, message: 'Invalid Social / Github URL' }
  };

  cid: string = '';

  constructor(
    private router: Router,
    private service: ServiceService
  ) { }

  @HostListener('window:popstate')
  onPopState(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.persistStep();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.showDatePicker && !target.closest('.dob-picker-container')) {
      this.showDatePicker = false;
    }
    if (this.showGenderDropdown && !target.closest('.gender-container')) {
      this.showGenderDropdown = false;
    }
    if (this.showNationalityDropdown && !target.closest('.nationality-container')) {
      this.showNationalityDropdown = false;
    }
    if (this.showCountryDropdown && !target.closest('.country-container')) {
      this.showCountryDropdown = false;
    }
  }

  ngOnInit(): void {
    // Role guard: Ensure freelancers do not access client onboarding
    const loginType = sessionStorage.getItem('loginType');
    if (loginType === 'freelancer') {
      this.router.navigate(['/home/freelancer-dash'], { replaceUrl: true });
      return;
    }

    this.cid = sessionStorage.getItem('c_id') || localStorage.getItem('c_id') || '';

    // Initialize calendar
    this.initializeDatePicker();

    // Check if user is already onboarded
    if (this.cid) {
      const isCompleteLocal = localStorage.getItem(`client_onboarding_completed_${this.cid}`) === 'true';
      if (isCompleteLocal) {
        this.router.navigate(['/home/client-dash'], { replaceUrl: true });
        return;
      }

      this.service.get(`/cregister/getdata/${this.cid}`).subscribe({
        next: (userData: any) => {
          if (this.checkIfClientOnboarded(userData, this.cid)) {
            this.service.setProfileComplete(true);
            this.router.navigate(['/home/client-dash'], { replaceUrl: true });
            return;
          }
          this.populateExistingData(userData);
        },
        error: () => {
          this.restoreFromLocalSession();
        }
      });
    } else {
      this.restoreFromLocalSession();
    }
  }

  private populateExistingData(userData: any): void {
    if (userData) {
      if (userData.fullname && !this.fullName) this.fullName = userData.fullname;
      if (userData.email && !this.email) this.email = userData.email;
      if (userData.username && !this.username) this.username = userData.username;
      if (userData.contact && !this.contactNumber) this.contactNumber = userData.contact;
      if (userData.gender && !this.gender) this.gender = userData.gender;
      if (userData.dob && !this.dateOfBirth) this.dateOfBirth = userData.dob.substring(0, 10);
      if (userData.nationality && !this.nationality) this.nationality = userData.nationality;
      if (userData.country && !this.country) this.country = userData.country;
      if (userData.bio && !this.bio) this.bio = userData.bio;
      if (userData.companyname && !this.companyName) this.companyName = userData.companyname;
      if (userData.companytype && !this.companyType) this.companyType = userData.companytype;
      if (userData.companyaddress && !this.companyAddress) this.companyAddress = userData.companyaddress;
      if (userData.city && !this.city) this.city = userData.city;
      if (userData.state && !this.state) this.state = userData.state;
      if (userData.pincode && !this.pincode) this.pincode = userData.pincode;
      if (userData.companydescrptn && !this.companyDescription) this.companyDescription = userData.companydescrptn;
      if (userData.linkedin && !this.linkedinUrl) this.linkedinUrl = userData.linkedin;
      if (userData.twitter && !this.twitterUrl) this.twitterUrl = userData.twitter;
      if (userData.instagram && !this.instagramUrl) this.instagramUrl = userData.instagram;
      if (userData.facebook && !this.githubUrl) this.githubUrl = userData.facebook;

      if (userData.p_pic) {
        const matchingAvatar = this.avatars.find(a => a.image === userData.p_pic);
        this.selectedAvatar = matchingAvatar || { id: 'custom-avatar', name: 'Current Avatar', image: userData.p_pic };
      }
    }
    this.restoreFromLocalSession();
  }

  getSavedStep(): number {
    const idKey = this.cid || sessionStorage.getItem('c_id') || localStorage.getItem('c_id') || 'client_guest';
    const keys = [
      `client_onboarding_current_step_${idKey}`,
      'client_onboarding_current_step_client_guest',
      'client_onboarding_current_step'
    ];
    for (const key of keys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val) {
        const num = parseInt(val, 10);
        if (num >= 1 && num <= this.totalSteps) {
          return num;
        }
      }
    }
    return 1;
  }

  private restoreFromLocalSession(): void {
    const idKey = this.cid || sessionStorage.getItem('c_id') || localStorage.getItem('c_id') || 'client_guest';

    // Pre-populate Full Name & Email from registration
    const regName = sessionStorage.getItem('registered_fullname') || localStorage.getItem('registered_fullname') || '';
    const regEmail = sessionStorage.getItem('registered_email') || localStorage.getItem('registered_email') || '';
    if (regName && !this.fullName) this.fullName = regName;
    if (regEmail && !this.email) this.email = regEmail;

    // Restore saved step
    this.currentStep = this.getSavedStep();

    // Restore saved profile data
    const keys = [
      `client_onboarding_profile_${idKey}`,
      'client_onboarding_profile_client_guest',
      'client_onboarding_profile'
    ];
    let savedData: string | null = null;
    for (const key of keys) {
      savedData = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (savedData) break;
    }

    if (savedData) {
      try {
        const p = JSON.parse(savedData);
        if (p.fullName && !this.fullName) this.fullName = p.fullName;
        if (p.username && !this.username) this.username = p.username;
        if (p.email && !this.email) this.email = p.email;
        if (p.contactNumber && !this.contactNumber) this.contactNumber = p.contactNumber;
        if (p.gender && !this.gender) this.gender = p.gender;
        if (p.dateOfBirth && !this.dateOfBirth) this.dateOfBirth = p.dateOfBirth;
        if (p.nationality && !this.nationality) this.nationality = p.nationality;
        if (p.country && !this.country) this.country = p.country;
        if (p.bio && !this.bio) this.bio = p.bio;
        if (p.companyName && !this.companyName) this.companyName = p.companyName;
        if (p.companyType && !this.companyType) this.companyType = p.companyType;
        if (p.companyAddress && !this.companyAddress) this.companyAddress = p.companyAddress;
        if (p.city && !this.city) this.city = p.city;
        if (p.state && !this.state) this.state = p.state;
        if (p.pincode && !this.pincode) this.pincode = p.pincode;
        if (p.companyDescription && !this.companyDescription) this.companyDescription = p.companyDescription;
        if (p.linkedinUrl && !this.linkedinUrl) this.linkedinUrl = p.linkedinUrl;
        if (p.twitterUrl && !this.twitterUrl) this.twitterUrl = p.twitterUrl;
        if (p.instagramUrl && !this.instagramUrl) this.instagramUrl = p.instagramUrl;
        if (p.githubUrl && !this.githubUrl) this.githubUrl = p.githubUrl;
        if (p.selectedAvatarId && !this.selectedAvatar) {
          this.selectedAvatar = this.avatars.find(a => a.id === p.selectedAvatarId) || null;
        }
      } catch (e) {
        (window as any).appLogger?.error('Error parsing saved client onboarding profile:', e);
      }
    }

    // Default avatar if none selected
    if (!this.selectedAvatar && this.avatars.length > 0) {
      this.selectedAvatar = this.avatars[0];
    }
  }

  // Check if client is already onboarded
  checkIfClientOnboarded(user: any, cid: string): boolean {
    if (localStorage.getItem(`client_onboarding_completed_${cid}`) === 'true') {
      return true;
    }
    if (!user) return false;

    const hasContact = !!(user.contact && user.contact.toString().trim().length === 10);
    const hasDob = !!(user.dob && user.dob.toString().trim());
    const hasNationality = !!(user.nationality && user.nationality.toString().trim());
    const hasCountry = !!(user.country && user.country.toString().trim());
    const hasBio = !!(user.bio && user.bio.toString().trim().length >= 50);

    const isComplete = (user.profile === true || user.profile === 'true') &&
                       hasContact && hasDob && hasNationality && hasCountry && hasBio;
    if (isComplete) {
      localStorage.setItem(`client_onboarding_completed_${cid}`, 'true');
    }
    return isComplete;
  }

  // ─── Progress & Header ───
  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  get currentStepLabel(): string {
    switch (this.currentStep) {
      case 1: return 'Profile Details';
      case 2: return 'About & Overview';
      case 3: return 'Company Information';
      case 4: return 'Online Presence';
      default: return 'Client Onboarding';
    }
  }

  // ─── Avatar Modal Methods ───
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

  // ─── Example Bio for Client Preview ───
  exampleBio: string = 'Tech entrepreneur & product leader looking for skilled freelancers to build scalable web & mobile apps. Passionate about clean code, UI/UX design, and fast execution.';

  // ─── Dropdown Methods ───
  onGenderInput(event: any): void {
    const val = (event.target.value || '').trim().toLowerCase();
    this.filteredGenders = this.allGenders.filter(g => g.toLowerCase().includes(val));
    this.showGenderDropdown = this.filteredGenders.length > 0;
  }

  selectGender(gender: string): void {
    this.gender = gender;
    this.showGenderDropdown = false;
    this.validateField('gender');
    this.persistProfile();
  }

  onNationalityInput(event: any): void {
    const val = (event?.target?.value || this.nationality || '').trim().toLowerCase();
    this.validateField('nationality');
    this.persistProfile();

    if (!val || val.length === 0) {
      this.filteredNationalities = [];
      this.showNationalityDropdown = false;
      return;
    }

    this.filteredNationalities = this.allNationalities.filter(n =>
      n.toLowerCase().includes(val)
    );
    this.showNationalityDropdown = this.filteredNationalities.length > 0;
  }

  selectNationality(nationality: string): void {
    this.nationality = nationality;
    this.showNationalityDropdown = false;
    this.filteredNationalities = [];
    this.validateField('nationality');
    this.persistProfile();
  }

  onCountryInput(event: any): void {
    const val = (event?.target?.value || this.country || '').trim().toLowerCase();
    this.validateField('country');
    this.persistProfile();

    if (!val || val.length === 0) {
      this.filteredCountries = [];
      this.showCountryDropdown = false;
      return;
    }

    this.filteredCountries = this.allCountries.filter(c =>
      c.toLowerCase().includes(val)
    );
    this.showCountryDropdown = this.filteredCountries.length > 0;
  }

  selectCountry(country: string): void {
    this.country = country;
    this.showCountryDropdown = false;
    this.filteredCountries = [];
    this.validateField('country');
    this.persistProfile();
  }

  // ─── Custom Datepicker Methods ───
  initializeDatePicker(): void {
    this.years = [];
    const maxYear = new Date().getFullYear() - 18;
    for (let i = maxYear; i >= 1950; i--) {
      this.years.push(i);
    }
    if (!this.dateOfBirth) {
      this.selectedYear = maxYear;
    } else {
      const parts = this.dateOfBirth.split('-');
      if (parts.length === 3) {
        this.selectedYear = parseInt(parts[0], 10);
        this.selectedMonth = parseInt(parts[1], 10) - 1;
      }
    }
    this.generateCalendar();
  }

  generateCalendar(): void {
    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  toggleDatePicker(event: MouseEvent): void {
    event.stopPropagation();
    this.showDatePicker = !this.showDatePicker;
    if (this.showDatePicker) {
      this.generateCalendar();
    }
  }

  selectDate(day: number): void {
    if (!this.isDateSelectable(day)) return;
    const m = String(Number(this.selectedMonth) + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    this.dateOfBirth = `${this.selectedYear}-${m}-${d}`;
    this.showDatePicker = false;
    this.validateDob();
    this.persistProfile();
  }

  isDateActive(day: number): boolean {
    const fullDate = `${this.selectedYear}-${String(Number(this.selectedMonth) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.dateOfBirth === fullDate;
  }

  isDateSelectable(day: number): boolean {
    const today = new Date();
    const minValidDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const selectedDate = new Date(this.selectedYear, this.selectedMonth, day);
    return selectedDate <= minValidDob;
  }

  changeMonth(month: number): void {
    this.selectedMonth = Number(month);
    this.generateCalendar();
  }

  changeYear(year: number): void {
    this.selectedYear = Number(year);
    this.generateCalendar();
  }

  // ─── Live Validation Methods ───
  validateField(fieldName: keyof ClientErrorMessages): void {
    let value = '';
    switch (fieldName) {
      case 'fullname': value = this.fullName; break;
      case 'username': value = this.username; break;
      case 'email': value = this.email; break;
      case 'contact': value = this.contactNumber; break;
      case 'gender': value = this.gender; break;
      case 'nationality': value = this.nationality; break;
      case 'country': value = this.country; break;
      case 'bio': value = this.bio; break;
      case 'companyname': value = this.companyName; break;
      case 'companyaddress': value = this.companyAddress; break;
      case 'city': value = this.city; break;
      case 'state': value = this.state; break;
      case 'companydescrptn': value = this.companyDescription; break;
      case 'linkedin': value = this.linkedinUrl; break;
      case 'twitter': value = this.twitterUrl; break;
      case 'instagram': value = this.instagramUrl; break;
      case 'github': value = this.githubUrl; break;
    }

    const trimmed = (value || '').trim();
    this.errorMessages[fieldName] = '';

    const rule = this.validationRules[fieldName as keyof ClientValidationRules];
    const optionalFields = [
      'username', 'companyname', 'companytype', 'companyaddress',
      'city', 'state', 'pincode', 'companydescrptn',
      'linkedin', 'twitter', 'instagram', 'github'
    ];

    if (!trimmed && !optionalFields.includes(fieldName)) {
      this.errorMessages[fieldName] = 'This field is required';
      return;
    }

    if (trimmed && rule && !rule.pattern.test(trimmed)) {
      this.errorMessages[fieldName] = rule.message;
      return;
    }

    // Specific field logic matching CsettingsComponent
    if (fieldName === 'contact' && trimmed && trimmed.length !== 10) {
      this.errorMessages.contact = 'Contact number must be exactly 10 digits';
    }
    if (fieldName === 'bio' && trimmed && trimmed.length < 50) {
      this.errorMessages.bio = 'Bio must be at least 50 characters';
    }

    // Persist draft on every field change
    this.persistProfile();
    this.persistStep();
  }

  validateDob(): void {
    this.errorMessages.dob = '';
    if (!this.dateOfBirth) {
      this.errorMessages.dob = 'Date of birth is required';
      return;
    }
    const [y, m, d] = this.dateOfBirth.split('-').map(Number);
    const dobValue = new Date(y, m - 1, d);
    const today = new Date();
    const minValidDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

    if (dobValue > today) {
      this.errorMessages.dob = 'Date of birth cannot be in the future';
    } else if (dobValue > minValidDob) {
      this.errorMessages.dob = 'You must be at least 18 years old';
    }
  }

  allowOnlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  // ─── Step Validity Checks ───
  canContinue(): boolean {
    if (this.currentStep === 1) {
      const hasErrors = !!(
        this.errorMessages.fullname ||
        this.errorMessages.username ||
        this.errorMessages.email ||
        this.errorMessages.contact ||
        this.errorMessages.gender ||
        this.errorMessages.dob ||
        this.errorMessages.nationality ||
        this.errorMessages.country
      );
      const isFullNameValid = !!this.fullName.trim() && this.validationRules.fullname.pattern.test(this.fullName.trim());
      const isUsernameValid = !this.username.trim() || this.validationRules.username.pattern.test(this.username.trim());
      const isContactValid = !!this.contactNumber.trim() && this.contactNumber.trim().length === 10 && /^[0-9]{10}$/.test(this.contactNumber.trim());
      const isGenderValid = !!this.gender.trim();
      const isDobValid = !!this.dateOfBirth.trim() && !this.errorMessages.dob;
      const isNationalityValid = !!this.nationality.trim() && this.validationRules.nationality.pattern.test(this.nationality.trim());
      const isCountryValid = !!this.country.trim() && this.validationRules.country.pattern.test(this.country.trim());

      return !hasErrors && isFullNameValid && isUsernameValid && isContactValid && isGenderValid && isDobValid && isNationalityValid && isCountryValid;
    }

    if (this.currentStep === 2) {
      const isBioValid = !!this.bio.trim() && this.bio.trim().length >= 50 && this.validationRules.bio.pattern.test(this.bio.trim());
      return isBioValid && !this.errorMessages.bio;
    }

    if (this.currentStep === 3) {
      // Company details are optional; if entered, must not have errors
      const hasCompanyErrors = !!(
        this.errorMessages.companyname ||
        this.errorMessages.companyaddress ||
        this.errorMessages.city ||
        this.errorMessages.state ||
        this.errorMessages.companydescrptn
      );
      return !hasCompanyErrors;
    }

    if (this.currentStep === 4) {
      // Social links are optional; if entered, must not have errors
      const hasSocialErrors = !!(
        this.errorMessages.linkedin ||
        this.errorMessages.twitter ||
        this.errorMessages.instagram ||
        this.errorMessages.github
      );
      return !hasSocialErrors;
    }

    return false;
  }

  // ─── Step Navigation ───
  onNext(): void {
    if (!this.canContinue()) {
      return;
    }

    this.persistProfile();

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.persistStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.onSubmit();
    }
  }

  onSkip(): void {
    if (this.currentStep === 3) {
      // Skip optional company step
      this.currentStep = 4;
      this.persistStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.currentStep === 4) {
      // Skip optional social links and submit
      this.onSubmit();
    }
  }

  onBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.persistStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.router.navigate(['/new-home']);
    }
  }

  // ─── State Persistence ───
  persistStep(): void {
    const idKey = this.cid || sessionStorage.getItem('c_id') || localStorage.getItem('c_id') || 'client_guest';
    localStorage.setItem(`client_onboarding_current_step_${idKey}`, this.currentStep.toString());
    localStorage.setItem('client_onboarding_current_step', this.currentStep.toString());
    sessionStorage.setItem('client_onboarding_current_step', this.currentStep.toString());
  }

  persistProfile(): void {
    const idKey = this.cid || sessionStorage.getItem('c_id') || localStorage.getItem('c_id') || 'client_guest';
    const profileData = {
      fullName: this.fullName,
      username: this.username,
      email: this.email,
      contactNumber: this.contactNumber,
      gender: this.gender,
      dateOfBirth: this.dateOfBirth,
      nationality: this.nationality,
      country: this.country,
      bio: this.bio,
      companyName: this.companyName,
      companyType: this.companyType,
      companyAddress: this.companyAddress,
      city: this.city,
      state: this.state,
      pincode: this.pincode,
      companyDescription: this.companyDescription,
      linkedinUrl: this.linkedinUrl,
      twitterUrl: this.twitterUrl,
      instagramUrl: this.instagramUrl,
      githubUrl: this.githubUrl,
      selectedAvatarId: this.selectedAvatar?.id || null
    };

    const str = JSON.stringify(profileData);
    localStorage.setItem(`client_onboarding_profile_${idKey}`, str);
    localStorage.setItem('client_onboarding_profile', str);
    sessionStorage.setItem('client_onboarding_profile', str);
  }

  // ─── Final Submission ───
  onSubmit(): void {
    if (this.isSubmitting || this.isSuccess) return;

    this.isSubmitting = true;
    this.submitError = '';

    const id = this.cid || sessionStorage.getItem('c_id') || '';

    const updatePayload: any = {
      fullname: this.fullName.trim(),
      username: this.username.trim() || this.fullName.trim().toLowerCase().replace(/\s+/g, '_'),
      email: this.email.trim(),
      contact: this.contactNumber.trim(),
      gender: this.gender.trim(),
      dob: this.dateOfBirth,
      nationality: this.nationality.trim(),
      country: this.country.trim(),
      bio: this.bio.trim(),
      companyname: this.companyName?.trim() || null,
      companytype: this.companyType || null,
      companyaddress: this.companyAddress?.trim() || null,
      city: this.city?.trim() || null,
      state: this.state?.trim() || null,
      pincode: this.pincode?.trim() || null,
      companydescrptn: this.companyDescription?.trim() || null,
      linkedin: this.linkedinUrl?.trim() || null,
      twitter: this.twitterUrl?.trim() || null,
      instagram: this.instagramUrl?.trim() || null,
      facebook: this.githubUrl?.trim() || null,
      p_pic: this.selectedAvatar?.image || null,
      profile: true,
      updatedby: id
    };

    if (id) {
      this.service.put(`/cregister/update/${id}`, updatePayload).subscribe({
        next: () => {
          this.handleSaveSuccess(id, updatePayload);
        },
        error: (err: any) => {
          (window as any).appLogger?.error('Failed to update client profile during onboarding:', err);
          // Graceful handling to prevent trapping user
          this.handleSaveSuccess(id, updatePayload);
        }
      });
    } else {
      this.handleSaveSuccess('client_guest', updatePayload);
    }
  }

  private handleSaveSuccess(id: string, payload: any): void {
    localStorage.setItem(`client_onboarding_completed_${id}`, 'true');
    localStorage.setItem('client_onboarding_completed', 'true');
    sessionStorage.setItem('client_onboarding_completed', 'true');
    localStorage.setItem('profileComplete', 'true');

    localStorage.removeItem(`client_onboarding_current_step_${id}`);
    localStorage.removeItem('client_onboarding_current_step');
    sessionStorage.removeItem('client_onboarding_current_step');
    localStorage.removeItem(`client_onboarding_profile_${id}`);
    localStorage.removeItem('client_onboarding_profile');
    sessionStorage.removeItem('client_onboarding_profile');

    this.service.setClientProfile(payload);
    this.service.setProfileComplete(true);
    this.service.refreshClientStats(id);

    setTimeout(() => {
      this.isSubmitting = false;
      this.isSuccess = true;

      setTimeout(() => {
        this.router.navigate(['/home/client-dash']);
      }, 1200);
    }, 800);
  }
}
