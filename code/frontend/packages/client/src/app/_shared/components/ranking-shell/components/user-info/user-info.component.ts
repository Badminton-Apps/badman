import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from 'app/_shared';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss'],
})
export class UserInfoComponent implements OnInit {
  constructor(public auth: AuthService, public user: UserService, private route: ActivatedRoute) {}

  ngOnInit(): void {}

  login(): void {
    console.log(this.route.url);

    // Call this to redirect the user to the login page
    this.auth.loginWithPopup();
    // this.auth.loginWithRedirect({});
  }

  logout(): void {
    // Call this to log the user out of the application
    this.auth.logout({ returnTo: window.location.origin });
  }
}
