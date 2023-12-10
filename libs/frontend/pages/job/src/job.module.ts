import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewPageComponent } from './pages/overview';
import { JobsService } from './services';

const MODULE_ROUTES: Routes = [
  {
    path: '',
    component: OverviewPageComponent,
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  declarations: [],
  providers: [JobsService],
})
export class JobModule {}

// @NgModule({
//   declarations: [],
//   providers: [JobsService],
// })
// export class PublicJobModule {}