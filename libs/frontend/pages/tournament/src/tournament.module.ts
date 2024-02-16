import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailDrawComponent, DetailPageComponent, OverviewPageComponent } from './pages';
import { DrawResolver, EventResolver } from './resolver';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    component: OverviewPageComponent,
  },
  {
    path: ':id',
    resolve: {
      eventTournament: EventResolver,
    },
    data: {
      breadcrumb: {
        alias: 'eventTournament',
      },
    },
    children: [
      {
        path: '',
        component: DetailPageComponent,
      },
      {
        path: 'draw/:id',
        resolve: {
          drawTournament: DrawResolver,
        },
        data: {
          breadcrumb: {
            alias: 'drawTournament',
          },
        },
        children: [
          {
            path: '',
            component: DetailDrawComponent,
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  providers: [EventResolver, DrawResolver, OverviewPageComponent, DetailPageComponent],
})
export class TournamentModule {}
