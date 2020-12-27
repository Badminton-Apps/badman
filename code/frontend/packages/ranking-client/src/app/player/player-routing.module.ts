import { AuthGuard } from './../_shared/guards/auth/auth.guard';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProfileComponent } from './page/profile/profile.component';
import { PlayerComponent } from './page/player';
import { TopPlayersComponent } from './page/top-players/top-players.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  { path: 'top', component: TopPlayersComponent },
  { path: ':id', component: PlayerComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlayerRoutingModule {}
