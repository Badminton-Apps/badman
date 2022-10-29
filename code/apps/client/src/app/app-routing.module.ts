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
        path: 'ranking',
        loadChildren: () =>
          import('@badman/frontend-ranking').then((m) => m.RankingModule),
      },
      {
        path: 'training',
        loadChildren: () =>
          import('@badman/frontend-training').then((m) => m.TrainingModule),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@badman/frontend-settings').then((m) => m.SettingsModule),
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
