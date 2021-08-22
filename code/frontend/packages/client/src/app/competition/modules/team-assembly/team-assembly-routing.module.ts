import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { TeamAssemblyComponent } from './pages';

const routes: Routes = [{ path: '', component: TeamAssemblyComponent, canActivate: [AuthGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeamAssemblyRoutingModule {}
