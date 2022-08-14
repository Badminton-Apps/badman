import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@badman/frontend/shared';
import { ImportComponent } from './pages/import/import.component';

const routes: Routes = [
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
export class EventManagementRoutingModule {}
