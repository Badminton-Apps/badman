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
import { AuthenticateService } from '@badman/frontend-auth';
import { Club, Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';

@Component({
  selector: 'badman-select-season',
  standalone: true,
  imports: [
    CommonModule,

    // Core modules
    TranslateModule,

    // Material Modules
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './select-season.component.html',
  styleUrls: ['./select-season.component.scss'],
})
export class SelectSeasonComponent implements OnInit {
  injector = inject(Injector);

  @Input()
  controlName = 'season';

  @Input()
  group!: FormGroup;

  @Input()
  dependsOn = 'club';

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

    this.group.valueChanges.subscribe((value) => {
      const previous = this.group?.get(this.dependsOn);
      if (!previous) {
        return;
      }

      if (previous.value instanceof Club) {
        this._setYears(previous.value);
      } else {
        this._setYears({ id: previous.value });
      }

      // update url on change
      if (this.updateUrl) {
        this.control.valueChanges.subscribe((value) => {
          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: {
              [this.controlName]: value,
            },
            queryParamsHandling: 'merge',
          });
        });
      }
    });
  }

  private _setYears(club: Club) {
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
            this.platformId
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
          map((years) => years.sort((a, b) => b - a))
        ),
      {
        initialValue: [getCurrentSeason()],
        injector: this.injector,
      }
    );
  }
}
