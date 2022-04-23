import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './../_shared';
import {
  EditPlayerComponent,
  LinkAccountComponent,
  PlayerComponent,
  RankingBreakdownComponent,
  TopPlayersComponent,
} from './pages';

const routes: Routes = [
  { path: 'top', component: TopPlayersComponent },
  {
    path: 'link-accounts',
    component: LinkAccountComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        all: 'merge:player',
      },
    },
  },
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
      {
        path: 'ranking/:type',
        component: RankingBreakdownComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlayerRoutingModule {}
