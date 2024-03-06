import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthenticateService } from '@badman/frontend-auth';

@Component({
  selector: 'badman-beta',
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './beta.component.html',
  styleUrls: ['./beta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BetaComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authenticateService = inject(AuthenticateService);

  version = input<string | undefined>();

  user = computed(() => this.authenticateService.user());
  loggedIn = computed(() => this.authenticateService.loggedIn());

  // store the state of the beta message in local storage
  hideBetaMessage = false;

  ngOnInit() {
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
