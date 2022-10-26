import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@badman/frontend-authentication';

const routes: Routes = [
  {
    path: 'notifications',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('@badman/frontend-notifications').then(
        (m) => m.NotificationsModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
