import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewHomeComponent } from './new-home/new-home.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { ClientOnboardingComponent } from './Client-home/client-onboarding/client-onboarding.component';


const routes: Routes = [
  { path: "", component: NewHomeComponent, pathMatch: "full" },
  { path: "onboarding", component: OnboardingComponent },
  { path: "client-onboarding", component: ClientOnboardingComponent },
  { path: "best-web-developers-india", loadComponent: () => import('./Blogs/web-developers/web-developers.component').then(m => m.WebDevelopersComponent) },
  { path: "seo-experts-india", loadComponent: () => import('./Blogs/seo/seo.component').then(m => m.SeoComponent) },
  { path: "best-designers-india", loadComponent: () => import('./Blogs/designing/designing.component').then(m => m.DesigningComponent) },
  { path: "best-video-editors-india", loadComponent: () => import('./Blogs/video-editors/video-editors.component').then(m => m.VideoEditorsComponent) },
  { path: "content-creators-india", loadComponent: () => import('./Blogs/contentcreators/contentcreators.component').then(m => m.ContentcreatorsComponent) },
  { path: "best-photographers-india", loadComponent: () => import('./Blogs/photography/photography.component').then(m => m.PhotographyComponent) },
  { path: "blogs", loadComponent: () => import('./Blogs/blogs-mainpage/blogs-mainpage.component').then(m => m.BlogsMainpageComponent) },

  // Global pages blogs routing
  { path: "best-web-developers-global", loadComponent: () => import('./Blogs/web-developers/web-developers.component').then(m => m.WebDevelopersComponent) },
  { path: "best-photographers-global", loadComponent: () => import('./Blogs/photography/photography.component').then(m => m.PhotographyComponent) },
  { path: "best-video-editors-global", loadComponent: () => import('./Blogs/video-editors/video-editors.component').then(m => m.VideoEditorsComponent) },
  { path: "content-creators-global", loadComponent: () => import('./Blogs/contentcreators/contentcreators.component').then(m => m.ContentcreatorsComponent) },
  { path: "best-designers-global", loadComponent: () => import('./Blogs/designing/designing.component').then(m => m.DesigningComponent) },
  { path: "seo-experts-global", loadComponent: () => import('./Blogs/seo/seo.component').then(m => m.SeoComponent) },
  // Lazy-loaded SEO Location Pages
  { path: "hire-freelancers-in-hyderabad", loadComponent: () => import('./location-page/location-page.component').then(m => m.LocationPageComponent), data: { city: 'hyderabad' } },
  { path: "hire-freelancers-in-bengaluru", loadComponent: () => import('./location-page/location-page.component').then(m => m.LocationPageComponent), data: { city: 'bengaluru' } },
  { path: "hire-freelancers-in-mumbai", loadComponent: () => import('./location-page/location-page.component').then(m => m.LocationPageComponent), data: { city: 'mumbai' } },
  { path: "hire-freelancers-in-chennai", loadComponent: () => import('./location-page/location-page.component').then(m => m.LocationPageComponent), data: { city: 'chennai' } },
  { path: "hire-freelancers-in-pune", loadComponent: () => import('./location-page/location-page.component').then(m => m.LocationPageComponent), data: { city: 'pune' } },

  // Lazy-loaded secondary pages
  { path: "about-kansbe", loadComponent: () => import('./about-kansbe/about-kansbe.component').then(m => m.AboutKansbeComponent) },
  { path: "how-kansbe-works", loadComponent: () => import('./how-kansbe-works/how-kansbe-works.component').then(m => m.HowKansbeWorksComponent) },
  { path: "why-kansbe-freelancers", loadComponent: () => import('./why-kansbe-freelancers/why-kansbe-freelancers.component').then(m => m.WhyKansbeFreelancersComponent) },
  { path: "sub-domain/:sub", loadComponent: () => import('./sub-domain/sub-domain.component').then(m => m.SubDomainComponent) },
  { path: "blog/:domain", loadComponent: () => import('./blog/blog.component').then(m => m.BlogComponent) },


  // Lazy Loaded Feature Modules mapped to root
  { path: '', loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) },
  { path: '', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  { path: '', loadChildren: () => import('./portal/portal.module').then(m => m.PortalModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking',
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
