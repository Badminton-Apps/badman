import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ActivatedRoute, Router } from '@angular/router';
import { Club } from 'app/_shared';
import { ClubService, UserService } from 'app/_shared/services';
import { ClaimService } from 'app/_shared/services/security/claim.service';
import { PermissionService } from 'app/_shared/services/security/permission.service';
import { combineLatest, concat, lastValueFrom, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, map, skip, startWith, switchMap, take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-select-club',
  templateUrl: './select-club.component.html',
  styleUrls: ['./select-club.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectClubComponent implements OnInit, OnDestroy {
  @Input()
  controlName = 'club';

  @Input()
  formGroup!: FormGroup;

  @Input()
  singleClubPermission!: string;

  @Input()
  allClubPermission!: string;

  @Input()
  needsPermission: boolean = false;

  @Input()
  updateUrl: boolean = false;

  formControl = new FormControl(null, [Validators.required]);
  clubs!: Club[];

  filteredClubs?: Observable<Club[]>;

  @Input()
  useAutocomplete: true | false | 'auto' = 'auto';

  @Input()
  autoCompleteTreshold = 5;

  constructor(
    private clubService: ClubService,
    private claimSerice: ClaimService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private user: UserService
  ) {}

  async ngOnInit() {
    if (this.formGroup.get(this.controlName) == null) {
      this.formGroup.addControl(this.controlName, this.formControl);
    }

    this.formGroup.valueChanges.subscribe((r) => {
      console.log('club changed 1', r);
    });

    this.filteredClubs = this.formGroup.get(this.controlName)!.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value))
    );

    this.clubs =
      (await lastValueFrom(
        combineLatest([
          this.claimSerice.hasAllClaims$([`*_${this.singleClubPermission}`]),
          this.claimSerice.hasAllClaims$([`${this.allClubPermission}`]),
          this.user.profile$,
        ]).pipe(
          switchMap(([single, all]) => {
            if (all) {
              return this.clubService.getClubs({ first: 999 });
            } else if (single) {
              return of({ clubs: [], total: 0 });
              // TODO: fix this :)
              // return this.claimSerice.userPermissions$.pipe(
              //   map((r) => r.filter((x) => x.indexOf(this.singleClubPermission) != -1)),
              //   map((r) => r.map((c) => c.replace(`_${this.singleClubPermission}`, ''))),
              //   switchMap((ids) => this.clubService.getClubs({ ids, first: ids.length }))
              // );
            } else if (this.needsPermission) {
              return of({ clubs: [], total: 0 });
            } else {
              return this.clubService.getClubs({ first: 999 });
            }
          }),
          take(1),
          map((data) => {
            const count = data?.total || 0;
            if (count) {
              if (this.useAutocomplete == 'auto') {
                this.useAutocomplete = count > this.autoCompleteTreshold;
              }
              return data?.clubs?.map((x) => new Club(x.node))?.sort((a, b) => a.name!.localeCompare(b.name!));
            } else {
              return [];
            }
          })
        )
      )) ?? [];

    if (this.updateUrl) {
      this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { club: this.clubs.find((x) => x.id === r)?.slug ?? r },
          queryParamsHandling: 'merge',
        });
      });

      const params = this.activatedRoute.snapshot.queryParams;
      let foundClub: Club | null = null;

      if (params && params['club'] && this.clubs.length > 0) {
        foundClub = this.clubs.find((r) => r.slug === params['club'] || r.id === params['club']) ?? null;
      }

      if (foundClub == null) {
        const clubIds = this.user?.profile?.clubs?.map((r) => r.id);
        if (clubIds) {
          foundClub = this.clubs.find((r) => clubIds.includes(r.id)) ?? null;
        }
      }

      if (foundClub == null && this.clubs.length == 1) {
        foundClub = this.clubs[0];
        this.formControl.disable();
      }

      if (foundClub) {
        this.formControl.setValue(foundClub.id, { onlySelf: true });
        // this.autoCompleteFormControl.setValue(foundClub, { onlySelf: true });
      } else {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { club: undefined, team: undefined, encounter: undefined },
          queryParamsHandling: 'merge',
        });
      }
    }
  }

  private _filter(value?: string | Club): Club[] {
    if (value == null) {
      return this.clubs;
    }
    let filterValue = '';

    if (value instanceof Club) {
      filterValue = value.id!;
    } else {
      filterValue = value?.toLowerCase();
    }

    return (this.clubs ?? []).filter(
      (option) => option.name?.toLowerCase().includes(filterValue) || option.id?.toLowerCase().includes(filterValue)
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
    this.formGroup.removeControl(this.controlName);
  }
}
