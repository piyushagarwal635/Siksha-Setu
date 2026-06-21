import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router
} from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const expectedRole = route.data['role'];

    const currentUser =
      this.userService.getCurrentUser();

    if (
      currentUser &&
      currentUser.role === expectedRole
    ) {
      return true;
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}