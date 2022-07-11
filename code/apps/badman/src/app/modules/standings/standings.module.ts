import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StandingComponent } from './components/standing/standing.component';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [StandingComponent],
  imports: [MatTableModule, TranslateModule, CommonModule, RouterModule],
  exports: [StandingComponent],
})
export class StandingsModule {}
