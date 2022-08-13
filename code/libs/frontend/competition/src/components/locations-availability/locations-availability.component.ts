import { Component, EventEmitter, Input, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { Club, Location } from '@badman/frontend/shared';

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
      );
  }
}
