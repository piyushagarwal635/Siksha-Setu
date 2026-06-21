import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MainComponent } from './dashboard/main/main.component';
import { StudentDashboardComponent } from './dashboard/student-dashboard/student-dashboard.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard/admin-dashboard.component';
import { FormComponent } from './dashboard/form/form.component';
import { CoursesComponent } from './dashboard/courses/courses.component';
import { AboutComponent } from './dashboard/about/about.component';
import { ContactComponent } from './dashboard/contact/contact.component';
import { CourseDashboardComponent } from './dashboard/course-dashboard/course-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [ 
    { path: '', redirectTo: '/dashboard/main', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'secure-test/:courseId',
      loadComponent: () => import('./dashboard/secure-test-environment/secure-test-environment.component').then(m => m.SecureTestEnvironmentComponent),
      canActivate: [AuthGuard, RoleGuard],
      data: { role: 'STUDENT' }
    },
    { 
      path: 'dashboard', 
      component: DashboardComponent,
      children:[
          { path: '', redirectTo: 'main', pathMatch: 'full'} ,
          { path: 'main', component: MainComponent },
          { path: 'courses', component: CoursesComponent },
          { path: 'about', component: AboutComponent },
          { path: 'contact', component: ContactComponent },
          { path: 'studentdashboard',
            component: StudentDashboardComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { role: 'STUDENT' }
          },
          { path: 'studentdashboard/course/:id',
            component: CourseDashboardComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { role: 'STUDENT' }
          },
          { path: 'studentdashboard/course/:id/braille/:resourceId',
            loadComponent: () => import('./dashboard/braille-dashboard/braille-dashboard.component').then(m => m.BrailleDashboardComponent),
            canActivate: [AuthGuard, RoleGuard],
            data: { role: 'STUDENT' }
          },
          { path: 'braille-testing',
            loadComponent: () => import('./dashboard/braille-testing/braille-testing.component').then(m => m.BrailleTestingComponent),
            canActivate: [AuthGuard]
          },
          { path: 'streak', loadComponent: () => import('./dashboard/streak-dashboard/streak-dashboard.component').then(m => m.StreakDashboardComponent) },
          {
            path: 'admindashboard',
            component: AdminDashboardComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { role: 'ADMIN' }
          },
          { path: 'profile', component: FormComponent, canActivate: [AuthGuard] }
      ]
    },
    { path: '**', redirectTo: '/dashboard/main' }
];
