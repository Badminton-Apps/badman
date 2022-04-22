import { Component, Input, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { apolloCache } from 'app/graphql.module';
import { Availability, AvailabilityDay, AvailabilityException, Club, Location } from 'app/_shared';
import { combineLatest, lastValueFrom, map, merge, Observable, of, switchMap, take, tap, withLatestFrom } from 'rxjs';

@Component({
  selector: 'app-location-availability',
  templateUrl: './location-availability.component.html',
  styleUrls: ['./location-availability.component.scss'],
})
export class LocationAvailabilityComponent implements OnInit {
  @Input()
  club!: Club;

  @Input()
  year!: number;

  locations$!: Observable<Location[]>;
  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    this.locations$ = this.apollo
      .query<{ locations: Partial<Location>[] }>({
        query: gql`
          query getLocationAvailability($clubId: ID!, $year: Int!) {
            locations(where: { clubId: $clubId }) {
              id
              name
              availibilities(where: { year: $year }) {
                id
                year
                days {
                  courts
                  day
                  endTime
                  startTime
                }
                exceptions {
                  courts
                  start
                  end
                }
              }
            }
          }
        `,
        variables: {
          clubId: this.club.id,
          year: this.year,
        },
      })
      .pipe(
        map((result) => result.data.locations.map((location) => new Location(location))),
        switchMap((locations) => {
          const curr = locations as Location[];
          const toCreateDays: Observable<Availability>[] = [];

          for (const loc of curr) {
            // If no availibilties are found, create one
            if (!loc.availibilities || loc.availibilities.length === 0) {
              toCreateDays.push(this.addAvailabilityDay(loc.id!));
            }
          }

          if (toCreateDays.length > 0) {
            console.log('Creating days')
            return combineLatest(toCreateDays).pipe(
              take(1),
              map((newAvailibilties) => {
                for (const newAvailibilty of newAvailibilties) {
                  curr
                    .find((location) => location.id === newAvailibilty.locationId)!
                    .availibilities!.push(newAvailibilty);
                }

                return curr;
              })
            );
          }

          return of(curr);
        })
      );
  }

  addAvailabilityDay(locationId: string) {
    return this.apollo
      .mutate<{ addLocationAvailibilty: Partial<Availability> }>({
        mutation: gql`
          mutation AddAvailibilty($locationId: ID!, $availibilty: AvailabilityInput) {
            addLocationAvailibilty(locationId: $locationId, availibilty: $availibilty) {
              id
              locationId
              days {
                courts
                day
                endTime
                startTime
              }
              exceptions {
                courts
                start
                end
              }
            }
          }
        `,
        variables: {
          locationId,
          availibilty: {
            year: this.year,
            days: [],
            exceptions: [],
          },
        },
      })
      .pipe(
        map((result) => new Availability(result.data?.addLocationAvailibilty)),
        tap((availability) => {
          const normalized = apolloCache.identify({
            id: availability.locationId,
            __typename: 'Location',
          });
          apolloCache.evict({ id: normalized });
          apolloCache.gc();
        })
      );
  }

  async uppdateAvailabilityDay(
    updated: AvailabilityDay | AvailabilityException,
    id: number,
    availabilityDay: Availability
  ) {
    if (id === -1) {
      if (updated instanceof AvailabilityDay) {
        availabilityDay.days!.push(updated);
      } else {
        availabilityDay.exceptions!.push(updated);
      }
    } else {
      if (updated instanceof AvailabilityDay) {
        availabilityDay.days![id] = updated;
      } else {
        availabilityDay.exceptions![id] = updated;
      }
    }

    await lastValueFrom(
      this.apollo
        .mutate<{ updateLocationAvailibilty: Partial<Availability> }>({
          mutation: gql`
            mutation updateAvailability($availibilty: AvailabilityInput!) {
              updateLocationAvailibilty(availibilty: $availibilty) {
                id
                days {
                  day
                  startTime
                  endTime
                  courts
                }
                exceptions {
                  start
                  end
                  courts
                }
              }
            }
          `,
          variables: {
            availibilty: availabilityDay,
          },
        })
        .pipe(
          tap((result) => {
            const normalizedAvailibility = apolloCache.identify({
              id: availabilityDay.id,
              __typename: 'Availability',
            });
            apolloCache.evict({ id: normalizedAvailibility });
            apolloCache.gc();
          })
        )
    );
  }

  async deleteAvailabilityDay(type: 'day' | 'exception', id: number, availabilityDay: Availability) {
    if (type === 'day') {
      availabilityDay.days!.splice(id, 1);
    } else {
      availabilityDay.exceptions!.splice(id, 1);
    }

    await lastValueFrom(
      this.apollo
        .mutate<{ updateLocationAvailibilty: Partial<Availability> }>({
          mutation: gql`
            mutation updateAvailability($availibilty: AvailabilityInput!) {
              updateLocationAvailibilty(availibilty: $availibilty) {
                id
                days {
                  day
                  startTime
                  endTime
                  courts
                }
                exceptions {
                  start
                  end
                  courts
                }
              }
            }
          `,
          variables: {
            availibilty: availabilityDay,
          },
        })
        .pipe(
          tap((result) => {
            const normalizedAvailibility = apolloCache.identify({
              id: availabilityDay.id,
              __typename: 'Availability',
            });
            apolloCache.evict({ id: normalizedAvailibility });
            apolloCache.gc();
          })
        )
    );
  }
}
