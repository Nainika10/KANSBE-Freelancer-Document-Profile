import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-profile-complete-popup',
  templateUrl: './profile-complete-popup.component.html',
  styleUrls: ['./profile-complete-popup.component.css']
})
export class ProfileCompletePopupComponent {
  @Input() visible: boolean = false;
  @Input() userType: 'client' | 'freelancer' = 'freelancer';
  @Input() missingFields: string[] = [];
  @Input() actionBlocked: string = 'this action'; // e.g. "posting a project", "adding skills"

  @Output() closePopup = new EventEmitter<void>();
  @Output() navigateToSettings = new EventEmitter<void>();

  get title(): string {
    return 'Complete Your Profile';
  }

  get message(): string {
    if (this.userType === 'client') {
      return 'Please complete your profile details before posting a project. This helps freelancers understand who they\'ll be working with.';
    }
    return 'Please complete your profile details before adding skills. A complete profile helps clients find and trust you.';
  }

  get settingsLabel(): string {
    return this.userType === 'client' ? 'Go to Client Settings' : 'Go to Settings';
  }

  onNavigate(): void {
    this.navigateToSettings.emit();
  }

  onClose(): void {
    this.closePopup.emit();
  }
}
