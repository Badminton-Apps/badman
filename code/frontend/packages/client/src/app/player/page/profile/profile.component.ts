import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../_shared/services/auth/auth.service';
import { UserService } from './../../services/profile/user.service';

@Component({
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profile$;

  constructor(public auth: AuthService, public userService: UserService) {}

  ngOnInit(): void {
    this.profile$ = this.userService.profile$;
  }
}
