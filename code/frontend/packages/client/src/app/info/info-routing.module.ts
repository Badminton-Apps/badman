import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChangelogComponent } from './pages/changelog/changelog.component';
import { LandingComponent } from './pages/landing/landing.component';

const routes: Routes = [{ path: '', component: LandingComponent }, { path: 'changelog', component: ChangelogComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InfoRoutingModule { }
