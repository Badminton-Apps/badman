import { InjectionToken, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RankingSystemResolver } from './resolvers';
import { DetailPageComponent } from './pages';
import { IRankingConfig } from './interfaces';

export const RANKING_CONFIG = new InjectionToken<IRankingConfig>('RANKING_CONFIG');

const MODULE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'primary',
    pathMatch: 'full',
    data: { breadcrumb: { skip: true } },
  },
  {
    path: ':id',
    component: DetailPageComponent,
    resolve: {
      rankingSystem: RankingSystemResolver,
    },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [RankingSystemResolver],
})
export class RankingModule {}
