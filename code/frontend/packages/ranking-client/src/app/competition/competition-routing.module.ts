import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: 'team-assembly',
    loadChildren: () =>
      import('./modules/team-assembly/team-assembly.module').then(
        (m) => m.TeamAssemblyModule
      ),
    data: {
      claims: {
        all: 'team:assembly',
      },
    },
  },
  {
    path: 'team-enrollment',
    loadChildren: () =>
      import('./modules/team-enrollment/team-enrollment.module').then(
        (m) => m.TeamEnrolmentModule
      ),
    data: {
      claims: {
        all: 'team:enrollment',
      }, 
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompetitionRoutingModule {}
