import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ErrorMessageComponent } from '../error-message/error-message.component';
import { LoaderComponent } from '../loader/loader.component';
import { GuidancetourComponent } from '../guidancetour/guidancetour.component';
import { ToastComponent } from './toast/toast.component';
import { ProfileCompletePopupComponent } from './profile-complete-popup/profile-complete-popup.component';

const materialModules = [
  MatCardModule,
  MatSelectModule,
  MatInputModule,
  MatFormFieldModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatIconModule,
  MatButtonModule,
  MatRadioModule,
  MatSidenavModule,
  MatToolbarModule,
  MatTabsModule,
  MatSlideToggleModule,
  MatExpansionModule,
  MatDialogModule,
  MatCheckboxModule,
  MatProgressBarModule
];

@NgModule({
  declarations: [
    ErrorMessageComponent,
    LoaderComponent,
    GuidancetourComponent,
    ToastComponent,
    ProfileCompletePopupComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ...materialModules
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ErrorMessageComponent,
    LoaderComponent,
    GuidancetourComponent,
    ToastComponent,
    ProfileCompletePopupComponent,
    ...materialModules
  ]
})
export class SharedModule { }
