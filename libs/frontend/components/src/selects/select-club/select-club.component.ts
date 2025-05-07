import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  TransferState,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import { Club } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { ClubMembershipType } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  filter,
  first,
  map,
  of,
  startWith,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';

@Component({
    selector: 'badman-select-club',
    imports: [
        CommonModule,
        TranslatePipe,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatSelectModule,
    ],
    templateUrl: './select-club.component.html',
    styleUrls: ['./select-club.component.scss']
})
export class SelectClubComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  private readonly claimSerice = inject(ClaimService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthenticateService);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  destroy$ = new Subject<void>();

  group = input<FormGroup>();

  control = input<FormControl<string | null>>();
  protected internalControl!: FormControl<string | null>;

  controlName = input('club');

  singleClubPermission = input<string>('');

  allClubPermission = input<string>('');

  needsPermission = input(false);

  updateUrl = input(false);

  #clubs = new BehaviorSubject<Club[] | null>(null);
  get clubs() {
    return this.#clubs.value;
  }
  filteredClubs$?: Observable<Club[]>;

  useAutocomplete = input<boolean | 'auto'>('auto');
  useAutocompleteSignal = signal<boolean | 'auto'>(this.useAutocomplete());

  autoCompleteTreshold = input(5);

  autoSelect = input(true);

  allowDeselect = input(false);

  hasSingleClub = computed(() =>
    this.claimSerice.hasAllClaims([`*_${this.singleClubPermission()}`]),
  );

  hasAllClubs = computed(() => this.claimSerice.hasAllClaims([`${this.allClubPermission()}`]));

  user = this.authService.user;

  ngOnInit() {
    if (this.control()) {
      this.internalControl = this.control() as FormControl<string>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group()?.get(this.controlName()) as FormControl<string>;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<string | null>(null);
    }

    if (this.group()) {
      this.group()?.addControl(this.controlName(), this.internalControl);
    }

    combineLatest([
      this._getClubs(),
      toObservable(this.hasSingleClub, { injector: this.injector }),
      toObservable(this.hasAllClubs, { injector: this.injector }),
      toObservable(this.user, { injector: this.injector }),
      this.activatedRoute.queryParamMap,
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([allClubs, , all, user, params]) => {
          if (this.needsPermission() && !all) {
            return this.claimSerice.claims$.pipe(
              map((r) => r?.filter((x) => x?.indexOf(this.singleClubPermission()) != -1)),
              map((r) => r?.map((c) => c?.replace(`_${this.singleClubPermission()}`, ''))),
              switchMap((ids) => {
                const filtered = allClubs.filter((c) => {
                  if (c.id == null) {
                    return false;
                  }
                  return ids?.indexOf(c.id) != -1;
                });

                if (filtered.length < this.autoCompleteTreshold()) {
                  this.useAutocompleteSignal.set(false);
                }

                return of({
                  rows: filtered,
                  count: filtered.length,
                  user,
                  params,
                });
              }),
            );
          }

          return of({ rows: allClubs, count: allClubs.length, user, params });
        }),
      )
      .subscribe(({ rows, user, params }) => {
        this.#clubs.next(rows ?? null);

        if (this.internalControl?.value == null) {
          const paramClubId = params.get('club');

          if (paramClubId) {
            const foundClub = rows?.find((r) => r.id == paramClubId)?.id ?? null;
            this.selectClub(foundClub, false);
          } else if (rows?.length == 1 && this.autoSelect()) {
            this.selectClub(rows[0].id, false);
          }

          // if no club is selected and the user has clubs, pick the first one
          else if (user?.clubs && this.autoSelect()) {
            const clubIds = user?.clubs
              ?.filter(
                (c) =>
                  moment(c.clubMembership?.start).isBefore(moment()) &&
                  c.clubMembership?.active &&
                  c.clubMembership?.membershipType == ClubMembershipType.NORMAL,
              )
              ?.map((r) => r.id);

            if (clubIds) {
              const foundClub = this.clubs?.find((r) => clubIds.includes(r.id))?.id ?? null;

              if (foundClub) {
                this.selectClub(foundClub, false);
              }
            }
          }

          // disable if there is only one club
          if (rows.length == 1) {
            this.internalControl?.disable();
          }
        }
      });

    this.filteredClubs$ = this.internalControl?.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(undefined),
      map((value) => this._filter(value)),
    );

    // on startup and control is filled in, when the clubs are loaded select the club
    if (this.internalControl?.value) {
      this.#clubs
        .pipe(
          filter((r) => r != null),
          take(1),
          takeUntil(this.destroy$),
        )
        .subscribe(() => {
          this.selectClub(this.internalControl?.value, false);
        });
    }
  }

  selectClub(
    event?: MatAutocompleteSelectedEvent | MatSelectChange | string | null,
    removeOtherParams = true,
  ) {
    let id: string | undefined;
    if (event instanceof MatAutocompleteSelectedEvent) {
      id = event.option.value;
    } else if (event instanceof MatSelectChange) {
      id = event.value.id;
    } else {
      id = event as string;
    }
    if (!id) {
      return;
    }

    this.internalControl?.setValue(id);

    if (this.updateUrl() && id) {
      this._updateUrl(id, removeOtherParams);
    }
  }

  private _updateUrl(clubId: string, removeOtherParams = false) {
    if (this.updateUrl() && clubId) {
      const queryParams: { [key: string]: string | undefined } = {
        [this.controlName()]: clubId,
      };

      if (removeOtherParams) {
        queryParams['team'] = undefined;
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

  private _getClubs(): Observable<Club[]> {
    return this.apollo
      .query<{
        clubs: {
          count: number;
          rows: Club[];
        };
      }>({
        query: gql`
          query GetClubs {
            clubs {
              count
              rows {
                id
                name
                slug
                clubId
              }
            }
          }
        `,
      })
      .pipe(
        transferState(`clubsKey`, this.transferState, this.platformId),
        map((result) => {
          if (!result?.data.clubs) {
            throw new Error('No clubs');
          }
          return result.data.clubs.rows.map((c) => new Club(c));
        }),
        first(),
      );
  }

  private _filter(value?: string | Club | null): Club[] {
    if (value == null) {
      return this.clubs ?? [];
    }
    let filterValue = '';

    if (value instanceof Club) {
      filterValue = value.id ?? '';
    } else {
      filterValue = value?.toLowerCase();
    }

    return (this.clubs ?? []).filter(
      (option) =>
        option?.name?.toLowerCase().includes(filterValue) ||
        (filterValue.length == 16 && option.id?.toLowerCase().includes(filterValue)),
    );
  }

  displayFn(value?: string | Club): string {
    if (value instanceof Club) {
      return value?.name ?? '';
    } else {
      return this.clubs?.find((r) => r.id === value)?.name ?? value ?? '';
    }
  }
}
