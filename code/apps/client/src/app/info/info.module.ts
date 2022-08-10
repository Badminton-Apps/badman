import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MarkdownModule } from 'ngx-markdown';
import { InfoRoutingModule } from './info-routing.module';
import { ChangelogComponent } from './pages/changelog/changelog.component';
import { LandingComponent } from './pages/landing/landing.component';
import { CookiesComponent } from './pages/cookies/cookies.component';
import { FaqComponent } from './pages/pages/faq/faq.component';
import { SharedModule } from '@badman/frontend/shared';
import { MatTableModule } from '@angular/material/table';

const materialModules = [MatExpansionModule, MatTableModule];

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
    MarkdownModule.forChild(),
  ],
})
export class InfoModule {}
