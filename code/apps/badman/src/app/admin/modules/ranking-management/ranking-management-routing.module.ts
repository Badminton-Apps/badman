import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import {
  AddRankingSystemComponent,
  DetailRankingSystemComponent,
  EditRankingSystemComponent,
  OverviewRankingSystemsComponent,
} from './pages';

const routes: Routes = [
  { path: '', component: OverviewRankingSystemsComponent },
  {
    path: 'add',
    component: AddRankingSystemComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        all: 'add:ranking',
      },
    },
  },
  {
    path: ':id',
    children: [
      {
        path: '',
        component: DetailRankingSystemComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            all: 'view:ranking',
          },
        },
      },
      {
        path: 'edit',
        component: EditRankingSystemComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            all: 'edit:ranking',
          },
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RankingManagementRoutingModule {}
