import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { LoaderService } from 'src/app/services/loader.service';
import { fl_id } from 'src/untility/const';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  providers: [DatePipe]
})
export class SettingsComponent implements OnInit, OnDestroy {
  usr: any = {};
  realAccountNumber: string | undefined;

  activeSection: 'profile' | 'password' | 'billing' = 'profile';
  isDarkTheme: boolean = false;
  isEdit = false;
  isBank = false;
  data = true;
  button = 'Save Details';

  // Profile Completeness
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];
  enabled = false;
  saveDisabled = false;
  flid: any;
  minAge: number = 12;

  changePasswordForm!: FormGroup;
  isChangingPassword = false;
  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;
  profile = {
    fullname: '',
    username: '',
    email: '',
    contact: '',
    gender: '',
    dob: '',
    nationality: '',
    languages: '', // kept for backward compatibility
    languagesArray: [] as string[], // new array field for languages
    experience: '',
    profession: '', // added missing field
    country: '',
    skillTitle: '',
    linkedin: '',
    instagram: '',
    twitter: '',
    github: '',
    portfolio: '',
    description: '',
    isStudent: '',
    external_projects: {} as Record<string, {title: string, experience: string, description: string}>
  };

  // language input field
  languageInput: string = '';
  filteredLanguages: string[] = [];
  showLanguageDropdown: boolean = false;

  // Sidebar Identity & Features (Xerox from fdashboard)
  skillexist: any[] = [];
  skilldetails: any = { skill: '', status: '' };
  showSkillModal: boolean = false;

  // Portfolio / External Projects
  showExternalProjectModal = false;
  showConfirmProjectModal = false;
  projectToDelete: string | null = null;
  newExternalProject = { domain: '', title: '', description: '', experience: '' };
  externalProjectErrorMessages = { domain: '', title: '', description: '', experience: '' };
  showProjectExperienceDropdown = false;
  yearsOptions: string[] = ['0', '0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'];
  allLanguages: string[] = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Portuguese', 'Italian',
    'Hindi', 'Arabic', 'Bengali', 'Punjabi', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam',
    'Sanskrit', 'Persian', 'Turkish', 'Vietnamese', 'Thai', 'Polish', 'Dutch', 'Ukrainian', 'Greek', 'Czech', 'Romanian',
    'Hungarian', 'Hebrew', 'Indonesian', 'Malay', 'Burmese', 'Khmer', 'Lao', 'Zulu', 'Xhosa', 'Swahili', 'Hausa',
    'Amharic', 'Oromo', 'Yoruba', 'Igbo', 'Finnish', 'Swedish', 'Norwegian', 'Danish', 'Icelandic', 'Tagalog'
  ];

  onLanguageInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    if (val.length > 0) {
      this.filteredLanguages = this.allLanguages
        .filter(lang => lang.toLowerCase().includes(val))
        .filter(lang => !this.profile.languagesArray.includes(lang))
        .slice(0, 8);
      this.showLanguageDropdown = this.filteredLanguages.length > 0;
      this.errorMessages.languages = '';
    } else {
      this.showLanguageDropdown = false;
    }
  }

  selectLanguage(lang: string): void {
    if (!this.profile.languagesArray.includes(lang)) {
      this.profile.languagesArray.push(lang);
    }
    this.languageInput = '';
    this.showLanguageDropdown = false;
    this.errorMessages.languages = '';
  }

  // --- Gender Autocomplete ---
  showGenderDropdown = false;
  allGenders = ['Male', 'Female', 'Other'];
  filteredGenders = [...this.allGenders];

  onGenderInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    this.filteredGenders = this.allGenders.filter(g => g.toLowerCase().includes(val));
    this.showGenderDropdown = this.filteredGenders.length > 0;
  }

  selectGender(gender: string): void {
    this.profile.gender = gender;
    this.showGenderDropdown = false;
    this.validateField('gender', gender);
  }

  // --- Nationality Autocomplete ---
  showNationalityDropdown = false;
  filteredNationalities: string[] = [];
  allNationalities = [
    'American', 'British', 'Canadian', 'Chinese', 'French', 'German', 'Indian', 'Italian', 'Japanese', 'Korean',
    'Mexican', 'Russian', 'Spanish', 'Australian', 'Brazilian', 'Egyptian', 'Greek', 'Indonesian', 'Nigerian',
    'Pakistani', 'Saudi Arabian', 'South African', 'Turkish', 'Vietnamese', 'Argentinian'
  ];

  onNationalityInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    if (val.length > 0) {
      this.filteredNationalities = this.allNationalities.filter(n => n.toLowerCase().includes(val)).slice(0, 8);
      this.showNationalityDropdown = this.filteredNationalities.length > 0;
    } else {
      this.showNationalityDropdown = false;
    }
  }

  selectNationality(nat: string): void {
    this.profile.nationality = nat;
    this.showNationalityDropdown = false;
    this.validateField('nationality', nat);
  }

  // --- Country Autocomplete ---
  showCountryDropdown = false;
  filteredCountries: string[] = [];
  allCountries = [
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
    'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar (formerly Burma)', 'Namibia', 'Nauru',
    'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
    'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
    'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
    'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
    'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America',
    'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  onCountryInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    if (val.length > 0) {
      this.filteredCountries = this.allCountries.filter(c => c.toLowerCase().includes(val)).slice(0, 8);
      this.showCountryDropdown = this.filteredCountries.length > 0;
    } else {
      this.showCountryDropdown = false;
    }
  }

  selectCountry(country: string): void {
    this.profile.country = country;
    this.showCountryDropdown = false;
    this.validateField('country', country);
  }

  // --- Unique Date Picker ---
  showDatePicker = false;
  currentDate = new Date();
  calendarDays: number[] = [];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years: number[] = [];
  selectedMonth = this.currentDate.getMonth();
  selectedYear = this.currentDate.getFullYear() - this.minAge; // Default to first selectable year

  initializeDatePicker(): void {
    const startYear = 1950;
    const cutoffYear = new Date().getFullYear() - this.minAge;

    // Clear and regenerate years list up to cutoff
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
    this.profile.dob = formattedDate;
    this.showDatePicker = false;
    this.validateField('dob', formattedDate);
  }

  toggleDatePicker(): void {
    this.showDatePicker = !this.showDatePicker;
    if (this.showDatePicker) {
      if (this.years.length === 0) {
        this.initializeDatePicker();
      }

      // Always sync calendar focus to currently selected DOB or default to cutoff
      const cutoffYear = new Date().getFullYear() - this.minAge;
      if (this.profile.dob) {
        const parts = this.profile.dob.split('-');
        if (parts.length === 3) {
          this.selectedYear = parseInt(parts[0]);
          this.selectedMonth = parseInt(parts[1]) - 1;
        }
      } else {
        this.selectedYear = cutoffYear;
      }
      this.generateCalendar();
    }
  }

  // ✅ Add language to languages array
  addLanguage(): void {
    if (!this.languageInput) return;

    // Accept comma-separated input and normalize
    const parts = this.languageInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    for (const p of parts) {
      // Validate pattern: only letters and spaces
      if (!/^[a-zA-Z\s]+$/.test(p)) continue;

      // Check duplicate (case-insensitive)
      const exists = this.profile.languagesArray.some(lang => lang.toLowerCase() === p.toLowerCase());
      if (!exists) {
        this.profile.languagesArray.push(p);
      }
    }
    this.languageInput = '';
    this.showLanguageDropdown = false;
  }

  // ✅ Remove language from array
  removeLanguage(index: number): void {
    this.profile.languagesArray.splice(index, 1);
  }

  isDateActive(day: number): boolean {
    if (!this.profile.dob) return false;
    const parts = this.profile.dob.split('-');
    if (parts.length !== 3) return false;

    const d = parseInt(parts[2]);
    const m = parseInt(parts[1]);
    const y = parseInt(parts[0]);

    const currentMonth = Number(this.selectedMonth);
    const currentYear = Number(this.selectedYear);

    return d === day && m === (currentMonth + 1) && y === currentYear;
  }

  notifications = {
    email: true,
    projectUpdates: true,
    marketing: false
  };

  errorMessages: any = {};
  bankErrorMessages: any = {};
  maxDob!: string;

  bankingInfo = {
    bankname: '',
    acholdername: '',
    acnumber: '',
    ifsc: '',
    branchname: ''
  };

  // Validation rules for profile fields
  private validationRules = {
    fullname: { pattern: /^[a-zA-Z\s\.]+$/, message: 'Only letters, spaces, and periods are allowed' },
    username: { pattern: /^[a-zA-Z\s\.]*$/, message: 'Only letters, spaces, and periods are allowed' },
    email: { pattern: /^[a-zA-Z0-9@\.]+$/, message: 'Only letters, numbers, @, and periods are allowed' },
    contact: { pattern: /^[0-9]{10}$/, message: 'Must be exactly 10 digits' },
    nationality: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    languages: { pattern: /^[a-zA-Z,\s]+$/, message: 'Only letters, commas, and spaces are allowed' },
    experience: { pattern: /^[0-9]+(\.[0-9]+)?$/, message: 'Enter a valid number (e.g., 2 or 2.5)' },
    profession: { pattern: /^[a-zA-Z\s,\/-]+$/, message: 'Only letters, spaces, commas, hyphens, and slashes are allowed' },
    country: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    skillTitle: {
      pattern: /^[a-zA-Z\s,\/-]+$/, message: 'Only letters, spaces, commas, hyphens, and slashes are allowed'
    },
    description: {
      pattern: /^[^<>]+$/, message: 'Bio cannot contain < or > characters'
    },
    gender: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    dob: { pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Invalid date format' },
    isStudent: { pattern: /^(yes|no)$/, message: 'Please select your student status' }
  };

  // Validation rules for banking fields
  private bankValidationRules = {
    bankname: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    acholdername: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    acnumber: { pattern: /^[0-9]{9,18}$/, message: 'Must be 9-18 digits only' },
    ifsc: { pattern: /^[A-Za-z0-9]+$/, message: 'Only letters and numbers are allowed' },
    branchname: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' }
  };

  constructor(
    private service: ServiceService,
    private datepipe: DatePipe,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private loaderService: LoaderService
  ) { }

  ngOnInit(): void {
    this.loaderService.reset();
    this.cleanupScrollClasses();
    if (!sessionStorage.getItem('fl_id')) {
      this.data = false;
    }
    this.flid = sessionStorage.getItem('fl_id');
    if (this.flid == null) {
      this.flid = sessionStorage.getItem('fl_id');
      return;
    }
    this.loadDetails();
    this.loadUserData();
    this.loadThemePreference();
    this.loadBankingInfo();

    const today = new Date();
    const minYear = today.getFullYear() - this.minAge;
    const maxDate = new Date(minYear, today.getMonth(), today.getDate());
    this.maxDob = maxDate.toISOString().split('T')[0];

    this.initializePasswordForm();
    this.loadSkills();

    // Check for direct navigation to skills section from profile
    this.route.queryParams.subscribe((params: any) => {
      if (params && params['section'] === 'skills') {
        this.activeSection = 'profile';
        if (params['edit'] === 'true') {
          this.isEdit = true;
        }
        setTimeout(() => {
          const el = document.getElementById('skills-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('skills-highlight-pulse');
            setTimeout(() => el.classList.remove('skills-highlight-pulse'), 3000);
          }
        }, 450);
      }
    });
  }

  // ✅ Field validation method with specific human-friendly messages
  validateField(fieldName: string, value: any): void {
    // 1. Clear previous error for this field
    this.errorMessages[fieldName] = '';

    // 2. Handle specific field validators first
    if (fieldName === 'dob') {
      this.validateDob();
      return;
    }

    if (fieldName === 'languages') {
      if (!this.profile.languagesArray || this.profile.languagesArray.length === 0) {
        this.errorMessages.languages = 'Please select at least one language';
      }
      return;
    }

    if (fieldName === 'isStudent') {
      if (!this.profile.isStudent) {
        this.errorMessages.isStudent = 'Please select your student status';
      }
      return;
    }

    const strVal = value !== null && value !== undefined ? value.toString().trim() : '';

    // 4. Required check with field-specific warning messages (except for optional username)
    if (!strVal && fieldName !== 'username') {
      switch (fieldName) {
        case 'fullname':
          this.errorMessages.fullname = 'Full name is required';
          break;
        case 'contact':
          this.errorMessages.contact = 'Contact number is required';
          break;
        case 'gender':
          this.errorMessages.gender = 'Gender is required';
          break;
        case 'nationality':
          this.errorMessages.nationality = 'Nationality is required';
          break;
        case 'country':
          this.errorMessages.country = 'Country is required';
          break;
        case 'profession':
          this.errorMessages.profession = 'Profession is required';
          break;
        case 'experience':
          this.errorMessages.experience = 'Experience is required';
          break;
        case 'description':
          this.errorMessages.description = 'About you (Bio) is required';
          break;
        default:
          this.errorMessages[fieldName] = 'This field is required';
      }
      return;
    }

    // 5. Bio Length check (Specific for description)
    if (fieldName === 'description') {
      if (strVal.length < 20) {
        this.errorMessages.description = 'Bio must be at least 20 characters long';
        return;
      }
    }

    // 6. Pattern check
    const rule = this.validationRules[fieldName as keyof typeof this.validationRules];
    if (rule && !rule.pattern.test(strVal)) {
      this.errorMessages[fieldName] = rule.message;
      return;
    }

    // 7. Additional specific validations
    switch (fieldName) {
      case 'contact':
        if (strVal.length !== 10) {
          this.errorMessages.contact = 'Contact number must be exactly 10 digits';
        }
        break;
      case 'experience':
        const exp = parseFloat(strVal);
        if (isNaN(exp) || exp < 0 || exp > 50) {
          this.errorMessages.experience = 'Experience must be between 0 and 50 years';
        }
        break;
      case 'email':
        if (strVal && !this.isValidEmail(strVal)) {
          this.errorMessages.email = 'Please enter a valid email address';
        }
        break;
    }
  }

  // ✅ Validate all profile fields and return overall validity
  validateAllProfileFields(): boolean {
    const requiredFields = [
      'fullname',
      'contact',
      'gender',
      'dob',
      'nationality',
      'country',
      'profession',
      'experience',
      'isStudent',
      'description'
    ];

    requiredFields.forEach(field => {
      if (field === 'dob') {
        this.validateDob();
      } else if (field === 'isStudent') {
        this.validateField('isStudent', this.profile.isStudent);
      } else {
        this.validateField(field, this.profile[field as keyof typeof this.profile]);
      }
    });

    if (!this.profile.languagesArray || this.profile.languagesArray.length === 0) {
      this.errorMessages.languages = 'Please select at least one language';
    }

    return this.isFormValid();
  }

  // ✅ Banking field validation
  validateBankField(fieldName: string, value: string): void {
    const rule = this.bankValidationRules[fieldName as keyof typeof this.bankValidationRules];

    if (!rule) return;

    // Clear previous error
    this.bankErrorMessages[fieldName] = '';

    // Required field validation
    if (!value) {
      this.bankErrorMessages[fieldName] = 'This field is required';
      return;
    }

    // Pattern validation
    if (!rule.pattern.test(value)) {
      this.bankErrorMessages[fieldName] = rule.message;
      return;
    }

    // Additional specific validations
    switch (fieldName) {
      case 'acnumber':
        if (value.length < 9 || value.length > 18) {
          this.bankErrorMessages.acnumber = 'Account number must be 9-18 digits';
        }
        break;
      case 'ifsc':
        if (value.length !== 11) {
          this.bankErrorMessages.ifsc = 'IFSC code must be 11 characters';
        }
        break;
    }
  }

  // ✅ Email validation helper
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // ✅ Check if profile form is valid
  isFormValid(): boolean {
    const activeFields = ['fullname', 'email', 'contact', 'nationality', 'country', 'experience', 'profession', 'gender', 'description', 'languages', 'dob', 'isStudent'];

    // Check if any error messages exist FOR ACTIVE FIELDS
    const hasErrors = Object.keys(this.errorMessages).some(key =>
      activeFields.includes(key) && this.errorMessages[key] !== ''
    );

    // Check required fields are filled
    const requiredFields = ['fullname', 'email', 'contact', 'nationality', 'country', 'experience', 'profession', 'gender', 'isStudent'];
    const allRequiredFilled = requiredFields.every(field => {
      const value = this.profile[field as keyof typeof this.profile];
      return value && value.toString().trim() !== '';
    });

    // Ensure languagesArray has at least one entry
    const languagesFilled = Array.isArray(this.profile.languagesArray) && this.profile.languagesArray.length > 0;

    // Ensure bio/description meets minimum length requirement (20 chars)
    const bioValid = !!this.profile.description && this.profile.description.toString().trim().length >= 20;

    // Validate DOB - ensure dobValid is a boolean
    const dobValid = !!this.profile.dob && !this.errorMessages.dob;

    return !hasErrors && allRequiredFilled && languagesFilled && bioValid && dobValid;
  }

  // ✅ Check if banking form is valid
  isBankFormValid(): boolean {
    // Check if any bank error messages exist
    const hasErrors = Object.values(this.bankErrorMessages).some(error => error !== '');

    // Check required fields are filled
    const requiredFields = ['bankname', 'acholdername', 'acnumber', 'ifsc', 'branchname'];
    const allRequiredFilled = requiredFields.every(field => {
      const value = this.bankingInfo[field as keyof typeof this.bankingInfo];
      return value && value.toString().trim() !== '';
    });

    return !hasErrors && allRequiredFilled;
  }

  // ✅ Initialize Reactive Form
  initializePasswordForm() {
    this.changePasswordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
          ]
        ],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  // ✅ Password Match & Reuse Validator
  passwordsMatchValidator(form: FormGroup) {
    const currentPassword = form.get('currentPassword')?.value;
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    const errors: any = {};
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.mismatch = true;
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.sameAsCurrent = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  // ✅ Handle Change Password
  onChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.isChangingPassword = true;
    const body = {
      currpassword: this.changePasswordForm.value.currentPassword,
      updatedpassword: this.changePasswordForm.value.newPassword
    };

    this.service.put(`/users/changepassword/${this.flid}`, body).subscribe({
      next: (res: any) => {
        this.isChangingPassword = false;
        alert('✅ Password updated successfully!');
        this.changePasswordForm.reset();
        sessionStorage.clear();
        this.router.navigate(['/freelancerlogin']);
      },
      error: (err: any) => {
        this.isChangingPassword = false;
        const msg = err.error?.message || 'Failed to update password. Please verify your current password.';
        alert('❌ Error: ' + msg);
      }
    });
  }

  // ✅ DOB Validation
  validateDob() {
    const dobValue = new Date(this.profile.dob);
    const today = new Date();
    const minYear = today.getFullYear() - this.minAge;
    const minValidDob = new Date(minYear, today.getMonth(), today.getDate());

    this.errorMessages.dob = '';

    if (!this.profile.dob) {
      this.errorMessages.dob = 'Date of birth is required';
    } else if (dobValue > today) {
      this.errorMessages.dob = 'Date of birth cannot be in the future';
    } else if (dobValue > minValidDob) {
      this.errorMessages.dob = `You must be at least ${this.minAge} years old`;
    }
  }

  // ✅ Section Handling
  setActiveSection(section: 'profile' | 'password' | 'billing'): void {
    this.activeSection = section;
    if (section === 'password' && this.changePasswordForm) {
      this.changePasswordForm.reset();
    }
  }

  // ✅ Theme Handling
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    this.saveThemePreference();
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }

  private loadThemePreference(): void {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();
  }

  private saveThemePreference(): void {
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  // ✅ Profile Save
  saveProfile(): void {
    // (window as any).appLogger?.info('Saving profile:', this.profile);
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  // ✅ Banking Info Handling
  saveBankingInfo(): void {
    if (this.validateBankingInfo()) {
      localStorage.setItem('bankingInfo', JSON.stringify(this.bankingInfo));
      alert('Banking information saved successfully!');
    }
  }

  resetBankingForm(form: NgForm): void {
    if (confirm('Are you sure you want to reset the form?')) {
      form.resetForm();
      this.loadBankingInfo();
      // Clear bank error messages
      this.bankErrorMessages = {};
    }
  }

  private validateBankingInfo(): boolean {
    if (
      !this.bankingInfo.bankname ||
      !this.bankingInfo.acholdername ||
      !this.bankingInfo.ifsc ||
      !this.bankingInfo.branchname
    ) {
      alert('Please fill in all required fields');
      return false;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(this.bankingInfo.ifsc)) {
      alert('Please enter a valid IFSC code');
      return false;
    }

    const accountNumberRegex = /^[0-9]{9,18}$/;
    if (!accountNumberRegex.test(this.bankingInfo.acnumber)) {
      alert('Please enter a valid account number (9-18 digits)');
      return false;
    }

    return true;
  }

  private loadBankingInfo(): void {
    const savedInfo = localStorage.getItem('bankingInfo');
    if (savedInfo) {
      this.bankingInfo = JSON.parse(savedInfo);
    }
  }

  loadUserData(): void {
    this.profile = { ...this.profile }; // placeholder
  }

  loadDetails() {
    this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => {
      if (d.dob) d.dob = this.datepipe.transform(d.dob, 'yyyy-MM-dd');
      // Convert languages array from backend to languagesArray
      if (Array.isArray(d.languages)) {
        d.languagesArray = d.languages;
      } else if (typeof d.languages === 'string' && d.languages) {
        // Fallback: split comma-separated string
        d.languagesArray = d.languages
          .split(',')
          .map((lang: string) => lang.trim())
          .filter((lang: string) => lang.length > 0);
      } else {
        d.languagesArray = [];
      }
      // Robust mapping: merge with existing structure and sync profession/skillTitle
      this.profile = {
        ...this.profile,
        ...d,
        profession: d.skillTitle || '',
        // Convert boolean isStudent from backend to 'yes'/'no' string for radio cards
        isStudent: d.isStudent === true ? 'yes' : (d.isStudent === false ? 'no' : '')
      };
      this.usr = d;
      this.service.setFreelancerProfile(d);
    });

    this.service.get(`/fbank/getdata/${this.flid}`).subscribe((d: any) => {
      if (d) {
        // DB stores acnumber as Number, convert to string for UI masking
        const rawAc = d.acnumber ? d.acnumber.toString() : '';
        this.realAccountNumber = rawAc;

        this.bankingInfo = {
          bankname: d.bankname || '',
          acholdername: d.acholdername || '',
          acnumber: this.maskAccountNumber(rawAc),
          ifsc: d.ifsc || '',
          branchname: d.branchname || ''
        };
        this.enabled = false;
        this.isBank = false;
      } else {
        this.button = 'Add Details';
        this.isBank = false;
        this.enabled = true;
      }
    });
  }

  updateDetails() {
    // Validate all fields and surface any missing/invalid warnings on the screen
    const isValid = this.validateAllProfileFields();
    if (!isValid) {
      setTimeout(() => {
        const errorField = document.querySelector('.has-error, .error-msg-text');
        if (errorField) {
          errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    const body = {
      ...this.profile,
      skillTitle: this.profile.profession, // Map frontend profession back to backend skillTitle
      languages: this.profile.languagesArray, // Send languagesArray to backend
      isStudent: this.profile.isStudent === 'yes', // Convert 'yes'/'no' string to boolean for backend
      updatedby: this.flid
    };
    this.service.put(`/users/updatedata/${this.flid}`, body).subscribe({
      next: () => {
        window.alert("Your Details has been Updated successfully!")
        this.isEdit = false;
        this.saveDisabled = true;
        this.loadDetails();
        this.service.setFreelancerProfile(body); // Sync with navbar
        this.errorMessages = {};
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        (window as any).appLogger?.error('Update failed:', err);
        this.errorMessages = err.error.errors || {};
      }
    });
  }

  enableBank() {
    this.isBank = true;
    this.bankErrorMessages = {};
    // Entering edit mode - reveal the real number
    this.bankingInfo.acnumber = this.realAccountNumber || '';
  }

  cancelBankEdit() {
    this.isBank = false;
    this.bankErrorMessages = {};
    this.loadDetails(); // Revert banking changes
  }

  enable() {
    this.isEdit = true;
    this.errorMessages = {};
  }

  cancelEdit() {
    this.isEdit = false;
    this.errorMessages = {};
    this.loadDetails(); // Revert changes by reloading from backend
  }



  addBank() {
    const payload = {
      ...this.bankingInfo,
      fl_id: this.flid,
      createdby: this.flid
    };
    this.service.post('/fbank/postdata', payload).subscribe(() => {
      alert("✅ Bank details added successfully!");
      this.enabled = false;
      this.isBank = false;
      this.loadDetails();
      this.router.navigate(['/profile']);
    });
  }

  updateBank() {
    this.service.put(`/fbank/update/${this.flid}`, this.bankingInfo).subscribe(() => {
      alert("✅ Bank details updated successfully!");
      this.isBank = false;
      this.loadDetails();
      this.router.navigate(['/profile']);
    });
  }

  handleBankSubmit(): void {
    // Validate all bank fields before submission
    Object.keys(this.bankValidationRules).forEach(field => {
      const value = this.bankingInfo[field as keyof typeof this.bankingInfo];
      this.validateBankField(field, value?.toString() || '');
    });

    if (!this.isBankFormValid()) {
      alert('Please fix all validation errors before saving banking details.');
      return;
    }

    // Sync real account number before submission
    this.realAccountNumber = this.bankingInfo.acnumber;

    if (this.enabled) {
      this.addBank();
    } else {
      this.updateBank();
    }
  }

  // ✅ Mask account number (xxxx + last 4)
  maskAccountNumber(acc: string): string {
    if (!acc) return '';
    const visibleDigits = 4;
    const maskedSection = acc.length > visibleDigits ? acc.length - visibleDigits : 0;
    return 'x'.repeat(maskedSection) + acc.slice(-visibleDigits);
  }

  // ✅ Live Password Validation Helpers (Xerox from Login)
  hasMinLength(): boolean {
    const pwd = this.changePasswordForm.get('newPassword')?.value || '';
    return pwd.length >= 8;
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.changePasswordForm.get('newPassword')?.value || '');
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.changePasswordForm.get('newPassword')?.value || '');
  }

  hasNumber(): boolean {
    return /\d/.test(this.changePasswordForm.get('newPassword')?.value || '');
  }

  hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.changePasswordForm.get('newPassword')?.value || '');
  }

  // ✅ Sidebar Xerox Logic (from fdashboard)
  loadSkills() {
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
      },
      error: () => this.skillexist = [{ skills: [] }]
    });
  }

  getSkillsArray(): any[] {
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0].skills) {
      return this.skillexist[0].skills;
    }
    return [];
  }

  openSkillModal() {
    if (!this.isFreelancerProfileComplete()) return;
    this.showSkillModal = true;
    this.toggleBodyScroll();
  }

  getProfileCompletion(): number {
    const fields = [
      { key: 'fullname', weight: 8 },
      { key: 'email', weight: 8 },
      { key: 'contact', weight: 6 },
      { key: 'nationality', weight: 5 },
      { key: 'country', weight: 5 },
      { key: 'experience', weight: 8 },
      { key: 'skillTitle', weight: 8 },
      { key: 'description', weight: 8, minLength: 20 },
      { key: 'dob', weight: 5 },
      { key: 'gender', weight: 3 },
      { key: 'linkedin', weight: 5 },
      { key: 'certifications', weight: 5, isArray: true }
    ];

    let earned = 0;

    // Check standard fields
    fields.forEach(f => {
      let value = (this.profile as any)[f.key];
      if (f.key === 'skillTitle' && !value) value = this.profile.profession;
      if (!value) value = (this.usr as any)?.[f.key];

      if (value) {
        if (f.isArray) {
          if (Array.isArray(value) && value.length > 0) earned += f.weight;
        } else {
          const str = value.toString().trim();
          if (str !== '' && (!f.minLength || str.length >= f.minLength)) {
            earned += f.weight;
          }
        }
      }
    });

    // Check Languages (6%)
    if (this.profile.languagesArray && this.profile.languagesArray.length > 0) {
      earned += 6;
    }

    // Check Skills (10%)
    if (this.getSkillsArray().length > 0) {
      earned += 10;
    }

    // Check Banking Details (10%) - Check realAccountNumber as acnumber might be masked
    if (this.realAccountNumber && this.bankingInfo.bankname) {
      earned += 10;
    }

    return Math.min(100, Math.round(earned));
  }
  closeSkillModal() { this.showSkillModal = false; this.toggleBodyScroll(); }

  // --- Portfolio / External Projects Methods ---
  
  openExternalProjectModal() {
    this.newExternalProject = { domain: '', title: '', description: '', experience: '' };
    this.externalProjectErrorMessages = { domain: '', title: '', description: '', experience: '' };
    this.showExternalProjectModal = true;
    this.toggleBodyScroll();
  }

  closeExternalProjectModal() {
    this.showExternalProjectModal = false;
    this.showProjectExperienceDropdown = false;
    this.toggleBodyScroll();
  }

  toggleProjectExperienceDropdown() {
    this.showProjectExperienceDropdown = !this.showProjectExperienceDropdown;
  }

  selectProjectExperience(option: string) {
    this.newExternalProject.experience = option;
    this.showProjectExperienceDropdown = false;
    this.validateExternalProjectField('experience');
  }

  validateExternalProjectField(fieldName: string): void {
    if (fieldName === 'domain') {
      this.externalProjectErrorMessages.domain = '';
      const val = this.newExternalProject.domain ? this.newExternalProject.domain.trim() : '';
      if (!val) {
        this.externalProjectErrorMessages.domain = 'Project domain is required.';
      } else if (/\d/.test(this.newExternalProject.domain)) {
        this.externalProjectErrorMessages.domain = 'Numbers are not allowed in project domain.';
      }
      return;
    }

    if (fieldName === 'title') {
      this.externalProjectErrorMessages.title = '';
      const val = this.newExternalProject.title ? this.newExternalProject.title.trim() : '';
      if (!val) {
        this.externalProjectErrorMessages.title = 'Project title is required.';
      } else if (/\d/.test(this.newExternalProject.title)) {
        this.externalProjectErrorMessages.title = 'Numbers are not allowed in project title.';
      } else if (!/^[a-zA-Z\s]+$/.test(this.newExternalProject.title)) {
        this.externalProjectErrorMessages.title = 'Only alphabets and spaces are allowed.';
      }
      return;
    }

    if (fieldName === 'description') {
      this.externalProjectErrorMessages.description = '';
      return;
    }

    if (fieldName === 'experience') {
      this.externalProjectErrorMessages.experience = '';
      if (!this.newExternalProject.experience) {
        this.externalProjectErrorMessages.experience = 'Project experience is required.';
      }
      return;
    }
  }

  isExternalProjectValid(): boolean {
    const domainVal = this.newExternalProject.domain ? this.newExternalProject.domain.trim() : '';
    const isDomainValid = domainVal.length > 0 && !/\d/.test(this.newExternalProject.domain);

    const titleVal = this.newExternalProject.title ? this.newExternalProject.title.trim() : '';
    const isTitleValid = titleVal.length > 0 && !/\d/.test(this.newExternalProject.title) && /^[a-zA-Z\s]+$/.test(this.newExternalProject.title);

    const isExperienceValid = !!this.newExternalProject.experience;

    return isDomainValid && isTitleValid && isExperienceValid && !this.externalProjectErrorMessages.domain && !this.externalProjectErrorMessages.title && !this.externalProjectErrorMessages.experience;
  }

  addExternalProject() {
    this.validateExternalProjectField('domain');
    this.validateExternalProjectField('title');
    this.validateExternalProjectField('experience');

    if (this.isExternalProjectValid()) {
      if (!this.profile.external_projects) {
        this.profile.external_projects = {};
      }
      
      this.profile.external_projects[this.newExternalProject.domain.trim()] = {
        title: this.newExternalProject.title.trim(),
        description: this.newExternalProject.description ? this.newExternalProject.description.trim() : '',
        experience: this.newExternalProject.experience
      };

      // Ensure form marks dirty or triggers change
      this.closeExternalProjectModal();
    }
  }

  confirmDeleteExternalProject(domain: string) {
    this.projectToDelete = domain;
    this.showConfirmProjectModal = true;
    this.toggleBodyScroll();
  }

  cancelDeleteExternalProject() {
    this.showConfirmProjectModal = false;
    this.projectToDelete = null;
    this.toggleBodyScroll();
  }

  executeDeleteExternalProject() {
    if (this.projectToDelete && this.profile.external_projects) {
      delete this.profile.external_projects[this.projectToDelete];
    }
    this.cancelDeleteExternalProject();
  }

  // --- Skills API Functions ---
  isAddingSkill = false;
  skillSuccessMessage = '';

  setSkillLevel(level: string) {
    this.skilldetails.status = level;
    this.skillErrorMessage = '';
  }

  addNewSkill() {
    const rawSkill = (this.skilldetails.skill || '').trim();
    if (!rawSkill) {
      this.skillErrorMessage = 'Please enter a skill name.';
      return;
    }

    // Default to Intermediate if user hasn't selected a level
    const level = this.skilldetails.status || 'Intermediate';

    // Duplicate check
    const currentSkills = this.getSkillsArray();
    const isDuplicate = currentSkills.some((s: any) => {
      const name = (s.skill || s.name || s || '').toLowerCase().trim();
      return name === rawSkill.toLowerCase();
    });

    if (isDuplicate) {
      this.skillErrorMessage = `Skill "${rawSkill}" is already in your skills list.`;
      return;
    }

    this.skillErrorMessage = '';
    this.skillSuccessMessage = '';
    this.isAddingSkill = true;

    const body = {
      fl_id: this.flid,
      skill: rawSkill,
      status: level
    };

    this.service.post('/skills/createskill', body).subscribe({
      next: () => {
        this.isAddingSkill = false;
        this.loadSkills();
        this.closeSkillModal();
        this.skilldetails = { skill: '', status: '' };
        this.skillSuccessMessage = `"${rawSkill}" added to your skills successfully!`;
        setTimeout(() => { this.skillSuccessMessage = ''; }, 3500);
      },
      error: (err: any) => {
        this.isAddingSkill = false;
        const msg = err?.error?.message || 'Failed to add skill. Please try again.';
        this.skillErrorMessage = msg;
        setTimeout(() => { this.skillErrorMessage = ''; }, 3500);
      }
    });
  }

  confirmDeleteSkill(skill: any) {
    const id = skill._id || skill.id || skill.skill_id;
    if (id) {
      this.skillToDelete = id;
      this.showConfirmModal = true;
      this.toggleBodyScroll();
    }
  }

  deleteSkill(id: string) {
    this.service.delete(`/skills/deleteskill/${this.flid}/${id}`).subscribe({
      next: () => {
        this.loadSkills();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Delete skill failed:', err);
      }
    });
  }

  // --- Delete Skill Confirmation Modal ---
  showConfirmModal = false;
  skillErrorMessage: string = '';
  skillToDelete: string | null = null;

  cancelDelete() { this.showConfirmModal = false; this.skillToDelete = null; this.toggleBodyScroll(); }
  confirmDelete() {
    if (this.skillToDelete) {
      this.deleteSkill(this.skillToDelete);
      this.cancelDelete();
    }
  }

  cleanupOnNavigation() {
    this.cleanupScrollClasses();
  }

  // ── Profile Completeness Check ──
  isFreelancerProfileComplete(): boolean {
    if (!this.usr) return false;
    const requiredFields = [
      { key: 'fullname', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'contact', label: 'Contact Number' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'description', label: 'Bio' },
      { key: 'country', label: 'Country' },
      { key: 'gender', label: 'Gender' }
    ];
    const missing = requiredFields
      .filter(f => {
        const val = this.usr[f.key];
        if (!val || val.toString().trim() === '') return true;
        if (f.key === 'description' && val.toString().trim().length < 20) return true;
        return false;
      })
      .map(f => f.label);
    if (missing.length > 0) {
      this.profileMissingFields = missing;
      this.showProfilePopup = true;
      return false;
    }
    return true;
  }

  onProfilePopupNavigate(): void {
    this.showProfilePopup = false;
    this.router.navigate(['/home/settings']); // It's already here, but just closing it is enough really.
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Since we're already on settings, just scroll to top
  }

  onProfilePopupClose(): void {
    this.showProfilePopup = false;
  }

  ngOnDestroy(): void {
    this.cleanupScrollClasses();
  }

  toggleBodyScroll() {
    if (this.showSkillModal || this.showConfirmModal) {
      document.body.classList.add('modal-open');
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  }

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

    // Close Language Dropdown if clicked outside
    if (this.showLanguageDropdown && !target.closest('.language-container')) {
      this.showLanguageDropdown = false;
    }
  }

  cleanupScrollClasses() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
  }


}