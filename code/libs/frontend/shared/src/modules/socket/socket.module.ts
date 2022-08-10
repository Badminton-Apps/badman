import { Injector, NgModule } from '@angular/core';
import { SocketIoModule } from 'ngx-socket-io';
import { environment } from '../../../../environments/environment';
import { SocketService } from './socket.service';

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
