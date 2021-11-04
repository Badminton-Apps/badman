import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Player, Location } from './../../models';

import * as locationQuery from '../../graphql/locations/queries/GetLocationQuery.graphql';
import * as locationsQuery from '../../graphql/locations/queries/GetLocationsQuery.graphql';

import * as addLocationMutation from '../../graphql/locations/mutations/addLocation.graphql';
import * as updateLocationMutation from '../../graphql/locations/mutations/updateLocation.graphql';
import * as deleteLocationMutation from '../../graphql/locations/mutations/removeLocation.graphql';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  constructor(private apollo: Apollo) {}

  getLocation(locationId: string, rankingType?: string) {
    return this.apollo
      .query<{ location: Location }>({
        query: locationQuery,
        variables: {
          id: locationId,
          rankingType,
        },
        fetchPolicy: 'network-only'
      })
      .pipe(map((x) => new Location(x.data.location)));
  }
  getLocations(where?: { [key: string]: any }) {
    return this.apollo
      .query<{ locations: Location[] }>({
        query: locationsQuery,
        variables: {
          where,
        },
        fetchPolicy: 'network-only'
      })
      .pipe(map((x) => x.data.locations.map((l) => new Location(l))));
  }

  addLocation(location: Location, clubId: string) {
    return this.apollo
      .mutate<{ addLocation: Location }>({
        mutation: addLocationMutation,
        variables: {
          location: { ...location },
          clubId,
        },
      })
      .pipe(map((x) => new Location(x.data.addLocation)));
  }

  updateLocation(location: Partial<Location>) {
    return this.apollo
      .mutate<{ updateLocation: Location }>({
        mutation: updateLocationMutation,
        variables: {
          location,
        },
      })
      .pipe(map((x) => new Location(x.data.updateLocation)));
  }

  deleteLocation(locationId: string) {
    return this.apollo.mutate<{ removeLocation: Location }>({
      mutation: deleteLocationMutation,
      variables: {
        locationId,
      },
    });
  }
}
