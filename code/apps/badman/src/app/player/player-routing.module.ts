import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './../_shared';
import {
  EditPlayerComponent,
  PlayerComponent,
  TopPlayersComponent,
} from './page';
import { RankingBreakdownComponent } from './page/ranking-breakdown/ranking-breakdown.component';

const routes: Routes = [
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
