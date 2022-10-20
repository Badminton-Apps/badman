import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SocketIoModule } from 'ngx-socket-io';
import { SocketService } from './socket.service';

@NgModule({
  declarations: [],
  imports: [BrowserModule, SocketIoModule],
  exports: [],
  providers: [SocketService],
})
export class SocketModule {
  constructor(private injector: Injector) {
    AppInjector = this.injector;
  }
}

export let AppInjector: Injector;
 