import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AuthRoutingModule } from './auth-routing.module';

// Auth Components
import { AdminLoginComponent } from '../admin/admin-login/admin-login.component';
import { ClLoginComponent } from '../Client-home/cl-login/cl-login.component';
import { ClSignupComponent } from '../Client-home/cl-signup/cl-signup.component';
import { FlLoginComponent } from '../Freelancer-home/fl-login/fl-login.component';
import { FlSignupComponent } from '../Freelancer-home/fl-signup/fl-signup.component';

@NgModule({
  declarations: [
    AdminLoginComponent,
    ClLoginComponent,
    ClSignupComponent,
    FlLoginComponent,
    FlSignupComponent
  ],
  imports: [
    SharedModule,
    AuthRoutingModule
  ]
})
export class AuthModule { }
