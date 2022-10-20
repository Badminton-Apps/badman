import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, lastValueFrom, Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Club, Location } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
@Component({
  templateUrl: './location-dialog.component.html',
  styleUrls: ['./location-dialog.component.scss'],
})
export class LocationDialogComponent implements OnInit {
  selectedYear?: number;

  location$?: Observable<Location>;

  update$ = new BehaviorSubject(0);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { location: Location; club: Club; compYears: number[] },
    private appollo: Apollo
  ) {}

  ngOnInit(): void {
    if (!this.data.location) {
      this.data.location = new Location();
    }

    this.location$ = this.update$.pipe(
      startWith(0),
      switchMap(() => {
        if (this.data.location.id) {
          return this.appollo
            .query<{ location: Partial<Location> }>({
              query: gql`
                query GetLocationQuery($id: ID!) {
                  location(id: $id) {
                    id
                    name
                    address
                    postalcode
                    street
                    streetNumber
                    city
                    state
                    phone
                    fax
                  }
                }
              `,
              variables: {
                id: this.data.location.id,
              },
            })
            .pipe(map((x) => new Location(x.data.location)));
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
      this.appollo
        .mutate<{ addLocation: Partial<Location> }>({
          mutation: gql`
            mutation addLocation($location: LocationInput!, $clubId: ID!) {
              addLocation(location: $location, clubId: $clubId) {
                id
                name
                address
                postalcode
                street
                streetNumber
                city
                state
                phone
                fax
              }
            }
          `,
          variables: {
            location: { ...this.data.location },
            clubId: this.data.club.id,
          },
        })
        .pipe(map((x) => new Location(x.data?.addLocation)))
    );
    this.data.location = newlocation;
    this.update$.next(0);
  }

  async update(location: Location) {
    if (location?.id) {
      await lastValueFrom(
        this.appollo.mutate<{ updateLocation: Partial<Location> }>({
          mutation: gql`
            mutation updateLocation($location: LocationInput!) {
              updateLocation(location: $location) {
                id
              }
            }
          `,
          variables: {
            location,
          },
        })
      );

      this.update$.next(0);
    } else {
      this.data.location = location;
    }
  }
}
