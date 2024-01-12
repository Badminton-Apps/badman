import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  Input,
  OnInit,
  Signal,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  EventCompetition,
  EventEntry,
  Location,
} from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { map, switchMap } from 'rxjs';

import {
  GoogleMapsModule,
  MapInfoWindow,
  MapMarker,
} from '@angular/google-maps';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';

@Component({
  selector: 'badman-competition-map',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMapsModule,
    MatProgressBarModule,
    MatCheckboxModule
],
  templateUrl: './competition-map.component.html',
  styleUrls: ['./competition-map.component.scss'],
  providers: [provideAnimations()],
})
export class CompetitionMapComponent implements OnInit {
  @ViewChild(MapInfoWindow) infoWindow?: MapInfoWindow;

  // injects
  private apollo = inject(Apollo);
  private injector = inject(Injector);

  // signals
  locations?: Signal<Location[] | undefined>;
  eventCompetition?: Signal<EventCompetition | undefined>;
  subEvents = signal<string[]>([]);
  clubIds?: Signal<string[] | undefined>;

  loading = signal(false);
  center = computed(() => {
    const locations = this.locations?.();
    if (!locations?.length) {
      return { lat: 0, lng: 0 };
    }
    const lat = locations.reduce((prev, curr) => {
      if (!curr.coordinates?.latitude) {
        return prev;
      }

      return prev + curr.coordinates?.latitude;
    }, 0);
    const lng = locations.reduce((prev, curr) => {
      if (!curr.coordinates?.longitude) {
        return prev;
      }
      return prev + curr.coordinates.longitude;
    }, 0);
    return { lat: lat / locations.length, lng: lng / locations.length };
  });

  selectedLocation = signal<Location | undefined>(undefined);

  // Inputs
  @Input({ required: true }) eventId?: string;

  ngOnInit(): void {
    this.eventCompetition = toSignal(
      this.apollo
        .watchQuery<{ eventCompetition: Partial<EventCompetition> }>({
          query: gql`
            query GetSubEvents($id: ID!) {
              eventCompetition(id: $id) {
                id
                name
                season
                subEventCompetitions {
                  id
                  name
                  level
                  eventType
                }
              }
            }
          `,
          variables: {
            id: this.eventId,
          },
        })
        .valueChanges.pipe(
          map((res) => new EventCompetition(res.data.eventCompetition)),
        ),
      {
        injector: this.injector,
      },
    );

    this.locations = toSignal(
      toObservable(this.subEvents, {
        injector: this.injector,
      }).pipe(
        switchMap((subEvents) =>
          this.apollo.query<{
            eventEntries: EventEntry[];
          }>({
            query: gql`
              query GetTeams($where: JSONObject) {
                eventEntries(where: $where) {
                  id
                  team {
                    id
                    club {
                      id
                      name
                    }
                  }
                }
              }
            `,
            variables: {
              where: {
                subEventId: subEvents,
              },
            },
          }),
        ),
        map((res) => res.data.eventEntries),
        map((eventEntries) => {
          const clubIds = new Set(
            eventEntries.map((eventEntry) => eventEntry.team?.club?.id),
          );
          return [...clubIds] as string[];
        }),
        switchMap((clubIds) =>
          this.apollo.query<{
            locations: Partial<Location[]>;
          }>({
            query: gql`
              query GetLocation(
                $where: JSONObject
                $availibilitiesWhere: JSONObject
              ) {
                locations(where: $where) {
                  id
                  name
                  city
                  postalcode
                  street
                  streetNumber
                  club {
                    id
                    name
                  }
                  coordinates {
                    latitude
                    longitude
                  }
                  availibilities(where: $availibilitiesWhere) {
                    id
                  }
                }
              }
            `,
            variables: {
              where: {
                clubId: clubIds,
              },
              availibilitiesWhere: {
                season: 2023,
              },
            },
          }),
        ),
        map((res) => res.data.locations),
        map((locations) => locations.map((location) => new Location(location))),
        map((locations) =>
          locations.filter((location) => location.availibilities?.length > 0),
        ),
      ),
      {
        injector: this.injector,
      },
    ) as Signal<Location[]>;

    effect(
      () => {
        if (!this.eventCompetition?.()) {
          return;
        }

        this.subEvents.set(
          (this.eventCompetition?.()?.subEventCompetitions?.map(
            (subEvent) => subEvent.id,
          ) ?? []) as string[],
        );
      },
      {
        injector: this.injector,
        allowSignalWrites: true,
      },
    );
  }

  getLatLng(location: Location): google.maps.LatLngLiteral {
    return {
      lat: location.coordinates?.latitude || 0,
      lng: location.coordinates?.longitude || 0,
    };
  }

  openInfoWindow(marker: MapMarker, location: Location) {
    this.selectedLocation.set(location);
    this.infoWindow?.open(marker);
  }

  selectSubEvent(subEventId: string, event: MatCheckboxChange) {
    if (event.checked) {
      this.subEvents.set([...this.subEvents(), subEventId]);
    } else {
      this.subEvents.set(this.subEvents().filter((id) => id !== subEventId));
    }
  }
}
