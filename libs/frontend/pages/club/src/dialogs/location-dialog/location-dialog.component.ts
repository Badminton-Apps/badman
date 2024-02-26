import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, lastValueFrom, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Club, Location } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LocationDialogFieldsComponent } from './components';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  templateUrl: './location-dialog.component.html',
  styleUrls: ['./location-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    LocationDialogFieldsComponent,
  ],
})
export class LocationDialogComponent implements OnInit {
  selectedYear?: number;

  location?: Location;

  update$ = new BehaviorSubject(0);

  constructor(
    private dialogRef: MatDialogRef<LocationDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      location: Location;
      club: Club;
      compYears: number[];
      onCreate: 'close' | 'stay';
      onUpdate: 'close' | 'stay';
      showAvailibilities: boolean;
    },
    private appollo: Apollo,
  ) {}

  ngOnInit(): void {
    if (!this.data.location) {
      this.data.location = new Location();
    }

    this.update$
      .pipe(
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
                      coordinates {
                        latitude
                        longitude
                      }
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
        map((t) => t ?? new Location()),
      )
      .subscribe((x) => {
        this.location = x;
      });
  }

  async create(location: Location) {
    if (!this.data.club?.id) {
      throw new Error('No club');
    }

    const newlocation = await lastValueFrom(
      this.appollo
        .mutate<{ createLocation: Partial<Location> }>({
          mutation: gql`
            mutation createLocation($data: LocationNewInput!) {
              createLocation(data: $data) {
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
                coordinates {
                  latitude
                  longitude
                }
              }
            }
          `,
          variables: {
            data: {
              name: location.name,
              address: location.address,
              postalcode: location.postalcode,
              street: location.street,
              streetNumber: location.streetNumber,
              city: location.city,
              state: location.state,
              phone: location.phone,
              fax: location.fax,
              clubId: this.data.club.id,
              coordinates: {
                latitude: location.coordinates?.latitude,
                longitude: location.coordinates?.longitude,
              },
            },
          },
        })
        .pipe(map((x) => new Location(x.data?.createLocation))),
    );

    if (this.data.onCreate === 'close') {
      this.dialogRef.close(newlocation);
    } else {
      this.data.location = newlocation;
      this.update$.next(0);
    }
  }

  async update(location: Location) {
    if (location?.id) {
      const newlocation = await lastValueFrom(
        this.appollo
          .mutate<{ updateLocation: Partial<Location> }>({
            mutation: gql`
              mutation updateLocation($data: LocationUpdateInput!) {
                updateLocation(data: $data) {
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
                  coordinates {
                    latitude
                    longitude
                  }
                }
              }
            `,
            variables: {
              data: {
                id: location.id,
                name: location.name,
                address: location.address,
                postalcode: location.postalcode,
                street: location.street,
                streetNumber: location.streetNumber,
                city: location.city,
                state: location.state,
                phone: location.phone,
                fax: location.fax,
                coordinates: {
                  latitude: location.coordinates?.latitude,
                  longitude: location.coordinates?.longitude,
                },
              },
            },
          })
          .pipe(map((x) => new Location(x.data?.updateLocation))),
      );

      if (this.data.onUpdate === 'close') {
        this.dialogRef.close(newlocation);
      } else {
        this.update$.next(0);
        this.data.location = newlocation;
      }
    }
  }

  locationUpdated(location: Location) {
    this.location = location;
  }
}
