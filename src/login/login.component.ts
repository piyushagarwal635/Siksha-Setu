import { Component, OnInit,HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [FormsModule,CommonModule],
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  user = '';
  pass = '';
  disabilityId = '';
  isSignUpActive = false;

  constructor(private rl: Router) {
    this.checkScreenSize();
  }

  ngOnInit(): void {}

  togglePanel(isSignUp: boolean): void {
    this.isSignUpActive = isSignUp;
  }

  onsubmit(): void {
    const disabilityIdPattern = /^DIS\d{9}$/;

    if (!this.user || !this.pass || !this.disabilityId) {
      alert('Please fill all the fields.');
      return;
    }

    if (this.user.length < 5) {
      alert('Username must be at least 5 characters long.');
      return;
    }

    if (this.pass.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(this.pass)) {
      alert('Password must be at least 8 characters long and contain a special character.');
      return;
    }

    if (!disabilityIdPattern.test(this.disabilityId)) {
      alert("Invalid Disability ID. It must start with 'DIS' followed by 9 digits.");
      return;
    }

    // Check if localStorage is available (Fixes the "localStorage is not defined" error)
    if (typeof localStorage !== 'undefined') {
      const usersData = JSON.parse(localStorage.getItem('usersData') || '[]');

      // Check if the user already exists
      const existingUser = usersData.find((user: any) => user.disabilityId === this.disabilityId);

      if (existingUser) {
        alert('You already have an account. Please sign in.');
        this.rl.navigate(['/signin']);
      } else {
        // Save new user data
        const newUser = {
          username: this.user,
          password: this.pass,
          disabilityId: this.disabilityId,
          profileImage: 'avtar.jpeg',
        };

        usersData.push(newUser);
        localStorage.setItem('usersData', JSON.stringify(usersData));
        localStorage.setItem('loggedInUser', this.user);
        alert('Registration successful!');
        this.rl.navigate(['/dashboard']);
      }
    } else {
      alert('Local storage is not available.');
    }
  }

  onreset(): void {
    this.user = '';
    this.pass = '';
    this.disabilityId = '';
    this.isSignUpActive = false;
  }
  showWarning: boolean = false;
  @HostListener('window:resize', [])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    if (window.innerWidth < 768) {
      this.showWarning = true;
    } else {
      this.showWarning = false;
    }
  }
}
