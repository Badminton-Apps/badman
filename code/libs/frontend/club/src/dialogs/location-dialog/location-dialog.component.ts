import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, lastValueFrom, Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Club, LocationService, Location } from '../../../_shared';

@Component({
  templateUrl: './location-dialog.component.html',
  styleUrls: ['./location-dialog.component.scss'],
})
export class LocationDialogComponent implements OnInit {
  selectedYear?: number;

  location$?: Observable<Location>;

  update$ = new BehaviorSubject(0);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { location: Location; club: Club, compYears: number[] },
    private locationService: LocationService,
  ) {}

  ngOnInit(): void {
    if (!this.data.location) {
      throw new Error('No location');
    }

    this.location$ = this.update$.pipe(
      startWith(0),
      switchMap(() => {
        if (this.data.location.id) {
          return this.locationService.getLocation(this.data.location.id);
        } else {
          return of(null);
        }
      }),
      map((t) => t ?? new Location())
    );
  }

  async create() {
    if (!this.data.club?.id) {
      throw new Error('No club');
    }

    const newlocation = await lastValueFrom(
      this.locationService.addLocation(this.data.location, this.data.club.id)
    );
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
