import { Injector, ModuleWithProviders, NgModule } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { SocketIoModule } from 'ngx-socket-io';
import { SocketService, SOCKET_PREFIX, SOCKET_URL } from './socket.service';

@NgModule({
  declarations: [],
  imports: [SocketIoModule.forRoot({ url: environment.api, options: {} })],
  exports: [],
  providers: [SocketService],
})
export class SocketModule {
  constructor(private injector: Injector) {
    AppInjector = this.injector;
  }
}

export let AppInjector: Injector;
