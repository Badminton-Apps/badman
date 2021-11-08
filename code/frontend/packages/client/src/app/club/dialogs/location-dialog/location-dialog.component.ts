import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Club, Player, SystemService, Location, LocationService } from 'app/_shared';
import { BehaviorSubject, Observable, of, lastValueFrom } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './location-dialog.component.html',
  styleUrls: ['./location-dialog.component.scss'],
})
export class LocationDialogComponent implements OnInit {
  location$!: Observable<Location>;

  update$ = new BehaviorSubject(0);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { location: Location; club: Club },
    private locationService: LocationService
  ) {}

  ngOnInit(): void {
    this.location$ = this.update$.pipe(
      startWith(0),
      switchMap((system) => {
        if (this.data.location?.id) {
          return this.locationService.getLocation(this.data.location?.id);
        } else {
          return of(null);
        }
      }),
      map((t) => t ?? new Location())
    );
  }

  async create() {
    const newlocation = await lastValueFrom(this.locationService.addLocation(this.data.location, this.data.club.id!));
    this.data.location = newlocation;
    this.update$.next(0);
  }

  async update(location: Location) {
    if (location?.id) {
      await this.locationService.updateLocation(location).toPromise();

      this.update$.next(0);
    } else {
      this.data.location = location;
    }
  }
}
