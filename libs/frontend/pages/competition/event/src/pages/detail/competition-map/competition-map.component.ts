import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import { EventCompetition, Location } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Subject, combineLatest, map, startWith, switchMap, tap } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  GoogleMapsModule,
  MapInfoWindow,
  MapMarker,
} from '@angular/google-maps';

@Component({
  selector: 'badman-competition-map',
  standalone: true,
  imports: [
    CommonModule,

    //  google maps
    GoogleMapsModule,

    // Material Modules
    MatProgressBarModule,
  ],
  templateUrl: './competition-map.component.html',
  styleUrls: ['./competition-map.component.scss'],
  providers: [provideAnimations()],
})
export class CompetitionMapComponent implements OnInit, OnDestroy {
  @ViewChild(MapInfoWindow) infoWindow?: MapInfoWindow;

  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  // signals
  locations?: Signal<Location[] | undefined>;
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

  destroy$ = new Subject<void>();

  typeControl = new FormControl();
  subeEventControl = new FormControl();

  // Inputs
  @Input({ required: true }) eventId?: string;

  ngOnInit(): void {
    this.locations = toSignal(
      combineLatest([
        this.typeControl.valueChanges.pipe(startWith(this.typeControl.value)),
        this.subeEventControl.valueChanges.pipe(
          startWith(this.subeEventControl.value)
        ),
      ]).pipe(
        tap(() => {
          this.loading.set(true);
        }),
        switchMap(
          ([types, subEvents]) =>
            this.apollo.watchQuery<{
              eventCompetition: Partial<EventCompetition>;
            }>({
              query: gql`
                query GetLocation($id: ID!) {
                  eventCompetition(id: $id) {
                    id
                    subEventCompetitions {
                      id
                      eventEntries {
                        id
                        team {
                          id
                          club {
                            id
                            name
                            locations {
                              id
                              name
                              city
                              postalcode
                              street
                              streetNumber
                              coordinates {
                                latitude
                                longitude
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              `,
              variables: {
                id: this.eventId,
              },
            }).valueChanges
        ),
        map((result) => new EventCompetition(result.data.eventCompetition)),
        // filter out unqiue locations
        map((eventCompetition) => {
          const locations = new Map<string, Location>();
          eventCompetition?.subEventCompetitions?.forEach((subEvent) => {
            subEvent?.eventEntries?.forEach((eventEntry) => {
              eventEntry?.team?.club?.locations?.forEach((location) => {
                if (!location.id) {
                  return;
                }
                locations.set(location.id, location);
              });
            });
          });
          return [...locations.values()];
        }),
        tap((locations) => {
          console.log(locations);

          this.loading.set(false);
        })
      ),
      { injector: this.injector }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
