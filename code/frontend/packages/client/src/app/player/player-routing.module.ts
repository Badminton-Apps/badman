import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './../_shared';
import { EditPlayerComponent, PlayerComponent, ProfileComponent, TopPlayersComponent } from './page';

const routes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  { path: 'top', component: TopPlayersComponent },
  {
    path: ':id',
    children: [
      {
        path: '',
        component: PlayerComponent,
      },
      {
        path: 'edit',
        component: EditPlayerComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlayerRoutingModule {}
