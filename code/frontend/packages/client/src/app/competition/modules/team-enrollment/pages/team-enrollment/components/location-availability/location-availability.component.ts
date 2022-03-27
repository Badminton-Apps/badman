import { Component, Input, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Club, Location } from 'app/_shared';
import { map, Observable } from 'rxjs';

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
    console.log('year', this.year);


    this.locations$ = this.apollo
      .query<{ locations: Partial<Location>[] }>({
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
      .pipe(map((result) => result.data.locations.map((location) => new Location(location))));
  }
}
