import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewPageComponent } from './pages/overview';
import { AuthGuard } from '@badman/frontend-auth';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    component: OverviewPageComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['change:job'],
      },
    },
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [],
})
export class JobModule {}

// @NgModule({
//   declarations: [],
//   providers: [JobsService],
// })
// export class PublicJobModule {}
