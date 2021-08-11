import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Club } from 'app/_shared';
import { AuthService, ClubService } from 'app/_shared/services';
import { combineLatest, concat, Observable, of } from 'rxjs';
import { filter, map, startWith, switchMap, take, tap } from 'rxjs/operators';

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
  formGroup: FormGroup;

  @Input()
  singleClubPermission: string;

  @Input()
  allClubPermission: string;

  formControl = new FormControl(null, [Validators.required]);
  options: Club[];

  constructor(
    private clubService: ClubService,
    private authSerice: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.formGroup.addControl(this.controlName, this.formControl);

    this.options = await combineLatest([
      this.authSerice.hasAllClaims$([`*_${this.singleClubPermission}`]),
      this.authSerice.hasAllClaims$([`${this.allClubPermission}`]),
    ])
      .pipe(
        switchMap(([single, all]) => {
          console.log(this.singleClubPermission, this.allClubPermission, single, all);
          if (all) {
            return this.clubService.getClubs({ first: 999 });
          } else if (single) {
            return this.authSerice.userPermissions$.pipe(
              map((r) => r.filter((x) => x.indexOf(this.singleClubPermission) != -1)),
              map((r) => r.map((c) => c.replace(`_${this.singleClubPermission}`, ''))),
              switchMap((ids) => this.clubService.getClubs({ ids, first: ids.length }))
            );
          } else {
            return of({ clubs: null });
          }
        }),
        take(1),
        map((data) => {
          const count = data?.clubs?.total || 0;
          if (count) {
            return data?.clubs.edges.map((x) => new Club(x.node))?.sort((a, b) => a.name.localeCompare(b.name));
          } else {
            return [];
          }
        })
      )
      .toPromise();

    console.log(this.options);

    // // Get all where the user has rights
    // this.options = await this.authSerice.userPermissions$
    //   .pipe(
    //     take(1),
    //     map((r) => r.filter((x) => x.indexOf(this.permission) != -1)),
    //     map((r) => r.map((c) => c.replace(`_${this.permission}`, ''))),
    //     switchMap((ids) => this.clubService.getClubs({ ids, first: ids.length })),
    //     map((data) => {
    //       const count = data.clubs?.total || 0;
    //       if (count) {
    //         return data.clubs.edges.map((x) => new Club(x.node));
    //       } else {
    //         return [];
    //       }
    //     })
    //   )
    //   .toPromise();

    this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { club: r.id },
        queryParamsHandling: 'merge',
      });
    });

    const params = this.activatedRoute.snapshot.queryParams;
    if (params && params.club && this.options.length > 0) {
      const foundClub = this.options.find((r) => r.id == params.club);
      if (foundClub) {
        this.formControl.setValue(foundClub);
      } else {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { club: undefined, team: undefined, encounter: undefined },
          queryParamsHandling: 'merge',
        });
      }
    }

    if (this.options.length == 1) {
      this.formControl.setValue(this.options[0]);
      this.formControl.disable();
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}
