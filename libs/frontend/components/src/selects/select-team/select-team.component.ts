import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, TransferState } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { input } from '@angular/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticateService } from '@badman/frontend-auth';
import { Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import {
  Observable,
  combineLatest,
  concatMap,
  distinctUntilChanged,
  map,
  of,
  pairwise,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'badman-select-team',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatSelectModule,
  ],
  templateUrl: './select-team.component.html',
  styleUrls: ['./select-team.component.scss'],
})
export class SelectTeamComponent implements OnInit {
  private destroy$ = injectDestroy();

  controlName = input('team');

  group = input.required<FormGroup>();

  dependsOn = input('club');

  updateOn = input(['club']);

  updateUrl = input(false);

  multiple = input(false);

  autoSelect = input<'user' | 'all'>('user');

  control = input<FormControl<string[] | string | null>>();
  protected internalControl!: FormControl<string[] | string | null>;

  teams$?: Observable<{ type: string; teams: Team[] }[]>;
  user$ = toObservable(this.authenticateService.userSignal);

  constructor(
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authenticateService: AuthenticateService,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  ngOnInit() {
    if (this.control() != undefined) {
      this.internalControl = this.control() as FormControl<string[] | string | null>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group().get(this.controlName()) as FormControl<
        string[] | string | null
      >;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<string[] | string | null>(null) as FormControl<
        string[] | string | null
      >;
    }

    if (this.group()) {
      this.group().addControl(this.controlName(), this.internalControl);
    }

    const previous = this.group().get(this.dependsOn());

    if (!previous) {
      console.warn(`Dependency ${this.dependsOn()} not found`, previous);
    } else {
      // get all the controls that we need to update on when change
      const updateOnControls = this.updateOn()
        ?.filter((controlName) => controlName !== this.dependsOn())
        .map((controlName) => this.group().get(controlName))
        .filter((control) => control != null) as FormControl[];

      this.teams$ = combineLatest([
        previous.valueChanges.pipe(startWith(null)),
        ...updateOnControls.map((control) =>
          control?.valueChanges?.pipe(startWith(() => control?.value)),
        ),
      ]).pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(),
        map(() => previous?.value?.id ?? previous?.value),
        startWith(previous?.value?.id ?? previous?.value),
        pairwise(),
        switchMap(([prev, next]) => {
          if (prev != null && prev !== next) {
            // Reset the team on club change
            this.internalControl.setValue(this.multiple() ? [] : null);
          }

          // Check if the next is a UUID
          if (next && next.length === 36) {
            return this._loadTeams(next);
          } else {
            return of([]);
          }
        }),
        map((teams) => {
          const grouped = (teams ?? []).reduce(
            (acc, team) => {
              const group = team.type ?? 'Other';
              if (!acc[group]) {
                acc[group] = [];
              }
              acc[group].push(team);
              return acc;
            },
            {} as { [key: string]: Team[] },
          );
          return Object.keys(grouped).map((key) => ({
            type: key,
            teams: grouped[key],
          }));
        }),
        shareReplay(1),
      );

      this.teams$
        ?.pipe(
          concatMap((teams) =>
            this.autoSelect() === 'user'
              ? // if authenticated, find where the user is captain
                this.user$.pipe(
                  switchMap((user) => {
                    if (!user?.id) {
                      return of(undefined);
                    }
                    return this._findTeamsWhereUserIsCaptain(user?.id);
                  }),
                  map((teamsUser) => ({
                    teams,
                    teamsUser: teamsUser?.[0],
                  })),
                  take(1),
                )
              : of({
                  teams,
                  teamsUser: undefined,
                }),
          ),
        )
        .subscribe(({ teams, teamsUser }) => {
          let foundTeam: Team[] | undefined = undefined;
          const teamId = this.activatedRoute.snapshot?.queryParamMap?.get('team');

          const allTeams = teams
            ?.map((group) => group.teams)
            ?.reduce((acc, teams) => acc.concat(teams), []);

          if (teamId && teams.length > 0) {
            // Check all groups if the team is in there
            foundTeam = allTeams?.filter((team) => team.id == teamId);
          } else if (this.autoSelect() === 'user') {
            foundTeam = teams
              ?.map((group) => group.teams)
              ?.reduce((acc, teams) => acc.concat(teams), [])
              ?.filter((team) => team.id == teamsUser);
          } else if (this.autoSelect() === 'all') {
            foundTeam = allTeams;
          }

          if (foundTeam && foundTeam.length > 0) {
            this.internalControl.setValue(
              this.multiple() ? foundTeam.map((team) => team.id ?? '') : foundTeam[0].id ?? '',
            );
            this._updateUrl(
              foundTeam.map((team) => team.id ?? ''),
              teamId == null,
            );
          }
        });
    }
  }

  selectTeam(event: MatAutocompleteSelectedEvent | MatSelectChange) {
    let id: string;

    if (event instanceof MatAutocompleteSelectedEvent) {
      id = event.option.value;
    } else if (event instanceof MatSelectChange) {
      id = event.value;
    } else {
      return;
    }

    // add id to the control
    const newIds = this.multiple() ? [...(this.internalControl.value ?? []), id] : [id];

    this._updateUrl(newIds, true);
  }

  private _updateUrl(teamIds: string[], removeOtherParams = false) {
    if (this.updateUrl() && teamIds?.length) {
      const queryParams: { [key: string]: string | undefined } = {
        [this.controlName()]: teamIds.join(','),
      };

      if (removeOtherParams) {
        queryParams['encounter'] = undefined;
      }

      // check if the current url is the same as the new url
      // if so, don't navigate
      const currentUrl = this.router.url;
      const newUrl = this.router
        .createUrlTree([], {
          relativeTo: this.activatedRoute,
          queryParams,
          queryParamsHandling: 'merge',
        })
        .toString();

      if (currentUrl == newUrl) {
        return;
      }

      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams,
        queryParamsHandling: 'merge',
      });
    }
  }

  private _loadTeams(clubId: string) {
    return this.apollo
      .query<{ teams: Partial<Team>[] }>({
        query: gql`
          query GetTeamsQuery($where: JSONObject, $order: [SortOrderType!]) {
            teams(where: $where, order: $order) {
              id
              slug
              name
              abbreviation
              type
              teamNumber
              captainId
            }
          }
        `,
        variables: {
          where: {
            season: this.group().get('season')?.value ?? null,
            clubId: clubId,
          },
          order: [
            {
              direction: 'ASC',
              field: 'teamNumber',
            },
          ],
        },
      })
      .pipe(
        transferState(`clubTeamsKey-${clubId}}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.teams) {
            throw new Error('No club');
          }
          return result.data.teams?.map((team) => new Team(team));
        }),
      );
  }

  private _findTeamsWhereUserIsCaptain(userId: string) {
    return this.apollo
      .query<{ teams: Partial<Team[]> }>({
        query: gql`
          query GetTeamsForCaptain($where: JSONObject) {
            teams(where: $where) {
              id
            }
          }
        `,
        variables: {
          where: {
            captainId: userId,
          },
        },
      })
      .pipe(
        transferState(`captainOfTeam-${userId}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.teams) {
            throw new Error('No club');
          }
          return result.data.teams?.map((team) => team?.id);
        }),
      );
  }

  selectAll(options: { type: string; teams: Team[] }[]) {
    this.internalControl.setValue(
      options.map((option) => option.teams?.map((team) => team.id)).flat(),
    );
  }

  deselectAll() {
    this.internalControl.setValue([]);
  }
}
