import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';

// Admin Components
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminClientsComponent } from './admin-clients/admin-clients.component';
import { AdminFreelancersComponent } from './admin-freelancers/admin-freelancers.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AdminProjectsComponent } from './admin-projects/admin-projects.component';
import { TotalProjectsComponent } from './total-projects/total-projects.component';
import { AdminLearningComponent } from './admin-learning/admin-learning.component';
import { AdminChangePasswordComponent } from './admin-change-password/admin-change-password.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    AdminClientsComponent,
    AdminFreelancersComponent,
    AdminSettingsComponent,
    AdminProjectsComponent,
    TotalProjectsComponent,
    AdminLearningComponent,
    AdminChangePasswordComponent
  ],
  imports: [
    SharedModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
