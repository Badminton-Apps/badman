import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FaqPageComponent, ChangelogPageComponent } from './pages';
import { FaqResolver } from './resolvers';

@NgModule({
  providers: [FaqResolver],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'faq',
        component: FaqPageComponent,
        resolve: {
          faqs: FaqResolver,
        },
      },
      {
        path: 'changelog',
        component: ChangelogPageComponent,
      },
    ]),
  ],
})
export class GeneralModule {}
