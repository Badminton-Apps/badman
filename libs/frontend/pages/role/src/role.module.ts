import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RoleResolver } from './resolvers';
import { AddPageComponent, EditPageComponent } from './pages';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'smash-for-fun-2h',
    pathMatch: 'full',
    data: { breadcrumb: { skip: true } },
  },
  {
    path: 'add',
    component: AddPageComponent,
  },
  {
    path: ':id',
    component: EditPageComponent,
    resolve: {
      role: RoleResolver,
    },
    data: {
      breadcrumb: {
        alias: 'role',
      },
    },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [RoleResolver],
})
export class RoleModule {}
