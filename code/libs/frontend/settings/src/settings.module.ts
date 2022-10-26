import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewComponent } from './pages/view/view.component';
import { SettingsRoutingModule } from './settings-routing.module';

@NgModule({
  imports: [SettingsRoutingModule, CommonModule],
  declarations: [ViewComponent],
})
export class SettingsModule {}
