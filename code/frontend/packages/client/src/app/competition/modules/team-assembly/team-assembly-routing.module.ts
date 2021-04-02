import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeamAssemblyComponent } from './pages';


const routes: Routes = [{ path: '', component: TeamAssemblyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeamAssemblyRoutingModule { }
