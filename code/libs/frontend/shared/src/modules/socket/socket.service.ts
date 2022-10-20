import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { ConfigService } from '@badman/frontend-config';
import { Socket, SocketIoConfig } from 'ngx-socket-io';

export const SOCKET_URL = new InjectionToken<string>('url');
export const SOCKET_PREFIX = new InjectionToken<string>('prefix');

@Injectable()
export class SocketService {
  static instance: SocketService;

  private services: Map<string, SocketNameSpace> = new Map();

  constructor(
    private configService: ConfigService,
    @Optional() @Inject(SOCKET_PREFIX) private prefix: string
  ) {
    SocketService.instance = this;
  }

  public getService(options?: { path?: string }): Socket {
    let suffix = options?.path ?? '';
    suffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
    const path = (this.prefix || '/socket.io') + suffix;

    let service = this.services.get(path);
    if (!service) {
      service = new SocketNameSpace({
        url: this.configService.socketUrl,
        options: {
          path,
        },
      });
      this.services.set(path, service);
    }

    return service;
  }
}

export class SocketNameSpace extends Socket {
  constructor(socketConfig: SocketIoConfig) {
    super(socketConfig);
  }
}
