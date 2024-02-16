import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailPageComponent, EditPageComponent, OverviewPageComponent } from './pages';
import { RankingSystemResolver } from './resolvers';

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
