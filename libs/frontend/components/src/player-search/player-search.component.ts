import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
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
import { lastValueFrom, merge, Observable, of, ReplaySubject } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

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
  ],
  selector: 'badman-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss'],
})
export class PlayerSearchComponent implements OnChanges, OnInit {
  @Output() whenSelectPlayer = new EventEmitter<Player>();

  @Input()
  label = 'all.players.search.label';

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

  filteredOptions$!: Observable<Player[]>;
  clear$: ReplaySubject<Player[]> = new ReplaySubject(0);

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
                  players(where: $where) {
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
      // Distinct by id
      map((result) =>
        result?.filter(
          (value, index, self) =>
            self.findIndex((m) => m.id === value.id) === index
        )
      )
    );

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  private setPlayer() {
    of(this.player)
      .pipe(
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
    if (event.option.value?.id == null) {
      // const dialogRef = this.dialog.open(NewPlayerComponent, {
      //   data: { input: event.option.value },
      // });
      // dialogRef.afterClosed().subscribe(async (player: Partial<Player>) => {
      //   if (player) {
      //     const dbPlayer = await lastValueFrom(
      //       this.apollo
      //         .mutate<{ addPlayer: Partial<Player> }>({
      //           mutation: gql`
      //             mutation AddPlayer($data: PlayerNewInput!) {
      //               addPlayer(data: $data) {
      //                 id
      //                 slug
      //                 memberId
      //                 firstName
      //                 lastName
      //               }
      //             }
      //           `,
      //           variables: {
      //             data: {
      //               memberId: player.memberId?.trim(),
      //               firstName: player.firstName?.trim(),
      //               lastName: player.lastName?.trim(),
      //               gender: player.gender?.trim(),
      //             },
      //           },
      //         })
      //         .pipe(map((x) => new Player(x.data?.addPlayer)))
      //     );
      //     if (!this.clearOnSelection) {
      //       this.formControl.setValue(player);
      //     }
      //     this._selectPlayer(dbPlayer);
      //   }
      // });
    } else {
      this._selectPlayer(event.option.value);
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
}