import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  lastValueFrom,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { apolloCache } from '../../../graphql.module';
import {
  Availability,
  AvailabilityDay,
  AvailabilityException,
  Club,
  Location,
} from '../../../_shared';

@Component({
  selector: 'badman-location-availability',
  templateUrl: './location-availability.component.html',
  styleUrls: ['./location-availability.component.scss'],
})
export class LocationAvailabilityComponent implements OnInit, OnChanges {
  private update$ = new BehaviorSubject(null);

  @Input()
  club!: Club;

  @Input()
  year!: number;

  @Input()
  location!: Location;

  location$?: Observable<Location>;

  @Input()
  whenChangedFocus?: EventEmitter<void>;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    this.location$ = this.update$.pipe(
      switchMap(() =>
        this.apollo.query<{ location: Partial<Location> }>({
          query: gql`
            query getLocationAvailability($locationId: ID!, $year: Int!) {
              location(id: $locationId) {
                id
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
            locationId: this.location.id,
            year: this.year,
          },
        })
      ),
      map(({ data }) => new Location(data.location)),
      switchMap((loc) => {
        if (!loc.id) {
          throw new Error('Location has no id');
        }
        if (!loc.availibilities || loc.availibilities.length === 0) {
          return this.addAvailabilityDay(loc.id).pipe(
            map((availability) => {
              loc.availibilities = [availability];
              return loc;
            })
          );
        }

        return of(loc);
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    const yearChanged = changes['year'];
    if (yearChanged.previousValue != yearChanged.currentValue) {
      this.update$.next(null);
    }
  }

  addAvailabilityDay(locationId: string) {
    return this.apollo
      .mutate<{ addLocationAvailibilty: Partial<Availability> }>({
        mutation: gql`
          mutation AddAvailibilty($availibilty: AvailabilityNewInput!) {
            createAvailability(data: $availibilty) {
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
          availibilty: {
            locationId,
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
        availabilityDay.days.push(updated);
      } else {
        availabilityDay.exceptions.push(updated);
      }
    } else {
      if (updated instanceof AvailabilityDay) {
        availabilityDay.days[id] = updated;
      } else {
        availabilityDay.exceptions[id] = updated;
      }
    }

    await lastValueFrom(
      this.apollo
        .mutate<{ updateLocationAvailibilty: Partial<Availability> }>({
          mutation: gql`
            mutation updateAvailability(
              $availibilty: AvailabilityUpdateInput!
            ) {
              updateAvailability(data: $availibilty) {
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
          tap(() => {
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

  async deleteAvailabilityDay(
    type: 'day' | 'exception',
    id: number,
    availabilityDay: Availability
  ) {
    if (type === 'day') {
      availabilityDay.days.splice(id, 1);
    } else {
      availabilityDay.exceptions.splice(id, 1);
    }

    await lastValueFrom(
      this.apollo
        .mutate<{ updateLocationAvailibilty: Partial<Availability> }>({
          mutation: gql`
            mutation updateAvailability(
              $availibilty: AvailabilityUpdateInput!
            ) {
              updateAvailability(data: $availibilty) {
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
          tap(() => {
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
