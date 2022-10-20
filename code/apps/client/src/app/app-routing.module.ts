import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RankingShellComponent } from '@badman/frontend-shared';

const routes: Routes = [
  {
    path: '',
    component: RankingShellComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('@badman/frontend-info').then((m) => m.InfoModule),
      },

      // {
      //   path: 'admin',
      //   loadChildren: () =>
      //     import('@badman/frontend-admin').then((m) => m.AdminModule),
      // },
      {
        path: 'player',
        loadChildren: () =>
          import('@badman/frontend-player').then((m) => m.PlayerModule),
      },
      {
        path: 'club',
        loadChildren: () =>
          import('@badman/frontend-club').then((m) => m.ClubModule),
      },
      {
        path: 'tournament',
        loadChildren: () =>
          import('@badman/frontend-tournament').then((m) => m.tournamentModule),
      },
      {
        path: 'competition',
        loadChildren: () =>
          import('@badman/frontend-competition').then(
            (m) => m.CompetitionModule
          ),
      },
      {
        path: 'event',
        loadChildren: () =>
          import('@badman/frontend-event').then((m) => m.EventModule),
      },
      {
        path: 'training',
        loadChildren: () =>
          import('@badman/frontend-training').then((m) => m.TrainingModule),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('@badman/frontend-notifications').then(
            (m) => m.NotificationsModule
          ),
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
