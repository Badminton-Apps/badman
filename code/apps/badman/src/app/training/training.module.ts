import { NgModule } from '@angular/core';

import { TrainingRoutingModule } from './training-routing.module';

import { CurriculumComponent } from './pages/';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { SharedModule } from '../_shared';

@NgModule({
  declarations: [CurriculumComponent],
  imports: [
    MatStepperModule,
    MatRadioModule,
    SharedModule,
    TrainingRoutingModule,
  ],
})
export class TrainingModule {}
