// Modules are from https://github.com/rodgc/ngx-socket-io
// NPM install didn't work, so I copied the files into the project

import { InjectionToken, Injector, ModuleWithProviders, NgModule } from '@angular/core';
import { SocketConfig } from './config';
import { WrappedSocket } from './services';


/** Socket factory */
export function SocketFactory(config: SocketConfig) {
  return new WrappedSocket(config);
}

export const SOCKET_CONFIG_TOKEN = new InjectionToken<SocketConfig>(
  '__SOCKET_IO_CONFIG__'
);

@NgModule({})
export class SocketInternalModule {
  static forRoot(config: SocketConfig): ModuleWithProviders<SocketInternalModule> {
    return {
      ngModule: SocketInternalModule,
      providers: [
        { provide: SOCKET_CONFIG_TOKEN, useValue: config },
        {
          provide: WrappedSocket,
          useFactory: SocketFactory,
          deps: [SOCKET_CONFIG_TOKEN],
        },
      ],
    };
  }
}
