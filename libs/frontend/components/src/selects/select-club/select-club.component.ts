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
  Observable,
  Subject,
  combineLatest,
  first,
  map,
  of,
  startWith,
  switchMap,
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

  clubs!: Club[];

  filteredClubs?: Observable<Club[]>;

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

    this.filteredClubs = this.control?.valueChanges.pipe(
      startWith(this.control.value ?? ''),
      map((value) => this._filter(value))
    );

    combineLatest([
      this._getClubs(),
      this.claimSerice.hasAllClaims$([`*_${this.singleClubPermission}`]),
      this.claimSerice.hasAllClaims$([`${this.allClubPermission}`]),
      this.authService.user$.pipe(startWith(undefined)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([allClubs, all, , user]) => {
          if (this.needsPermission && !all) {
            return this.claimSerice.claims$.pipe(
              map((r) =>
                r?.filter((x) => x?.indexOf(this.singleClubPermission) != -1)
              ),
              map((r) =>
                r?.map((c) => c?.replace(`_${this.singleClubPermission}`, ''))
              ),
              switchMap((ids) => {
                const filtered = allClubs.filter((c) => {
                  if (c.id == null) {
                    return false;
                  }
                  return ids?.indexOf(c.id) != -1;
                });

                return of({ rows: filtered, count: filtered.length, user });
              })
            );
          }

          return of({ rows: allClubs, count: allClubs.length, user });
        })
      )
      .subscribe((result) => {
        const params = this.activatedRoute.snapshot.queryParams;
        let foundClub: Club | null = null;
        this.clubs = result.rows?.sort((a, b) =>
          `${a?.name}`.localeCompare(`${b?.name}`)
        );

        if (this.clubs.length <= 0) {
          this.control?.disable();
          return;
        }

        if (params && params['club']) {
          foundClub =
            this.clubs.find(
              (r) => r.slug === params['club'] || r.id === params['club']
            ) ?? null;
        }

        if (foundClub == null) {
          const clubIds = result.user?.clubs
            ?.filter((c) => c.clubMembership?.end == null)
            ?.map((r) => r.id);
          if (clubIds) {
            foundClub = this.clubs.find((r) => clubIds.includes(r.id)) ?? null;
          }
        }

        if (foundClub == null && this.clubs.length == 1) {
          foundClub = this.clubs[0];
          this.control?.disable();
        }

        setTimeout(() => {
          if (foundClub && foundClub?.id) {
            this.control?.setValue(foundClub.id);
            this._updateUrl(foundClub.id);
          }
        });
      });
  }

  selectClub(event: MatAutocompleteSelectedEvent | MatSelectChange) {
    let id: string;
    if (event instanceof MatAutocompleteSelectedEvent) {
      id = event.option.value;
    } else if (event instanceof MatSelectChange) {
      id = event.value.id;
    } else {
      return;
    }

    if (this.updateUrl && id) {
      this._updateUrl(id, true);
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
      return this.clubs?.find((r) => r.id === value)?.name ?? '';
    }
  }

  ngOnDestroy() {
    this.group?.removeControl(this.controlName);

    this.destroy$.next();
    this.destroy$.complete();
  }
}
