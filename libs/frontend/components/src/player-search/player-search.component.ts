import { CommonModule } from '@angular/common';
import {
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  computed,
  input,
  inject,
  output,
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Club, Player } from '@badman/frontend-models';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Observable, ReplaySubject, lastValueFrom, merge, of } from 'rxjs';
import { debounceTime, filter, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PlayerFieldsComponent } from '../fields';

@Component({
  imports: [
    CommonModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatOptionModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDialogModule,
    MatInputModule,
    MatProgressBarModule,
    PlayerFieldsComponent,
  ],
  selector: 'badman-player-search',
  templateUrl: './player-search.component.html',
  styleUrls: ['./player-search.component.scss'],
})
export class PlayerSearchComponent implements OnChanges, OnInit {
  private apollo = inject(Apollo);
  private dialog = inject(MatDialog);
  private destroy$ = injectDestroy();

  whenSelectPlayer = output<Player>();

  label = input('all.player.search.label');

  allowCreation = input(false);

  clearOnSelection = input(true);

  where = input<
    | {
        [key: string]: unknown;
      }
    | undefined
  >();

  validationFunction = input<
    (player: Player) => {
      valid: boolean;
      message?: string;
    }
  >(() => ({ valid: true }));

  player = input<string | Player | undefined>();

  club = input<string | Club | undefined>();

  searchOutsideClub = input(true);
  strictMemberId = input(false);

  includePersonal = input(false);

  clubId = computed(() => {
    if (this.club() instanceof Club) {
      return (this.club() as Club).id;
    }
    return this.club();
  }) as () => string | undefined;

  ignorePlayers = input<Partial<Player>[] | undefined>();

  options = input<Player[]>([]);

  ignorePlayersIds?: string[] = [];

  loading = false;

  formControl!: FormControl;
  activeValue?: Player;

  filteredOptions$!: Observable<Player[]>;
  clear$: ReplaySubject<Player[]> = new ReplaySubject(0);

  @ViewChild('newPlayer')
  newPlayerTemplateRef?: TemplateRef<HTMLElement>;
  newPlayerFormGroup!: FormGroup;

  ngOnChanges(changes: SimpleChanges) {
    if (!(changes['player']?.isFirstChange() ?? true)) {
      this.setPlayer();
    }
    if (changes['ignorePlayers']) {
      this.ignorePlayersIds = (this.ignorePlayers()?.map((r) => r.id) ?? []).filter(
        (v, i, a) => a.indexOf(v) === i,
      ) as string[];
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
      tap(() => (this.loading = true)),
      switchMap((r) => {
        const obs = this.clubId()
          ? this.apollo
              .query<{ club: { players: Player[] } }>({
                query: gql`
                  query GetClubPlayers($id: ID!, $where: JSONObject, $personal: Boolean!) {
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
                        clubMembership {
                          id
                          membershipType
                          active
                          confirmed
                        }
                      }
                    }
                  }
                `,
                variables: {
                  where: this._playerSearchWhere({
                    query: r,
                    where: this.where(),
                  }),
                  id: this.clubId(),
                  personal: this.includePersonal() ?? false,
                },
              })
              .pipe(map((x) => x.data?.club?.players?.map((r) => new Player(r))))
          : of([]);

        return obs.pipe(
          map((results) => {
            return {
              query: r,
              results,
            };
          }),
        );
      }),
      switchMap((response) => {
        if (response?.results?.length && response?.results?.length > 0) {
          return of(response.results);
        } else if (this.searchOutsideClub()) {
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
                        clubMembership {
                          id
                          membershipType
                          active
                          confirmed
                        }
                      }
                    }
                  }
                }
              `,
              variables: {
                where: this._playerSearchWhere({
                  query: response.query,
                  where: this.where(),
                }),
                personal: this.includePersonal() ?? false,
              },
            })
            .pipe(map((x) => x.data?.players?.rows?.map((r) => new Player(r))));
        } else {
          return of([]);
        }
      }),
      map((result: Player[]) =>
        // Distinct by id
        result?.filter((value, index, self) => self.findIndex((m) => m.id === value.id) === index),
      ),
      tap(() => {
        this.loading = false;
      }),
    ) as Observable<Player[]>;

    this.filteredOptions$ = merge(search$, this.clear$);
  }

  private setPlayer() {
    of(this.player())
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
                .pipe(map((x) => new Player(x.data?.player))),
            );
          }
          return of(p);
        }),
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
      let memberId: number | undefined;
      if (event.option.value != null) {
        const spaced = event.option.value.indexOf(' ');

        // if spaced is a number then use it for the memberId
        memberId = parseInt(event.option.value.slice(0, spaced).trim());

        if (isNaN(memberId)) {
          if (spaced != -1) {
            firstName = event.option.value.slice(spaced).trim();
            lastName = event.option.value.substr(0, spaced).trim();
          } else {
            firstName = event.option.value.trim();
          }
        }
      }

      this.newPlayerFormGroup = PlayerFieldsComponent.newPlayerForm({
        firstName,
        lastName,
        memberId: event.option.value.trim(),
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
                      firstName: this.newPlayerFormGroup?.value.firstName?.trim(),
                      lastName: this.newPlayerFormGroup?.value.lastName?.trim(),
                      gender: this.newPlayerFormGroup?.value.gender?.trim(),
                    },
                  },
                })
                .pipe(map((x) => new Player(x.data?.createPlayer))),
            );
            if (!this.clearOnSelection()) {
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
    this.whenSelectPlayer.emit(player);
    if (this.clearOnSelection()) {
      this.formControl.reset();
      this.clear$.next([]);
    }
  }

  private _playerSearchWhere(args?: { query?: string; where?: { [key: string]: unknown } }) {
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

    if (this.strictMemberId()) {
      queries.push({
        $and: [
          {
            memberId: {
              $not: null,
            },
          },
          {
            memberId: {
              $not: '',
            },
          },
        ],
      });
    }

    return {
      $and: queries,
      ...args?.where,
    };
  }
}
