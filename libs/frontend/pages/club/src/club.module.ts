import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@badman/frontend-auth';
import { DetailPageComponent, EditPageComponent } from './pages';
import { ClubResolver } from './resolvers';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'smash-for-fun',
    pathMatch: 'full',
    data: { breadcrumb: { skip: true } },
  },
  {
    path: ':id',
    resolve: {
      club: ClubResolver,
    },
    data: {
      breadcrumb: {
        alias: 'club',
      },
    },
    children: [
      {
        path: '',
        component: DetailPageComponent,
      },

      {
        path: 'edit',
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: ['[:id]_edit:club', 'edit-any:club'],
          },
        },
        children: [
          {
            path: 'role',
            loadChildren: () => import('@badman/frontend-role').then((module) => module.RoleModule),
          },
          {
            path: '',
            component: EditPageComponent,
          },
        ],
      },

      {
        path: 'team',
        data: { breadcrumb: { skip: true } },
        loadChildren: () => import('@badman/frontend-team').then((module) => module.TeamModule),
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [ClubResolver],
})
export class ClubModule {}
