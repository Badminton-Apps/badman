import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ToernamentComponent } from './toernament.component';

const routes: Routes = [{ path: '', component: ToernamentComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ToernamentRoutingModule { }
