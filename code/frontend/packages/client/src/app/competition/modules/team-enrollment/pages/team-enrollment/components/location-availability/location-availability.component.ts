import { Component, Input, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Availability, Club, Location } from 'app/_shared';
import { map, Observable, tap } from 'rxjs';

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

  locations$!: Observable<LocationAvailibilty[]>;

  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    this.locations$ = this.apollo
      .query<{ locations: Partial<LocationAvailibilty>[] }>({
        query: gql`
          query getLocationAvailability($clubId: ID!, $year: Int!) {
            locations(where: { clubId: $clubId }) {
              id
              name
              availibilities(where: { year: $year }) {
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
        map((l) => {
          const curr = l as LocationAvailibilty[];
          for (const loc of curr) {
            loc.availibility =
              loc.availibilities?.find((a) => a.year == this.year) ?? new Availability({ year: this.year });
          }

          return curr;
        })
      );
  }
}

interface LocationAvailibilty extends Location {
  availibility?: Availability;
}
