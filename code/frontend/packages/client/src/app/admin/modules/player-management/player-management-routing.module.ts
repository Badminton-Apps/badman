import { AuthGuard } from 'app/_shared';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditPlayerComponent } from './pages/edit-player/edit-player.component';

const routes: Routes = [
  {
    path: ':id/edit',
    component: EditPlayerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlayerManagementRoutingModule {}
