import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet,RouterLink,MatExpansionModule,CommonModule,RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  showChatbot: boolean = false;

  toggleChatbot() {
    this.showChatbot = !this.showChatbot;
  }

  menuOpen = false;
  userName = '';
  disabilityId = '';
  defaultAvatar = 'avtar.jpeg';
  profileImage: string | null = null;
  
  ngOnInit() {
    const usersData = JSON.parse(localStorage.getItem('usersData') || '[]');
    const loggedInUser = usersData.find((user: any) => user.username === localStorage.getItem('loggedInUser'));
    
    if (loggedInUser) {
      this.userName = loggedInUser.username;
      this.disabilityId = loggedInUser.disabilityId;
      this.profileImage = loggedInUser.profileImage || this.defaultAvatar;
    }
  }
  
  constructor(private router: Router) {}
  
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImage = reader.result as string;
        this.updateUserData({ profileImage: this.profileImage });
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
  
  removeProfileImage() {
    this.profileImage = this.defaultAvatar;
    this.updateUserData({ profileImage: this.defaultAvatar });
  }
  
  updateUserData(updatedData: any) {
    const usersData = JSON.parse(localStorage.getItem('usersData') || '[]');
    const loggedInUserIndex = usersData.findIndex((user: any) => user.username === this.userName);
    
    if (loggedInUserIndex !== -1) {
      usersData[loggedInUserIndex] = { ...usersData[loggedInUserIndex], ...updatedData };
      localStorage.setItem('usersData', JSON.stringify(usersData));
    }
  }
  
  logout() {
    alert('Logged out successfully!');
    localStorage.removeItem('loggedInUser');
    this.router.navigate(['/login']);
  }
  
  @HostListener('document:click', ['$event'])
  closeMenu(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.position-relative')) {
      this.menuOpen = false;
    }
  }
  }

