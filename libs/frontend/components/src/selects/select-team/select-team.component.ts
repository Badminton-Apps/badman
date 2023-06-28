import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticateService } from '@badman/frontend-auth';
import { Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import {
  Observable,
  Subject,
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
  tap,
} from 'rxjs';

@Component({
  selector: 'badman-select-team',
  standalone: true,
  imports: [
    CommonModule,

    // Core modules
    TranslateModule,

    // Material Modules
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
  ],
  templateUrl: './select-team.component.html',
  styleUrls: ['./select-team.component.scss'],
})
export class SelectTeamComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  @Input()
  controlName = 'team';

  @Input()
  group!: FormGroup;

  @Input()
  dependsOn = 'club';

  @Input()
  updateOn = ['club'];

  @Input()
  updateUrl = false;

  @Input()
  control = new FormControl();

  teams$?: Observable<{ type: string; teams: Team[] }[]>;

  constructor(
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authenticateService: AuthenticateService,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormControl<string>;
    }

    if (!this.control) {
      this.control = new FormControl<string | null>(null);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }
    const previous = this.group?.get(this.dependsOn);
    if (!previous) {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    } else {
      // get all the controls that we need to update on when change
      const updateOnControls = this.updateOn
        ?.filter((controlName) => controlName !== this.dependsOn)
        .map((controlName) => this.group?.get(controlName))
        .filter((control) => control != null) as FormControl[];

      this.teams$ = combineLatest([
        previous.valueChanges.pipe(startWith(null)),
        ...updateOnControls.map((control) =>
          control?.valueChanges?.pipe(startWith(() => control?.value))
        ),
      ]).pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(),
        map(() => previous?.value),
        pairwise(),
        switchMap(([prev, next]) => {
          if (prev != null && prev !== next) {
            // Reset the team on club change
            this.control.setValue(null);
          }

          // Check if the next is a UUID
          if (next && next.length === 36) {
            return this._loadTeams(next);
          } else {
            return of([]);
          }
        }),
        map((teams) => {
          const grouped = (teams ?? []).reduce((acc, team) => {
            const group = team.type ?? 'Other';
            if (!acc[group]) {
              acc[group] = [];
            }
            acc[group].push(team);
            return acc;
          }, {} as { [key: string]: Team[] });
          return Object.keys(grouped).map((key) => ({
            type: key,
            teams: grouped[key],
          }));
        }),
        shareReplay(1)
      );

      this.teams$
        ?.pipe(
          concatMap((teams) =>
            // if authenticated, find where the user is captain
            this.authenticateService.user$.pipe(
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
              take(1)
            )
          )
        )
        .subscribe(({ teams, teamsUser }) => {
          let foundTeam: Team | undefined = undefined;
          const teamId =
            this.activatedRoute.snapshot?.queryParamMap?.get('team');
          const allTeams = teams
            ?.map((group) => group.teams)
            ?.reduce((acc, teams) => acc.concat(teams), []);

          if (teamId && teams.length > 0) {
            // Check all groups if the team is in there
            foundTeam = allTeams?.find((team) => team.id == teamId);
          }

          if (foundTeam == null && teamsUser) {
            // Check if the user is captain of a team
            foundTeam = allTeams?.find((team) => team.id == teamsUser);
          }

          if (foundTeam && foundTeam.id) {
            this.control.setValue(foundTeam.id, { onlySelf: true });
            this._updateUrl(foundTeam.id);
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

    this._updateUrl(id, true);
  }

  private _updateUrl(teamId: string, removeOtherParams = false) {
    if (this.updateUrl && teamId) {
      const queryParams: { [key: string]: string | undefined } = {
        team: teamId,
      };

      if (removeOtherParams) {
        queryParams['encounter'] = undefined;
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
            season: this.group?.get('season')?.value ?? null,
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
        transferState(
          `clubTeamsKey-${clubId}}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.teams) {
            throw new Error('No club');
          }
          return result.data.teams?.map((team) => new Team(team));
        })
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
        transferState(
          `captainOfTeam-${userId}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.teams) {
            throw new Error('No club');
          }
          return result.data.teams?.map((team) => team?.id);
        })
      );
  }

  ngOnDestroy() {
    // this.group.removeControl(this.controlName);

    this.destroy$.next();
    this.destroy$.complete();
  }
}
