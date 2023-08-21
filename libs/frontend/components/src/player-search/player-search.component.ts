import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteActivatedEvent,
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Club, Player } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import {
  Observable,
  ReplaySubject,
  Subject,
  lastValueFrom,
  merge,
  of,
} from 'rxjs';
import {
  debounceTime,
  filter,
  tap,
  map,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import { PlayerFieldsComponent } from '../fields';

@Component({
  standalone: true,
  imports: [
    CommonModule,

    TranslateModule,

    MatIconModule,
    MatButtonModule,
    MatOptionModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDialogModule,
    MatInputModule,

    // My Modules
    PlayerFieldsComponent,
  ],
  selector: 'badman-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss'],
})
export class PlayerSearchComponent implements OnChanges, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Output() whenSelectPlayer = new EventEmitter<Player>();

  @Input()
  label = 'all.player.search.label';

  @Input()
  allowCreation = false;

  @Input()
  clearOnSelection = true;

  @Input()
  where?: { [key: string]: unknown };

  @Input()
  player?: string | Player;

  @Input()
  club?: string | Club;

  @Input()
  searchOutsideClub = true;

  @Input()
  includePersonal = false;

  clubId?: string;

  @Input()
  ignorePlayers?: Partial<Player>[];

  ignorePlayersIds?: string[] = [];

  formControl!: FormControl;
  activeValue?: Player;

  filteredOptions$!: Observable<Player[]>;
  clear$: ReplaySubject<Player[]> = new ReplaySubject(0);

  @ViewChild('newPlayer')
  newPlayerTemplateRef?: TemplateRef<HTMLElement>;
  newPlayerFormGroup?: FormGroup;

  constructor(private apollo: Apollo, private dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!(changes['player']?.isFirstChange() ?? true)) {
      this.setPlayer();
    }
    if (changes['ignorePlayers']) {
      this.ignorePlayersIds = (
        this.ignorePlayers?.map((r) => r.id) ?? []
      ).filter((v, i, a) => a.indexOf(v) === i) as string[];
    }
  }

  ngOnInit() {
    this.formControl = new FormControl();
    this.setPlayer();

    const search$ = this.formControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(''),
      filter((x) => !!x),
      filter((x) => typeof x === 'string'),
      filter((x) => x?.length >= 2),
      debounceTime(600),
      switchMap((r) => {
        this.clubId =
          this.club instanceof Club ? this.club?.id : this.club ?? undefined;
        const obs = this.clubId
          ? this.apollo
              .query<{ club: { players: Player[] } }>({
                query: gql`
                  query GetClubPlayers(
                    $id: ID!
                    $where: JSONObject
                    $personal: Boolean!
                  ) {
                    club(id: $id) {
                      id
                      players(where: $where) {
                        id
                        slug
                        memberId
                        firstName
                        lastName
                        gender
                        competitionPlayer
                        phone @include(if: $personal)
                        email @include(if: $personal)
                      }
                    }
                  }
                `,
                variables: {
                  where: this._playerSearchWhere({
                    query: r,
                    where: this.where,
                  }),
                  id: this.clubId,
                  personal: this.includePersonal ?? false,
                },
              })
              .pipe(
                map((x) => x.data?.club?.players?.map((r) => new Player(r)))
              )
          : of([]);

        return obs.pipe(
          map((results) => {
            return {
              query: r,
              results,
            };
          })
        );
      }),
      switchMap((response) => {
        if (response?.results?.length && response?.results?.length > 0) {
          return of(response.results);
        } else if (this.searchOutsideClub) {
          return this.apollo
            .query<{ players: { rows: Player[] } }>({
              query: gql`
                query GetPlayers($where: JSONObject, $personal: Boolean!) {
                  players(where: $where, take: 30) {
                    rows {
                      id
                      slug
                      memberId
                      firstName
                      lastName
                      competitionPlayer
                      phone @include(if: $personal)
                      email @include(if: $personal)
                      clubs {
                        id
                        name
                      }
                    }
                  }
                }
              `,
              variables: {
                where: this._playerSearchWhere({
                  query: response.query,
                  where: this.where,
                }),
                personal: this.includePersonal ?? false,
              },
            })
            .pipe(map((x) => x.data?.players?.rows?.map((r) => new Player(r))));
        } else {
          return of([]);
        }
      }),
      map((result) =>
        // Distinct by id
        result?.filter(
          (value, index, self) =>
            self.findIndex((m) => m.id === value.id) === index
        )
      )
    );

    // TODO: Implement in above pipe, once rxjs stops doing weird
    search$.pipe(
      tap((result) => {
        // if only one result, select it
        if (result?.length === 1) {
          this._selectPlayer(result[0]);
        }
      })
    );

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  private setPlayer() {
    of(this.player)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((p) => {
          if (typeof p == 'string') {
            return lastValueFrom(
              this.apollo
                .query<{ player: Partial<Player> }>({
                  query: gql`
                    # Write your query or mutation here
                    query GetUserInfoQuery($id: ID!) {
                      player(id: $id) {
                        id
                        slug
                        memberId
                        firstName
                        lastName
                        sub
                        gender
                        competitionPlayer
                        updatedAt
                      }
                    }
                  `,
                  variables: {
                    id: p,
                  },
                })
                .pipe(map((x) => new Player(x.data?.player)))
            );
          }
          return of(p);
        })
      )
      .subscribe((player) => {
        if (player) {
          this.formControl.setValue(player, { emitEvent: false });
        }
      });
  }

  displayFn(user: Player): string {
    return user && user.fullName;
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    if (event.option.value?.id == null && this.newPlayerTemplateRef) {
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (event.option.value != null) {
        const spaced = event.option.value.indexOf(' ');
        if (spaced != -1) {
          firstName = event.option.value.slice(spaced).trim();
          lastName = event.option.value.substr(0, spaced).trim();
        } else {
          firstName = event.option.value.trim();
        }
      }

      this.newPlayerFormGroup = PlayerFieldsComponent.newPlayerForm({
        firstName,
        lastName,
      });

      const dialogRef = this.dialog.open(this.newPlayerTemplateRef);

      dialogRef
        .afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(async () => {
          if (this.newPlayerFormGroup?.value) {
            const dbPlayer = await lastValueFrom(
              this.apollo
                .mutate<{ createPlayer: Partial<Player> }>({
                  mutation: gql`
                    mutation createPlayer($data: PlayerNewInput!) {
                      createPlayer(data: $data) {
                        id
                        slug
                        memberId
                        firstName
                        lastName
                      }
                    }
                  `,
                  variables: {
                    data: {
                      memberId: this.newPlayerFormGroup?.value.memberId?.trim(),
                      firstName:
                        this.newPlayerFormGroup?.value.firstName?.trim(),
                      lastName: this.newPlayerFormGroup?.value.lastName?.trim(),
                      gender: this.newPlayerFormGroup?.value.gender?.trim(),
                    },
                  },
                })
                .pipe(map((x) => new Player(x.data?.createPlayer)))
            );
            if (!this.clearOnSelection) {
              this.formControl.setValue(this.newPlayerFormGroup?.value);
            }
            this._selectPlayer(dbPlayer);
          }
        });
    } else {
      this._selectPlayer(event.option.value);
    }
  }

  optionActivated(event: MatAutocompleteActivatedEvent) {
    this.activeValue = event.option?.value;
  }

  inputBlur() {
    if (this.activeValue) {
      this._selectPlayer(this.activeValue);
      this.activeValue = undefined;
    }
  }

  private _selectPlayer(player: Player) {
    this.whenSelectPlayer.next(player);
    if (this.clearOnSelection) {
      this.formControl.reset();
      this.clear$.next([]);
    }
  }

  private _playerSearchWhere(args?: {
    query?: string;
    where?: { [key: string]: unknown };
  }) {
    const parts = args?.query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');
    const queries: unknown[] = [];
    if (!parts) {
      return;
    }
    for (const part of parts) {
      queries.push({
        $or: [
          { firstName: { $iLike: `%${part}%` } },
          { lastName: { $iLike: `%${part}%` } },
          { memberId: { $iLike: `%${part}%` } },
        ],
      });
    }

    return {
      $and: queries,
      ...args?.where,
    };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
