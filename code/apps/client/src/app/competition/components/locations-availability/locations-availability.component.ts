import { Component, EventEmitter, Input, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { Club, Location } from '../../../_shared';

@Component({
  selector: 'badman-locations-availability',
  templateUrl: './locations-availability.component.html',
})
export class LocationsAvailabilityComponent implements OnInit {
  @Input()
  club!: Club;

  @Input()
  year!: number;

  locations$!: Observable<Location[]>;

  @Input()
  whenChangedFocus?: EventEmitter<void>;

  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    this.locations$ = this.apollo
      .query<{ locations: Partial<Location>[] }>({
        query: gql`
          query getLocationAvailability($clubId: ID!, $year: Int!) {
            locations(where: { clubId: $clubId }) {
              id
              name
            }
          }
        `,
        variables: {
          clubId: this.club.id,
          year: this.year,
        },
      })
      .pipe(
        map((result) =>
          result.data.locations.map((location) => new Location(location))
        )
        // switchMap((locations) => {
        //   const curr = locations as Location[];
        //   const toCreateDays: Observable<Availability>[] = [];

        //   for (const loc of curr) {
        //     if (!loc?.id) {
        //       continue;
        //     }
        //     // If no availibilties are found, create one
        //     if (!loc.availibilities || loc.availibilities.length === 0) {
        //       toCreateDays.push(this.addAvailabilityDay(loc.id));
        //     }
        //   }

        //   if (toCreateDays.length > 0) {
        //     return combineLatest(toCreateDays).pipe(
        //       take(1),
        //       map((newAvailibilties) => {
        //         for (const newAvailibilty of newAvailibilties) {
        //           const location = curr.find(
        //             (location) => location.id === newAvailibilty.locationId
        //           );
        //           if (!location) {
        //             throw new Error('Location not found');
        //           }
        //           location.availibilities.push(newAvailibilty);
        //         }

        //         return curr;
        //       })
        //     );
        //   }

        //   return of(curr);
        // })
      );
  }
}
