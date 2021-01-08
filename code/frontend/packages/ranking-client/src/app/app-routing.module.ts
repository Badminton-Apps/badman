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
        path: 'toernament',
        loadChildren: () =>
          import('./toernament/toernament.module').then(
            (m) => m.ToernamentModule
          ),
      },
      {
        path: 'competition',
        loadChildren: () =>
          import('./competition/competition.module').then(
            (m) => m.CompetitionModule
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
