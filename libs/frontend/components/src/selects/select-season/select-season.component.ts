import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { Club, Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { startWith } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'badman-select-season',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './select-season.component.html',
  styleUrls: ['./select-season.component.scss'],
})
export class SelectSeasonComponent implements OnInit {
  private destroy$ = injectDestroy();

  injector = inject(Injector);

  @Input()
  controlName = 'season';

  @Input()
  group!: FormGroup;

  @Input()
  dependsOn = 'club';

  @Input()
  type: 'event' | 'club' = 'club';

  @Input()
  updateUrl = false;

  @Input()
  control = new FormControl();

  seasons?: Signal<number[]>;

  constructor(
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormControl<number>;
    }

    if (!this.control) {
      this.control = new FormControl<string | null>(null);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    const previous = this.group?.get(this.dependsOn);

    if (previous && this.type === 'club') {
      previous.valueChanges
        .pipe(startWith(previous.value), takeUntil(this.destroy$))
        .subscribe((value) => {
          const clubId = `${value?.id ?? value}`;
          // if the clubId is a uuid continue
          if (
            !clubId?.match(
              /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/,
            )
          ) {
            return;
          }

          this._setYearsForClub({
            id: clubId,
          } as Club);

          // update url on change
          if (this.updateUrl) {
            this.control.valueChanges
              .pipe(takeUntil(this.destroy$))
              .subscribe((value) => {
                this._updateUrl(value, false);
              });
          }
        });
    }

    if (!previous && this.type === 'event') {
      this._setYearsForEventCompetition();
    }
  }

  private _setYearsForEventCompetition() {
    this.seasons = toSignal(
      this.apollo
        .query<{
          eventCompetitionSeasons: number[];
        }>({
          query: gql`
            query CompetitionYearsCompetition {
              eventCompetitionSeasons
            }
          `,
        })
        .pipe(
          transferState(
            `eventCompetitions-seasons`,
            this.stateTransfer,
            this.platformId,
          ),
          map((result) => {
            if (!result?.data.eventCompetitionSeasons) {
              throw new Error('No teams');
            }
            return result.data.eventCompetitionSeasons;
          }),
        ),
      {
        initialValue: [getCurrentSeason()],
        injector: this.injector,
      },
    );
  }

  private _setYearsForClub(club: Club) {
    this.seasons = toSignal(
      this.apollo
        .query<{
          teams: Partial<Team[]>;
        }>({
          query: gql`
            query CompetitionYears($where: JSONObject) {
              teams(where: $where) {
                id
                season
              }
            }
          `,
          variables: {
            where: {
              clubId: club.id,
            },
          },
        })
        .pipe(
          transferState(
            `club-${club.id}-seasons`,
            this.stateTransfer,
            this.platformId,
          ),
          map((result) => {
            if (!result?.data.teams) {
              throw new Error('No teams');
            }
            return result.data.teams.map((row) => row?.season as number);
          }),
          // map distinct years
          map((years) => [...new Set(years)]),
          // sort years
          map((years) => years.sort((a, b) => b - a)),
        ),
      {
        initialValue: [getCurrentSeason()],
        injector: this.injector,
      },
    );
  }

  private _updateUrl(value: string, removeOtherParams = false) {
    if (this.updateUrl && value) {
      const queryParams: { [key: string]: string | undefined } = {
        [this.controlName]: value,
      };

      if (removeOtherParams) {
        queryParams[this.dependsOn] = undefined;
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
}
