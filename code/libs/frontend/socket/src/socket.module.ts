import { Injector, NgModule } from '@angular/core';
import { SocketInternalModule } from './internal-socket.module';
import { SocketService } from './services';

@NgModule({
  declarations: [],
  imports: [SocketInternalModule],
  exports: [],
  providers: [SocketService],
})
export class SocketModule {
  constructor(private injector: Injector) {
    AppInjector = this.injector;
  }
}

export let AppInjector: Injector;