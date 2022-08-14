import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import {
  ChangelogComponent,
  CookiesComponent,
  FaqComponent,
  LandingComponent,
} from './pages';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'changelog', component: ChangelogComponent },
  { path: 'cookies', component: CookiesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InfoRoutingModule {}
