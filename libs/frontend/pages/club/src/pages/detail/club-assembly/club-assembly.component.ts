import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, Signal, computed, effect, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { Club } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { startWith, takeUntil } from 'rxjs';
import { CanPlay, ClubAssemblyService } from './club-assembly.service';
import { input } from '@angular/core';

@Component({
  selector: 'badman-club-assembly',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressBarModule,
    HasClaimComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
  templateUrl: './club-assembly.component.html',
  styleUrls: ['./club-assembly.component.scss'],
})
export class ClubAssemblyComponent implements OnInit {
  private destroy$ = injectDestroy();
  clubAssemblyService = inject(ClubAssemblyService);

  columns = computed(() => [
    'player',
    ...(this.clubAssemblyService.state.teams()?.map((team) => team.name ?? 'empty') ?? []),
  ]);

  // Inputs
  club = input.required<Signal<Club>>();
  filter = input<FormGroup | undefined>();

  canPlay = CanPlay;

  constructor() {
    effect(() => {
      this.clubAssemblyService.filter.patchValue({
        clubId: this.club()().id,
      });
    });
  }

  ngOnInit(): void {
    this.filter()
      ?.valueChanges.pipe(startWith(this.filter()?.value), takeUntil(this.destroy$))
      .subscribe((newValue) => {
        this.clubAssemblyService.filter.patchValue({
          season: newValue.season,
          choices: newValue.choices,
        });
      });
  }
}
