import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChangelogComponent } from './pages/changelog/changelog.component';
import { CookiesComponent } from './pages/cookies/cookies.component';
import { LandingComponent } from './pages/landing/landing.component';
import { FaqComponent } from './pages/pages/faq/faq.component';

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
