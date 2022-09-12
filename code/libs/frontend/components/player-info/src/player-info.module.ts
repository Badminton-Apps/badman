import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerInfoComponent } from './components';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [PlayerInfoComponent],
  exports: [PlayerInfoComponent],
  imports: [CommonModule, RouterModule, MatTooltipModule, TranslateModule],
})
export class PlayerInfoModule {}
