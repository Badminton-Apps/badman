import { waitFor } from '@analogjs/trpc';
import { AsyncPipe, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, NgForm } from '@angular/forms';
import { TRPCClientError } from '@trpc/client';
import { Subject, combineLatest } from 'rxjs';
import { shareReplay, startWith, switchMap, take, tap } from 'rxjs/operators';
import { AppRouter } from '../../../server/trpc/routers';
import { injectTrpcClient } from '../../../trpc-client';
import { RouterModule } from '@angular/router';
import FilterPlayersComponent from './filter.players';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    NgFor,
    FormsModule,
    RouterModule,

    // own components
    FilterPlayersComponent,
  ],
  template: `
    <h3>Posts</h3>

    <badman-filter-players [formGroup]="this.filter" />

    <ul>
      <li *ngFor="let player of players$ | async">
        <a [routerLink]="['/players', player.id]"
          >{{ player.firstName }}, {{ player.lastName }}</a
        >
      </li>
    </ul>
  `,
})
export default class HomeComponent {
  private _trpc = injectTrpcClient();

  public filter = new FormGroup({
    firstName: new FormControl(''),
    lastName: new FormControl(''),
  });

  public triggerRefresh$ = new Subject<void>();
  public players$ = combineLatest([
    this.filter.valueChanges.pipe(startWith(this.filter.value)),
    this.triggerRefresh$,
  ]).pipe(
    switchMap(([filters]) =>
      this._trpc.player.list.query({ limit: 10, ...filters })
    ),
    shareReplay(1)
  );

  public error = signal<TRPCClientError<AppRouter> | undefined>(undefined);

  constructor() {
    void waitFor(this.players$);
    this.triggerRefresh$.next();
  }

  public removePost(id: number) {
    this.error.set(undefined);
    // this._trpc.player.remove
    //   .mutate({ id })
    //   .pipe(
    //     take(1),
    //     catchError((e) => {
    //       this.error.set(e);
    //       return of(null);
    //     })
    //   )
    //   .subscribe(() => this.triggerRefresh$.next());
  }
}
