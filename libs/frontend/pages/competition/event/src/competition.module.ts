import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import {
  DetailAvgPageComponent,
  DetailDrawCompetitionComponent,
  DetailEncounterComponent,
  DetailPageComponent,
  EditEncounterComponent,
  EditPageComponent,
  OverviewPageComponent,
} from './pages';
import { DrawResolver, EncounterResolver, EventResolver } from './resolvers';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    component: OverviewPageComponent,
  },
  {
    path: 'assembly',
    loadChildren: () =>
      import('@badman/frontend-team-assembly').then((module) => module.AssemblyModule),
  },
  {
    path: 'enrollment',
    loadChildren: () =>
      import('@badman/frontend-team-enrollment').then((m) => m.TeamEnrollmentModule),
  },
  {
    path: 'change-encounter',
    loadChildren: () =>
      import('@badman/frontend-change-encounter').then((m) => m.ChangeEncounterModule),
  },
  {
    path: ':id',
    resolve: {
      eventCompetition: EventResolver,
    },
    data: {
      breadcrumb: {
        alias: 'eventCompetition',
      },
    },
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
            any: ['edit:competition'],
          },
        },
      },
      {
        path: 'avg-level',
        component: DetailAvgPageComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: ['edit:competition'],
          },
        },
      },
      {
        path: 'draw/:id',
        resolve: {
          drawCompetition: DrawResolver,
        },
        data: {
          breadcrumb: {
            alias: 'drawCompetition',
          },
        },
        children: [
          {
            path: '',
            component: DetailDrawCompetitionComponent,
          },
          {
            path: 'encounter/:id',
            resolve: {
              encounterCompetition: EncounterResolver,
            },
            data: {
              breadcrumb: {
                alias: 'encounterCompetition',
              },
            },
            children: [
              {
                path: '',
                component: DetailEncounterComponent,
              },
              {
                path: 'edit',
                component: EditEncounterComponent,
              },
            ],
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  providers: [EventResolver, DrawResolver, EncounterResolver],
})
export class CompetitionModule {}
