import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DetailTournamentComponent } from './pages';
import { DetailDrawTournamentComponent } from './pages/detail-draw';

const routes: Routes = [
  {
    path: ':id',
    children: [
      {
        path: '',
        component: DetailTournamentComponent,
      },
      {
        path: ':drawId',
        component: DetailDrawTournamentComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class tournamentRoutingModule {}
