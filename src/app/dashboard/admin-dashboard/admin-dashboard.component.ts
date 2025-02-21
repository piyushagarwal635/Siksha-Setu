import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {

  viewUsers() {
    alert('Navigating to user management...');
  }

  addUser() {
    alert('Adding a new user...');
  }

  generateReport() {
    alert('Generating report...');
  }
}
