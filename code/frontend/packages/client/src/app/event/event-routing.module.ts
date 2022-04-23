import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { OverviewComponent } from './pages';
import { ImportComponent } from './pages/import';

const routes: Routes = [
  { path: '', component: OverviewComponent },
  {
    path: 'import',
    component: ImportComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['import:competition', 'import:tournament'],
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventRoutingModule {}
