import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { LoggedinUser, AuthenticateService } from '@badman/frontend-auth';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'badman-beta',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './beta.component.html',
  styleUrls: ['./beta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BetaComponent implements OnInit {
  @Input()
  version?: string;

  user$?: Observable<LoggedinUser>;

  // store the state of the beta message in local storage
  hideBetaMessage = false;

  constructor(private authenticateService: AuthenticateService) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$;

    const hideBetaMessage = localStorage.getItem('hideBetaMessage');
    if (hideBetaMessage != undefined) {
      this.hideBetaMessage = hideBetaMessage == 'true';
    }
  }

  hideMessage() {
    this.hideBetaMessage = true;
    localStorage.setItem('hideBetaMessage', 'true');    
  }
}
