import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Admin Components
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminClientsComponent } from './admin-clients/admin-clients.component';
import { AdminFreelancersComponent } from './admin-freelancers/admin-freelancers.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AdminProjectsComponent } from './admin-projects/admin-projects.component';
import { TotalProjectsComponent } from './total-projects/total-projects.component';
import { AdminLearningComponent } from './admin-learning/admin-learning.component';
import { AdminChangePasswordComponent } from './admin-change-password/admin-change-password.component';
import { roleGuard } from '../guards/role.guard';

const routes: Routes = [
  {
    path: "alpha", component: AdminDashboardComponent, canActivate: [roleGuard], data: { expectedRole: ['manager', 'admin'] }
  },
  {
    path: "alpha-clients", component: AdminClientsComponent, canActivate: [roleGuard], data: { expectedRole: ['manager', 'admin'] }
  },
  {
    path: "alpha-freelancers", component: AdminFreelancersComponent, canActivate: [roleGuard], data: { expectedRole: ['manager', 'admin'] }
  },
  {
    path: "alpha-settings", component: AdminSettingsComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' }
  },
  {
    path: "alpha-projects", component: AdminProjectsComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' }
  },
  {
    path: "alpha-totalprojects", component: TotalProjectsComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' }
  },
  {
    path: "alpha-learning", component: AdminLearningComponent, canActivate: [roleGuard], data: { expectedRole: ['manager', 'admin'] }
  },
  {
    path: "alpha-password", component: AdminChangePasswordComponent, canActivate: [roleGuard], data: { expectedRole: ['manager', 'admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
