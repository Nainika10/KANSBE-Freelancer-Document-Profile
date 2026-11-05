import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Auth Components
import { AdminLoginComponent } from '../admin/admin-login/admin-login.component';
import { ErrorMessageComponent } from '../error-message/error-message.component';
import { FlLoginComponent } from '../Freelancer-home/fl-login/fl-login.component';
import { FlSignupComponent } from '../Freelancer-home/fl-signup/fl-signup.component';
import { ClLoginComponent } from '../Client-home/cl-login/cl-login.component';
import { ClSignupComponent } from '../Client-home/cl-signup/cl-signup.component';

const routes: Routes = [
  { path: "freelancerlogin", component: FlLoginComponent },
  { path: "freelancersignup", component: FlSignupComponent },
  { path: "clientlogin", component: ClLoginComponent },
  { path: "clientsignup", component: ClSignupComponent },
  { path: "alphalogin", component: AdminLoginComponent },
  { path: "error-page", component: ErrorMessageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
