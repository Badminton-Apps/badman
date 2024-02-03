import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  input
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthenticateService, LoggedinUser } from '@badman/frontend-auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'badman-beta',
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './beta.component.html',
  styleUrls: ['./beta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BetaComponent implements OnInit {
  version = input<string | undefined>();

  user$?: Observable<LoggedinUser>;

  // store the state of the beta message in local storage
  hideBetaMessage = false;

  constructor(
    private authenticateService: AuthenticateService,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$;

    if (isPlatformBrowser(this.platformId)) {
      const hideBetaMessage = localStorage.getItem('hideBetaMessage');
      if (hideBetaMessage != undefined) {
        this.hideBetaMessage = hideBetaMessage == 'true';
      }
    }
  }

  hideMessage() {
    this.hideBetaMessage = true;
    localStorage.setItem('hideBetaMessage', 'true');
  }
}
