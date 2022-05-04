import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from '../../../../services';

@Component({
  selector: 'badman-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss'],
})
export class UserInfoComponent {
  constructor(
    public auth: AuthService,
    public user: UserService,
    private route: ActivatedRoute
  ) {}

  login(): void {
    // Call this to redirect the user to the login page
    this.auth.loginWithPopup();
    // this.auth.loginWithRedirect({});
  }

  logout(): void {
    // Call this to log the user out of the application
    this.auth.logout({ returnTo: window.location.origin });
  }
}
