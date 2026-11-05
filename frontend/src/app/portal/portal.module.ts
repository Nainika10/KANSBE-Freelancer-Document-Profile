import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { PortalRoutingModule } from './portal-routing.module';

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

@NgModule({
  declarations: [
    SupportComponent,
    NavbarComponent,
    DashboardComponent,
    SettingsComponent,
    ProjectsComponent,
    ProjectDescriptionComponent,
    LearningPortalComponent,
    CourseListComponent,
    CourseDetailsComponent,
    LessonPlayerComponent,
    MessagesComponent,
    NotificationsComponent,
    ProfileComponent,
    ProjectPortalComponent,
    ClientProjectsComponent,
    ClientProjectsProjectdescriptionComponent,
    ClientProfileComponent,
    CdashboardComponent,
    CsettingsComponent,
    ClientPostProjectComponent,
    ClientNotificationsComponent,
    ClientMessagesComponent,
    FreelancersComponent,
    FreelancersListComponent,
    FreelancerClientViewComponent,
    FreelancerResumeViewComponent,
    BlogsComponent
  ],
  imports: [
    SharedModule,
    PortalRoutingModule
  ]
})
export class PortalModule { }
