import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TeamResolver } from './resolvers';
import { DetailPageComponent } from './pages';

const MODULE_ROUTES: Routes = [
  {
    path: ':id',
    resolve: {
      team: TeamResolver,
    },
    children: [
      {
        path: '',
        component: DetailPageComponent,
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [TeamResolver],
})
export class TeamModule {}
