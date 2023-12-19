import { Injectable, Signal, inject } from '@angular/core';
import { Service } from '@badman/frontend-models';
import { EVENTS } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { Socket } from 'ngx-socket-io';
import { signalSlice } from 'ngxtension/signal-slice';
import { merge } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ServicesState {
  services: Service[];
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  socket = inject(Socket);
  apollo = inject(Apollo);

  initialState: ServicesState = {
    services: [],
    loaded: false,
  };

  // sources
  private servicesLoaded$ = this.apollo
    .query<{
      services: Service[];
    }>({
      query: gql`
        query {
          services {
            id
            name
            status
          }
        }
      `,
    })
    .pipe(
      map((res) => res.data?.services?.map((item) => new Service(item)) ?? []),
    );

  starting$ = (state: Signal<ServicesState>) =>
    this.socket.fromEvent<{ id: string }>(EVENTS.SERVICE.SERVICE_STARTING).pipe(
      map((service) => {
        if (!service.id) {
          console.warn(
            `No service id found in ${EVENTS.SERVICE.SERVICE_STARTING} event`,
          );
        }

        return ({
          services: state().services.map((item) => item.id === service.id
            ? { ...item, status: 'starting' as const }
            : item
          ),
        });
      }),
    );

  started$ = (state: Signal<ServicesState>) =>
    this.socket.fromEvent<{ id: string }>(EVENTS.SERVICE.SERVICE_STARTED).pipe(
      map((service) => {
        if (!service.id) {
          console.warn(
            `No service id found in ${EVENTS.SERVICE.SERVICE_STARTED} event`,
          );
        }

        return {
          services: state().services.map((item) =>
            item.id === service.id
              ? { ...item, status: 'started' as const }
              : item,
          ),
        };
      }),
    );

  stopped$ = (state: Signal<ServicesState>) =>
    this.socket.fromEvent<{ id: string }>(EVENTS.SERVICE.SERVICE_STOPPED).pipe(
      map((service) => {
        if (!service.id) {
          console.warn(
            `No service id found in ${EVENTS.SERVICE.SERVICE_STOPPED} event`,
          );
        }
        return {
          services: state().services.map((item) =>
            item.id === service.id
              ? { ...item, status: 'stopped' as const }
              : item,
          ),
        };
      }),
    );
  sources$ = merge(
    this.servicesLoaded$.pipe(
      map((services) => ({
        services,
        loaded: true,
      })),
    ),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$, this.starting$, this.started$, this.stopped$],
  });

  constructor() {}
}
