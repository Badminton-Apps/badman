import { Component, OnInit } from '@angular/core';
import { Player, UserService } from 'app/_shared';
import { Observable } from 'rxjs';
import { AuthService } from '../../../_shared/services/security/auth.service';

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
