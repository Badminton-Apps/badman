import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import { Club } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
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
  templateUrl: './select-club.component.html',
  styleUrls: ['./select-club.component.scss'],
})
export class SelectClubComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormControl<string | null | undefined>;

  @Input()
  controlName = 'club';

  @Input()
  singleClubPermission!: string;

  @Input()
  allClubPermission!: string;

  @Input()
  needsPermission = false;

  @Input()
  updateUrl = false;

  #clubs = new BehaviorSubject<Club[] | null>(null);
  get clubs() {
    return this.#clubs.value;
  }
  filteredClubs$?: Observable<Club[]>;

  @Input()
  useAutocomplete: true | false | 'auto' = 'auto';

  @Input()
  autoCompleteTreshold = 5;

  constructor(
    private apollo: Apollo,
    private claimSerice: ClaimService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthenticateService
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

    combineLatest([
      this._getClubs(),
      this.claimSerice.hasAllClaims$([`*_${this.singleClubPermission}`]),
      this.claimSerice.hasAllClaims$([`${this.allClubPermission}`]),
      this.authService.user$.pipe(startWith(undefined)),
      this.activatedRoute.queryParamMap,
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([allClubs, , all, user, params]) => {
          console.log(all, user, params);

          if (this.needsPermission && !all) {
            return this.claimSerice.claims$.pipe(
              map((r) =>
                r?.filter((x) => x?.indexOf(this.singleClubPermission) != -1)
              ),
              map((r) =>
                r?.map((c) => c?.replace(`_${this.singleClubPermission}`, ''))
              ),
              switchMap((ids) => {
                console.log(ids);

                const filtered = allClubs.filter((c) => {
                  if (c.id == null) {
                    return false;
                  }
                  return ids?.indexOf(c.id) != -1;
                });

                if (filtered.length < this.autoCompleteTreshold) {
                  this.useAutocomplete = false;
                }

                if (filtered.length == 1) {
                  this.control?.disable();
                  this.control?.setValue(filtered[0].id);
                } 

                return of({
                  rows: filtered,
                  count: filtered.length,
                  user,
                  params,
                });
              })
            );
          }

          return of({ rows: allClubs, count: allClubs.length, user, params });
        })
      )
      .subscribe(({ rows, user, params }) => {
        this.#clubs.next(rows ?? null);

        if (this.control?.value == null) {
          const paramClubId = params.get('club');

          if (paramClubId) {
            this.selectClub(paramClubId, false);
            return;
          }

          // if no club is selected and the user has clubs, pick the first one
          if (user?.clubs) {
            const clubIds = user?.clubs
              ?.filter((c) => c.clubMembership?.end == null)
              ?.map((r) => r.id);

            if (clubIds) {
              this.selectClub(
                this.clubs?.find((r) => clubIds.includes(r.id))?.id ?? null,
                false
              );
            }
          }
        }
      });

    this.filteredClubs$ = this.control?.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(undefined),
      map((value) => this._filter(value))
    );

    // on startup and control is filled in, when the clubs are loaded select the club
    if (this.control?.value) {
      this.#clubs
        .pipe(
          filter((r) => r != null),
          take(1)
        )
        .subscribe(() => {
          this.selectClub(this.control?.value, false);
        });
    }
  }

  selectClub(
    event?: MatAutocompleteSelectedEvent | MatSelectChange | string | null,
    removeOtherParams = true
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

    this.control?.setValue(id);

    if (this.updateUrl && id) {
      this._updateUrl(id, removeOtherParams);
    }
  }

  private _updateUrl(clubId: string, removeOtherParams = false) {
    if (this.updateUrl && clubId) {
      const queryParams: { [key: string]: string | undefined } = {
        club: clubId,
      };

      if (removeOtherParams) {
        queryParams['team'] = undefined;
        queryParams['encounter'] = undefined;
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
              }
            }
          }
        `,
      })
      .pipe(
        transferState(`clubsKey`),
        map((result) => {
          if (!result?.data.clubs) {
            throw new Error('No clubs');
          }
          return result.data.clubs.rows.map((c) => new Club(c));
        }),
        first()
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
        (filterValue.length == 16 &&
          option.id?.toLowerCase().includes(filterValue))
    );
  }

  displayFn(value?: string | Club): string {
    if (value instanceof Club) {
      return value?.name ?? '';
    } else {
      return this.clubs?.find((r) => r.id === value)?.name ?? value ?? '';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
