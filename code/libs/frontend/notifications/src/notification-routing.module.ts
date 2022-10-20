import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditSettingsComponent } from './pages';

const routes: Routes = [{ path: '', component: EditSettingsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NotificationRoutingModule {}
