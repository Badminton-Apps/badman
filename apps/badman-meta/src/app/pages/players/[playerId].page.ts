import { waitFor } from '@analogjs/trpc';
import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { filter, map, switchMap } from 'rxjs/operators';
import { injectTrpcClient } from '../../../trpc-client';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, NgIf, FormsModule],
  template: `
    <h3>Player</h3>

    <ng-container *ngIf="player$ | async as player">
      <h4>{{ player.firstName }}, {{ player.lastName }}</h4>
    </ng-container>
  `,
})
export default class HomeComponent {
  private _trpc = injectTrpcClient();

  private readonly route = inject(ActivatedRoute);

  readonly player$ = this.route.paramMap.pipe(
    map((params) => params.get('playerId')),
    filter((id): id is string => !!id),
    switchMap((playerId) => this._trpc.player.byId.query({ id: playerId }))
  );

  constructor() {
    void waitFor(this.player$);
  }
}
