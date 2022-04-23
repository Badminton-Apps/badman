import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { OverviewJobsComponent } from './pages/overview-jobs/overview-jobs.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: OverviewJobsComponent,
        canActivate: [AuthGuard],
        data: {
          claims: {
            all: 'change:job',
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
export class JobRoutingModule {}
