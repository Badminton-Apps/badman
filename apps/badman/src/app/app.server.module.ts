import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
@NgModule({
  imports: [AppModule, ServerModule, NoopAnimationsModule],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
