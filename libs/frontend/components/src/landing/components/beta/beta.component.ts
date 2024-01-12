import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
    MatIconModule
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

  constructor(
    private authenticateService: AuthenticateService,
    @Inject(PLATFORM_ID) private platformId: string
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
