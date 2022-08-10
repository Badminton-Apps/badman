import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RankingShellComponent } from './_shared';

const routes: Routes = [
  {
    path: '',
    component: RankingShellComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./info/info.module').then((m) => m.InfoModule),
      },

      {
        path: 'admin',
        loadChildren: () =>
          import('./admin/admin.module').then((m) => m.AdminModule),
      },
      {
        path: 'player',
        loadChildren: () =>
          import('./player/player.module').then((m) => m.PlayerModule),
      },
      {
        path: 'club',
        loadChildren: () =>
          import('@badman/frontend/club').then((m) => m.ClubModule),
      },
      {
        path: 'tournament',
        loadChildren: () =>
          import('./tournament/tournament.module').then(
            (m) => m.tournamentModule
          ),
      },
      {
        path: 'competition',
        loadChildren: () =>
          import('./competition/competition.module').then(
            (m) => m.CompetitionModule
          ),
      },
      {
        path: 'event',
        loadChildren: () =>
          import('./event/event.module').then((m) => m.EventModule),
      },
      {
        path: 'training',
        loadChildren: () =>
          import('./training/training.module').then((m) => m.TrainingModule),
      },
    ],
  },
  { path: '**', redirectTo: '/' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
