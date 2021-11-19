import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Player, UserService } from 'app/_shared';
import { Observable } from 'rxjs';

@Component({
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  profile$!: Observable<{ player: Player; request: any } | { player: null; request: null } | null>;

  constructor(public auth: AuthService, public userService: UserService) {}

  ngOnInit(): void {
    this.profile$ = this.userService.profile$;
  }
}
