import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Portal Components
import { SupportComponent } from '../Freelancer-home/support/support.component';
import { NavbarComponent } from '../Freelancer-home/navbar/navbar.component';
import { DashboardComponent } from '../Freelancer-home/dashboard/dashboard.component';
import { SettingsComponent } from '../Freelancer-home/settings/settings.component';
import { ProjectsComponent } from '../Freelancer-home/projects/projects.component';
import { ProjectDescriptionComponent } from '../Freelancer-home/project-description/project-description.component';
import { LearningPortalComponent } from '../Freelancer-home/learning-portal/learning-portal.component';
import { CourseListComponent } from '../Freelancer-home/course-list/course-list.component';
import { CourseDetailsComponent } from '../Freelancer-home/course-details/course-details.component';
import { LessonPlayerComponent } from '../Freelancer-home/lesson-player/lesson-player.component';
import { MessagesComponent } from '../Freelancer-home/messages/messages.component';
import { NotificationsComponent } from '../Freelancer-home/notifications/notifications.component';
import { ProfileComponent } from '../Freelancer-home/profile/profile.component';
import { ProjectPortalComponent } from '../Freelancer-home/project-portal/project-portal.component';
import { ClientProjectsComponent } from '../Client-home/client-projects/client-projects.component';
import { ClientProjectsProjectdescriptionComponent } from '../Client-home/client-projects-projectdescription/client-projects-projectdescription.component';
import { ClientProfileComponent } from '../Client-home/client-profile/client-profile.component';
import { CdashboardComponent } from '../Client-home/cdashboard/cdashboard.component';
import { CsettingsComponent } from '../Client-home/csettings/csettings.component';
import { ClientPostProjectComponent } from '../Client-home/client-post-project/client-post-project.component';
import { ClientNotificationsComponent } from '../Client-home/client-notifications/client-notifications.component';
import { ClientMessagesComponent } from '../Client-home/client-messages/client-messages.component';
import { FreelancersComponent } from '../Client-home/freelancers/freelancers.component';
import { FreelancersListComponent } from '../Client-home/freelancers-list/freelancers-list.component';
import { FreelancerClientViewComponent } from '../Client-home/freelancer-client-view/freelancer-client-view.component';
import { FreelancerResumeViewComponent } from '../Client-home/freelancer-resume-view/freelancer-resume-view.component';
import { BlogsComponent } from '../Freelancer-home/blogs/blogs.component';
import { roleGuard } from '../guards/role.guard';

const routes: Routes = [
  {
    path: "home", component: NavbarComponent, children: [
      { path: "freelancer-dash", component: DashboardComponent },
      { path: "settings", component: SettingsComponent },
      { path: "projects", component: ProjectsComponent },
      { path: "projects-description", component: ProjectDescriptionComponent },
      { path: "learning", component: LearningPortalComponent },
      { path: "learning/courses", component: CourseListComponent },
      { path: "learning/course/:id", component: CourseDetailsComponent },
      { path: "learning/course/:courseId/lesson/:lessonId", component: LessonPlayerComponent },
      { path: "messages", component: MessagesComponent },
      { path: "notifications", component: NotificationsComponent },
      { path: "profile", component: ProfileComponent },
      { path: "project/:p_id", component: ProjectPortalComponent },
      { path: "project-portal", component: ProjectPortalComponent },
      { path: "client-dash", component: CdashboardComponent },
      { path: "client-projects", component: ClientProjectsComponent },
      { path: "client-projects-description", component: ClientProjectsProjectdescriptionComponent },
      { path: "client-profile", component: ClientProfileComponent },
      { path: "client-settings", component: CsettingsComponent },
      { path: "post-project", component: ClientPostProjectComponent },
      { path: "client-notifications", component: ClientNotificationsComponent },
      { path: "client-messages", component: ClientMessagesComponent },
      { path: "freelancers/:projectId", component: FreelancersComponent },
      { path: "freelancer-list/:projectId", component: FreelancersListComponent },
      { path: "freelancer-list/:projectId/resume/:freelancerId", component: FreelancerResumeViewComponent },
      { path: "freelancer-client-view/:fl_id", component: FreelancerClientViewComponent },
      { path: "support", component: SupportComponent },
      { path: "blogs/:id", component: BlogsComponent }
    ]
  },
  {
    path: "manager/project/:p_id",
    component: ProjectPortalComponent,
    canActivate: [roleGuard],
    data: { expectedRole: ['manager', 'admin'] }
  },
  {
    path: "manager/project-portal",
    component: ProjectPortalComponent,
    canActivate: [roleGuard],
    data: { expectedRole: ['manager', 'admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortalRoutingModule { }
