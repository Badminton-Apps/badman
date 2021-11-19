import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from 'app/_shared';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss'],
})
export class UserInfoComponent implements OnInit {
  constructor(public auth: AuthService, public user: UserService) {}

  ngOnInit(): void {}

  loginWithRedirect(): void {
    // Call this to redirect the user to the login page
    this.auth.loginWithRedirect();
  }

  logout(): void {
    // Call this to log the user out of the application
    this.auth.logout({ returnTo: window.location.origin });
  }
}
