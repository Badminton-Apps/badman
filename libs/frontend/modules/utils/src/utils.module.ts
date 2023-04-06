import { NgModule } from '@angular/core';
import { ResizedDirective } from './resize';

@NgModule({
  declarations: [ResizedDirective],
  exports: [ResizedDirective],
})
export class UtilsModule {}
