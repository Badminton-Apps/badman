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
        all: 'view:event',
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompetitionRoutingModule {}
