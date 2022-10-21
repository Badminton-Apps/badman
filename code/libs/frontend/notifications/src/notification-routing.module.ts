import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditSettingsComponent } from './pages';
import { AuthGuard } from '@badman/frontend-authentication';

const routes: Routes = [
  { path: '', component: EditSettingsComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NotificationRoutingModule {}
