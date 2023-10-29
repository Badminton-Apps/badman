import { InjectionToken, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RankingSystemResolver } from './resolvers';
import {
  DetailPageComponent,
  OverviewPageComponent,
  EditPageComponent,
} from './pages';
import { IRankingConfig } from './interfaces';

export const RANKING_CONFIG = new InjectionToken<IRankingConfig>(
  'RANKING_CONFIG',
);

const MODULE_ROUTES: Routes = [
  {
    path: '',
    component: OverviewPageComponent,
  },
  {
    path: ':id',
    children: [
      {
        path: '',
        component: DetailPageComponent,
        resolve: {
          rankingSystem: RankingSystemResolver,
        },
      },
      {
        path: 'edit',
        component: EditPageComponent,
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [RankingSystemResolver],
})
export class RankingModule {}
