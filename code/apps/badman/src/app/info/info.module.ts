import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MarkdownModule } from 'ngx-markdown';
import { InfoRoutingModule } from './info-routing.module';
import { ChangelogComponent } from './pages/changelog/changelog.component';
import { LandingComponent } from './pages/landing/landing.component';
import { CovalentDataTableModule } from '@covalent/core/data-table';
import { CovalentPagingModule } from '@covalent/core/paging';
import { CookiesComponent } from './pages/cookies/cookies.component';
import { FaqComponent } from './pages/pages/faq/faq.component';
import { SharedModule } from '../_shared';

const covalentModules = [CovalentDataTableModule, CovalentPagingModule];

const materialModules = [MatExpansionModule];

@NgModule({
  declarations: [
    ChangelogComponent,
    LandingComponent,
    CookiesComponent,
    FaqComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    InfoRoutingModule,
    ...covalentModules,
    MarkdownModule.forChild(),
  ],
})
export class InfoModule {}
