import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { LayoutModule } from '@angular/cdk/layout';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Root Components
import { AppComponent } from './app.component';
import { NewHomeComponent } from './new-home/new-home.component';

// Interceptors
import { AuthInterceptor } from './auth/auth.interceptors';
import { LoaderInterceptor } from './interceptors/loader.interceptor';
import { GlobalErrorHandler } from './core/services/global-error.handler';

// Shared Module for core dependencies
import { SharedModule } from './shared/shared.module';
import { HeaderComponent } from './header/header.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { ClientOnboardingComponent } from './Client-home/client-onboarding/client-onboarding.component';

@NgModule({
  declarations: [
    AppComponent,
    NewHomeComponent,
    OnboardingComponent,
    ClientOnboardingComponent
  ],
  imports: [
    BrowserModule,
    LayoutModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    HeaderComponent
  ],
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
