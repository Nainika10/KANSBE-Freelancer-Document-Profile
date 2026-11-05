import { DatePipe } from '@angular/common';
import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ServiceService } from 'src/app/services/service.service';
import { c_id } from 'src/untility/const';

export interface UserProfile {
  avatar: string;
  preferredName: string;
  fullName: string;
  email: string;
  contactNumber: string;
  dateOfBirth: string;
  nationality: string;
  companyName: string;
  companyType: string;
  companyRegistration: string;
  companyWebsite: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyCountry: string;
  companyPostalCode: string;
  companyDescription: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
}
@Component({
  selector: 'app-csettings',
  templateUrl: './csettings.component.html',
  styleUrls: ['./csettings.component.css'],
  providers: [DatePipe]
})
export class CsettingsComponent implements OnInit {
  settingsForm: FormGroup;
  bankingForm: FormGroup;
  changePasswordForm: FormGroup;
  activeSection = 'profile';
  isDarkMode = false;
  isEdit = false;
  isBank = true;
  showSuccessPopup = false;
  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;
  data = true;
  enable = false;
  errorMessages: any = {};
  maxDob!: string;
  cid: any;
  button = 'Update Details';
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';

  profileDeatails = {
    fullname: '',
    username: '',
    email: '',
    country: '',
    contact: '',
    location: '',
    dob: '',
    nationality: '',
    gender: '',
    bio: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    companyname: '',
    companytype: '',
    companyregno: '',
    companywebsite: '',
    companyaddress: '',
    city: '',
    state: '',
    pincode: '',
    companydescrptn: '',
    role: '',
    currentpassword: '',
    changepassword: '',
    p_pic: ''
  };
  profileBackup: any;
  bankDetails: { bankname: string; acholdername: string; acnumber: string | null; ifsc: string; branchname: string } = {
    bankname: '',
    acholdername: '',
    acnumber: '',
    ifsc: '',
    branchname: ''
  }

