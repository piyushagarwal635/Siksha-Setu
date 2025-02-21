import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from '../login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MainComponent } from './dashboard/main/main.component';
import { StudentDashboardComponent } from './dashboard/student-dashboard/student-dashboard.component';
import { EducatorDashboardComponent } from './dashboard/educator-dashboard/educator-dashboard.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [ 
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent,
        children:[
            { path: '', redirectTo: 'main', pathMatch: 'full'} ,
            {path: 'main', component: MainComponent},
            {path: 'studentdashboard' , component: StudentDashboardComponent},
            { path: 'educatordashboard', component: EducatorDashboardComponent,},
            { path: 'admindashboard', component: AdminDashboardComponent},
        ]
    },
    { path: '**', redirectTo: '/login'},

];