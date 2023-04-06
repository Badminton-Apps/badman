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

@Component({
  selector: 'badman-beta',
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterModule],
  templateUrl: './beta.component.html',
  styleUrls: ['./beta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BetaComponent implements OnInit {
  @Input()
  version?: string;

  user$?: Observable<LoggedinUser>;

  constructor(private authenticateService: AuthenticateService) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$;
  }
}