  // --- Validation Rules ---
  private validationRules = {
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
    companytype: { pattern: /.+/, message: 'Company type is required' },
    companydescrptn: { pattern: /^[a-zA-Z][^<>]{19,249}$/, message: 'Description must start with a letter and be 20-250 characters' },
    linkedin: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?linkedin\.com\/.*$/, message: 'Invalid LinkedIn URL' },
    twitter: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?twitter\.com\/.*$|^(https?:\/\/)?([\w\w\.]+\.)?x\.com\/.*$/, message: 'Invalid Twitter/X URL' },
    instagram: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?instagram\.com\/.*$/, message: 'Invalid Instagram URL' },
    facebook: { pattern: /^(https?:\/\/)?([\w\w\.]+\.)?facebook\.com\/.*$|^(https?:\/\/)?([\w\w\.]+\.)?github\.com\/.*$/, message: 'Invalid Social URL' }
  };

  private bankValidationRules = {
    bankname: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    acholdername: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' },
    acnumber: { pattern: /^[0-9]{9,18}$/, message: 'Must be 9-18 digits only' },
    ifsc: { pattern: /^[A-Za-z0-9]{11}$/, message: 'IFSC code must be 11 characters' },
    branchname: { pattern: /^[a-zA-Z\s]+$/, message: 'Only letters and spaces are allowed' }
  };

  bankErrorMessages: any = {};

  // --- Dropdown Autocomplete States ---
  showGenderDropdown = false;
  allGenders = ['Male', 'Female', 'Other',];
  filteredGenders = [...this.allGenders];

  showNationalityDropdown = false;
  allNationalities = [
    'American', 'British', 'Canadian', 'Chinese', 'French', 'German', 'Indian', 'Italian', 'Japanese', 'Korean',
    'Mexican', 'Russian', 'Spanish', 'Australian', 'Brazilian', 'Egyptian', 'Greek', 'Indonesian', 'Nigerian',
    'Pakistani', 'Saudi Arabian', 'South African', 'Turkish', 'Vietnamese', 'Argentinian'
  ];
  filteredNationalities: string[] = [];

  showCountryDropdown = false;
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
  filteredCountries: string[] = [];

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
  selectedYear = this.currentDate.getFullYear();

  private profileSubject = new BehaviorSubject<UserProfile>({
    avatar: '', preferredName: '', fullName: '', email: '', contactNumber: '', dateOfBirth: '',
    nationality: '', companyName: '', companyType: '', companyRegistration: '', companyWebsite: '',
    companyAddress: '', companyCity: '', companyState: '', companyCountry: '', companyPostalCode: '',
    companyDescription: '', bankName: '', accountHolder: '', accountNumber: '', ifsc: '', branchName: ''
  });
  profile: UserProfile = this.profileSubject.value;
  isSaving = false;
  isChangingPassword = false;
  stats = { ongoing: 0, completed: 0, total: 0 };

  displayAccountNumber: string = '';
  private showRawOnFocus = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private service: ServiceService,
    private datepipe: DatePipe,
    private el: ElementRef
  ) {
    this.settingsForm = this.fb.group({
      preferredName: ['', Validators.required],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern('^[0-9-+()]*$')]],
      dateOfBirth: ['', Validators.required],
      nationality: ['', Validators.required]
    });
    this.bankingForm = this.fb.group({
      bankName: ['', Validators.required],
      accountHolder: ['', Validators.required],
      accountNumber: ['', Validators.required],
      ifsc: ['', Validators.required],
      branchName: ['', Validators.required]
    });
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: [
        '', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/)]
      ],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });

    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      this.profileSubject.next(JSON.parse(savedProfile));
    }
  }

  ngOnInit(): void {
    if (!sessionStorage.getItem('c_id')) {
      this.data = false;
      return;
    }
    this.cid = sessionStorage.getItem('c_id');

    // Handle initial section based on query parameters
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.activeSection = params['section'];
      }
    });

    this.loadDetails();
    this.initializeDatePicker();

    // Load global cover
    const savedCover = localStorage.getItem(`cover_${this.cid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }

    this.service.clientStats$.subscribe(s => {
      this.stats = s;
    });
  }

  loadDetails() {
    this.service.get(`/cregister/getdata/${this.cid}`).subscribe((d: any) => {
      if (d.dob) {
        d.dob = this.datepipe.transform(d.dob, 'yyyy-MM-dd');
      }
      this.profileDeatails = { ...this.profileDeatails, ...d };
      this.service.setClientProfile(d); // Update shared profile
      this.service.refreshClientStats(this.cid); // Refresh stats
    });

    this.service.get(`/bank/getdata/${this.cid}`).subscribe((d: any) => {
      if (d) {
        this.bankDetails = d;
        this.bankingForm.patchValue({
          bankName: d.bankname,
          accountHolder: d.acholdername,
          accountNumber: d.acnumber,
          ifsc: d.ifsc,
          branchName: d.branchname
        });
        this.bankingForm?.disable();
        this.isBank = false;
      } else {
        this.button = 'Add Details';
        this.isBank = true;
        this.enable = true;
        this.bankingForm?.enable();
      }
      const initial = this.bankDetails.acnumber || this.bankingForm?.get('accountNumber')?.value || '';
      this.setRawAccountNumber(initial, { updateControl: true, maskForDisplay: true });
    });

    if (this.bankingForm && this.bankingForm.get('accountNumber')) {
      this.bankingForm.get('accountNumber')!.valueChanges.subscribe(val => {
        const digits = String(val || '').replace(/\D/g, '');
        if (digits !== this.bankDetails.acnumber) {
          this.setRawAccountNumber(digits, { updateControl: false, maskForDisplay: true });
        }
      });
    }

    this.service.profileComplete$.subscribe(isComplete => {
      if (!isComplete) this.isEdit = true;
    });

    this.getProfile().subscribe(profile => {
      this.profile = profile;
      this.settingsForm.patchValue(profile);
    });

    const today = new Date();
    this.maxDob = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  // --- Dropdown Helpers ---
  onGenderInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    this.filteredGenders = this.allGenders.filter(g => g.toLowerCase().includes(val));
    this.showGenderDropdown = this.filteredGenders.length > 0;
  }
  selectGender(gender: string) {
    this.profileDeatails.gender = gender;
    this.showGenderDropdown = false;
    this.validateField('gender', gender);
  }
  onNationalityInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    this.filteredNationalities = val ? this.allNationalities.filter(n => n.toLowerCase().includes(val)).slice(0, 8) : [];
    this.showNationalityDropdown = this.filteredNationalities.length > 0;
  }
  selectNationality(nationality: string) {
    this.profileDeatails.nationality = nationality;
    this.showNationalityDropdown = false;
    this.validateField('nationality', nationality);
  }
  onCountryInput(event: any): void {
    const val = event.target.value.trim().toLowerCase();
    this.filteredCountries = val ? this.allCountries.filter(c => c.toLowerCase().includes(val)).slice(0, 8) : [];
    this.showCountryDropdown = this.filteredCountries.length > 0;
  }
  selectCountry(country: string) {
    this.profileDeatails.country = country;
    this.showCountryDropdown = false;
    this.validateField('country', country);
  }

  // --- Live Validation Methods ---
  validateField(fieldName: string, value: string): void {
    const rule = (this.validationRules as any)[fieldName];
    if (!rule) return;

    this.errorMessages[fieldName] = '';

    const optionalFields = ['username', 'linkedin', 'twitter', 'instagram', 'facebook', 'city', 'state', 'country', 'nationality', 'gender', 'pincode', 'companyaddress', 'companyname', 'companytype', 'companydescrptn'];
    if (!value && !optionalFields.includes(fieldName)) {
      this.errorMessages[fieldName] = 'This field is required';
      return;
    }

    if (value && !rule.pattern.test(value)) {
      this.errorMessages[fieldName] = rule.message;
      return;
    }

    // Specific logic additions
    if (fieldName === 'contact' && value && value.length !== 10) {
      this.errorMessages.contact = 'Contact number must be exactly 10 digits';
    }
    if (fieldName === 'bio' && value && value.length < 50) {
      this.errorMessages.bio = 'Bio must be at least 50 characters';
    }
    if (fieldName === 'dob') {
      this.validateDob();
    }
  }

  validateBankField(fieldName: string, value: string): void {
    const rule = (this.bankValidationRules as any)[fieldName];
    if (!rule) return;

    this.bankErrorMessages[fieldName] = '';

    if (!value) {
      this.bankErrorMessages[fieldName] = 'This field is required';
      return;
    }

    if (!rule.pattern.test(value)) {
      this.bankErrorMessages[fieldName] = rule.message;
      return;
    }
  }

  isFormValid(): boolean {
    const hasErrors = Object.values(this.errorMessages).some(error => error !== '');
    const required = ['fullname', 'email', 'contact', 'dob', 'bio'];
    const allFilled = required.every(f => {
      const val = (this.profileDeatails as any)[f];
      return val && val.toString().trim() !== '';
    });
    return !hasErrors && allFilled;
  }

  isBankFormValid(): boolean {
    const hasErrors = Object.values(this.bankErrorMessages).some(error => error !== '');
    const required = ['bankname', 'acholdername', 'acnumber', 'ifsc', 'branchname'];
    const allFilled = required.every(f => {
      const val = (this.bankDetails as any)[f];
      return val && val.toString().trim() !== '';
    });
    return !hasErrors && allFilled;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close components if clicking outside their specific containers
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

  // --- Datepicker Helpers ---
  initializeDatePicker(): void {
    this.years = [];
    const maxYear = new Date().getFullYear() - 18;
    for (let i = maxYear; i >= 1950; i--) this.years.push(i);

    // If no DOB is set, default the calendar view to the latest possible valid year
    if (!this.profileDeatails.dob) {
      this.selectedYear = maxYear;
    }

    this.generateCalendar();
  }
  generateCalendar(): void {
    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }
  toggleDatePicker(): void {
    if (this.isEdit) {
      if (!this.showDatePicker) {
        if (this.profileDeatails.dob) {
          const [y, m, d] = this.profileDeatails.dob.split('-').map(Number);
          if (!isNaN(y) && !isNaN(m)) {
            this.selectedYear = Number(y);
            this.selectedMonth = Number(m) - 1;
          }
        } else {
          // Default to latest valid year for new users
          this.selectedYear = new Date().getFullYear() - 18;
        }
        this.generateCalendar();
      }
      this.showDatePicker = !this.showDatePicker;
    }
  }
  selectDate(day: number): void {
    if (!this.isDateSelectable(day)) return;
    this.profileDeatails.dob = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    this.showDatePicker = false;
    this.validateField('dob', this.profileDeatails.dob);
  }
  changeMonth(month: any): void {
    this.selectedMonth = Number(month);
    this.generateCalendar();
  }
  changeYear(event: any): void {
    this.selectedYear = Number(event.target.value);
    this.generateCalendar();
  }
  isDateActive(day: number): boolean {
    const fullDate = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.profileDeatails.dob === fullDate;
  }
  isDateSelectable(day: number): boolean {
    const today = new Date();
    const minValidDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const selectedDate = new Date(this.selectedYear, this.selectedMonth, day);
    return selectedDate <= minValidDob;
  }

  // --- Form Actions ---
  updateDetails() {
    if (!this.isFormValid()) {
      window.alert("Please fix validation errors before saving.");
      return;
    }

    const body = {
      ...this.profileDeatails,
      dob: this.datepipe.transform(this.profileDeatails.dob, 'yyyy-MM-dd'),
      profile: true,
      updatedby: this.cid
    };
    this.service.put(`/cregister/update/${this.cid}`, body).subscribe({
      next: () => {
        window.alert("Profile updated Successfully!!");
        this.loadDetails();
        this.service.setClientProfile(body); // Push update to shared service
        this.service.setProfileComplete(true); // Enable post project button globally
        this.service.refreshClientStats(this.cid); // Refresh shared stats
        this.errorMessages = {};
        this.isEdit = false;
      },
      error: (err) => {
        (window as any).appLogger?.error("Update error:", err);
        if (err.error?.error) {
          this.errorMessages = err.error.error;
        } else if (err.error?.message) {
          window.alert(err.error.message);
        } else {
          window.alert("An error occurred while updating your profile.");
        }
      }
    });
  }
  updateBankdetails() {
    if (!this.isBankFormValid()) {
      window.alert("Please fix validation errors in banking details.");
      return;
    }
    const body = { ...this.bankDetails, updatedby: this.cid };
    this.service.put(`/bank/update/${this.cid}`, body).subscribe(() => {
      window.alert("Banking details updated successfully!");
      this.loadDetails();
      this.bankingForm.disable();
      this.isBank = false;
    });
  }
  enabledit() {
    if (this.isEdit) {
      this.validateDob();
      if (!this.isFormValid()) {
        window.alert('Please fix all validation errors before closing edit mode.');
        return;
      }
      this.isEdit = false;
    } else {
      this.profileBackup = JSON.parse(JSON.stringify(this.profileDeatails));
      this.isEdit = true;
    }
  }
  cancelEdit() { if (this.profileBackup) this.profileDeatails = JSON.parse(JSON.stringify(this.profileBackup)); this.isEdit = false; }
  enablebank() {
    if (this.isBank) {
      if (!this.isBankFormValid()) {
        window.alert('Please fill in all required bank details correctly before closing edit mode.');
        return;
      }
      this.isBank = false; this.bankingForm.disable();
    } else { this.isBank = true; this.bankingForm.enable(); }
  }
  enableBank() { this.enablebank(); }
  cancelBankEdit() { this.isBank = false; this.bankingForm.disable(); }
  handleBankSubmit() {
    if (!this.enable) {
      this.updateBankdetails();
    } else {
      this.addBank();
    }
  }

  getProfile(): Observable<UserProfile> { return this.profileSubject.asObservable(); }
  updateProfile(profile: UserProfile): void { this.profileSubject.next(profile); localStorage.setItem('userProfile', JSON.stringify(profile)); }
  onNavItemClick(section: string): void { this.activeSection = section; }
  addBank() {
    if (!this.isBankFormValid()) {
      window.alert("Please fix validation errors in banking details.");
      return;
    }
    const body = { c_id: this.cid, ...this.bankDetails, createdby: this.cid };
    this.service.post("/bank/postdata", body).subscribe(() => {
      window.alert("Banking details added successfully!");
      this.loadDetails();
      this.button = 'Update Details';
      this.isBank = false;
      this.enable = false;
    });
  }
  showFieldError(control: any, field: string) {
    if (control.invalid && control.touched) {
      if (control.errors?.['required']) this.errorMessages[field] = `${field} is required`;
      else if (control.errors?.['email']) this.errorMessages[field] = `Invalid email format`;
      else if (control.errors?.['minlength']) this.errorMessages[field] = `Minimum ${control.errors['minlength'].requiredLength} characters required`;
      else if (control.errors?.['pattern']) this.errorMessages[field] = `Invalid format`;
    } else { this.errorMessages[field] = ''; }
  }
  validateDob() {
    this.errorMessages.dob = '';
    if (!this.profileDeatails.dob) { this.errorMessages.dob = 'Date of birth is required'; return; }
    const [y, m, d] = this.profileDeatails.dob.split('-').map(Number);
    const dobValue = new Date(y, m - 1, d);
    const today = new Date();
    const minValidDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    if (dobValue > today) this.errorMessages.dob = 'Date of birth cannot be in the future';
    else if (dobValue > minValidDob) this.errorMessages.dob = 'You must be at least 18 years old';
  }
  passwordsMatchValidator(form: FormGroup) {
    const n = form.get('newPassword')?.value; const c = form.get('confirmPassword')?.value;
    return n === c ? null : { passwordsMismatch: true };
  }
  onChangePassword() {
    if (this.changePasswordForm.invalid) return;

    const body = { currpassword: this.profileDeatails.currentpassword, updatedpassword: this.profileDeatails.changepassword };
    this.isChangingPassword = true;

    this.service.put(`/cregister/changepassword/${this.cid}`, body).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.changePasswordForm.reset();
        sessionStorage.clear();
        window.alert('Password changed successfully!');
        this.router.navigate(["/clientlogin"]);
      },
      error: (err) => {
        this.isChangingPassword = false;
        if (err.error?.message) {
          window.alert(err.error.message);
        } else {
          window.alert("An error occurred while changing your password.");
        }
      }
    });
  }
  getProfileCompletion(): number {
    let score = 0;
    const requiredFields = ['fullname', 'email', 'contact', 'dob', 'bio'];
    let completedRequiredCount = 0;

    requiredFields.forEach(field => {
      const value = (this.profileDeatails as any)[field];
      if (value && value.toString().trim() !== '') {
        completedRequiredCount++;
      }
    });

    // 70% for required profile fields (14% each)
    score += (completedRequiredCount / requiredFields.length) * 70;

    // 15% for company details
    if (this.profileDeatails.companyname && this.profileDeatails.companytype) {
      score += 15;
    }

    // 15% for banking details
    if (!this.enable) {
      score += 15;
    }

    return Math.round(score);
  }
  setActiveSection(section: string): void { this.activeSection = section; }

  // Account Number Masking
  onAccountNumberInput(event: Event) {
    const val = (event.target as HTMLInputElement).value || '';
    this.setRawAccountNumber(val.replace(/\D/g, ''), { updateControl: true, maskForDisplay: !this.showRawOnFocus });
  }
  revealAccountNumber() { this.showRawOnFocus = true; this.displayAccountNumber = this.formatInGroups(this.bankDetails.acnumber ?? ''); }
  maskDisplayedAccountNumber() { this.showRawOnFocus = false; this.displayAccountNumber = this.maskAccountNumber(this.bankDetails.acnumber ?? ''); }
  private setRawAccountNumber(digits: string, opts: { updateControl?: boolean; maskForDisplay?: boolean } = {}) {
    this.bankDetails.acnumber = digits;
    if (opts.updateControl && this.bankingForm?.get('accountNumber')) this.bankingForm.get('accountNumber')!.setValue(digits, { emitEvent: true });
    this.validateBankField('acnumber', digits);
    const mask = opts.maskForDisplay ?? true;
    this.displayAccountNumber = mask && !this.showRawOnFocus ? this.maskAccountNumber(digits) : this.formatInGroups(digits);
  }

  // --- Password Strength Helpers ---
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
  private maskAccountNumber(value: string): string {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    const v = cleaned.slice(-4);
    const l = this.formatInGroups(cleaned.slice(0, -4).replace(/\d/g, 'X'));
    return (l + (l ? ' ' : '') + this.formatInGroups(v)).trim();
  }
  private formatInGroups(input: string): string { return input ? input.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim() : ''; }

  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) event.preventDefault();
  }
  onCancel(): void { this.router.navigate(['/dashboard']); }
  onBankingReset(): void { this.bankingForm.reset(); }
}
