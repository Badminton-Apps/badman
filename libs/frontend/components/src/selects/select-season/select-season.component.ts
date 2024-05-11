import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';

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
  private apollo = inject(Apollo);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  injector = inject(Injector);

  controlName = input('season');

  group = input.required<FormGroup>();

  dependsOn = input('club');

  updateUrl = input(false);

  control = input<FormControl<number>>();
  protected internalControl!: FormControl<number>;

  seasons?: Signal<number[]>;

  ngOnInit() {
    if (this.control()) {
      this.internalControl = this.control() as FormControl<number>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group().get(this.controlName()) as FormControl<number>;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<number>(getCurrentSeason()) as FormControl<number>;
    }

    if (this.group()) {
      this.group().addControl(this.controlName(), this.internalControl);
    }

    this._setYearsForEventCompetition();
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
          transferState(`eventCompetitions-seasons`, this.stateTransfer, this.platformId),
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

  // private _setYearsForClub(club: Club) {
  //   this.seasons = toSignal(
  //     this.apollo
  //       .query<{
  //         teams: Partial<Team[]>;
  //       }>({
  //         query: gql`
  //           query CompetitionYears($where: JSONObject) {
  //             teams(where: $where) {
  //               id
  //               season
  //             }
  //           }
  //         `,
  //         variables: {
  //           where: {
  //             clubId: club.id,
  //           },
  //         },
  //       })
  //       .pipe(
  //         transferState(`club-${club.id}-seasons`, this.stateTransfer, this.platformId),
  //         map((result) => {
  //           if (!result?.data.teams) {
  //             throw new Error('No teams');
  //           }
  //           return result.data.teams.map((row) => row?.season as number);
  //         }),
  //         // map distinct years
  //         map((years) => [...new Set(years)]),
  //         // sort years
  //         map((years) => years.sort((a, b) => b - a)),
  //       ),
  //     {
  //       initialValue: [getCurrentSeason()],
  //       injector: this.injector,
  //     },
  //   );
  // }

  private _updateUrl(value: number, removeOtherParams = false) {
    if (this.updateUrl() && value) {
      const queryParams: { [key: string]: string | undefined } = {
        [this.controlName()]: `${value}`,
      };

      if (removeOtherParams) {
        queryParams[this.dependsOn()] = undefined;
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
