import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewJobsComponent } from './pages/overview-jobs/overview-jobs.component';

const routes: Routes = [{ path: '', component: OverviewJobsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JobManagementRoutingModule {}
