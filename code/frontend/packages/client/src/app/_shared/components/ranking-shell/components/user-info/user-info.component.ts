import { Component, OnInit } from '@angular/core';
import { UserService } from 'app/_shared';
import { AuthService } from '../../../../services/security/auth.service';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss'],
})
export class UserInfoComponent implements OnInit {
  constructor(public auth: AuthService, public user: UserService) {}

  ngOnInit(): void {}
}
