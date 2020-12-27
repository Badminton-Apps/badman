import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetailComponent } from './pages/detail/detail.component';
import { ImportComponent } from './pages/import/import.component';
import { OverviewComponent } from './pages/overview/overview.component';

const routes: Routes = [
  { path: '', component: OverviewComponent },
  { path: 'import', component: ImportComponent },
  { path: ':id', component: DetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventManagementRoutingModule {}
