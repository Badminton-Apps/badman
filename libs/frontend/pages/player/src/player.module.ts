import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@badman/frontend-auth';
import {
  DetailPageComponent,
  EditPageComponent,
  RankingBreakdownPageComponent,
  SettingsPageComponent,
} from './pages';
import { PlayerResolver } from './resolvers/player.resolver';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'glenn-latomme',
    pathMatch: 'full',
    data: { breadcrumb: { skip: true } },
  },
  {
    path: ':id',
    children: [
      {
        path: '',
        component: DetailPageComponent,
      },
      {
        path: 'edit',
        component: EditPageComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: ['[:id]_edit:player', 'edit-any:player'],
          },
        },
      },
      {
        path: 'ranking',
        children: [
          {
            path: '',
            redirectTo: 'single',
            pathMatch: 'full',
          },
          {
            path: ':type',
            component: RankingBreakdownPageComponent,
          },
        ],
      },
      {
        path: 'settings',
        component: SettingsPageComponent,
      },
    ],
    resolve: {
      player: PlayerResolver,
    },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [PlayerResolver],
})
export class PlayerModule {}
