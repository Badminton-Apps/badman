import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { SharedModule } from 'app/_shared';
import { MarkdownModule } from 'ngx-markdown';
import { InfoRoutingModule } from './info-routing.module';
import { ChangelogComponent } from './pages/changelog/changelog.component';
import { LandingComponent } from './pages/landing/landing.component';
import { CovalentDataTableModule } from '@covalent/core/data-table';
import { CovalentPagingModule } from '@covalent/core/paging';


const covalentModules = [
  CovalentDataTableModule,
  CovalentPagingModule,
];

const materialModules = [
  MatExpansionModule,
]

@NgModule({
  declarations: [ChangelogComponent, LandingComponent],
  imports: [
    SharedModule,
    ...materialModules,
    InfoRoutingModule,
    ...covalentModules,

    MarkdownModule.forChild(),
  ],
})
export class InfoModule {}
