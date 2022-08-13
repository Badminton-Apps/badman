import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from '@badman/frontend/shared';
import { MarkdownModule } from 'ngx-markdown';
import { InfoRoutingModule } from './info-routing.module';
import {
  ChangelogComponent,
  CookiesComponent,
  FaqComponent,
  LandingComponent,
} from './pages';

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
