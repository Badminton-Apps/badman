import { NgModule } from '@angular/core';

import { TrainingRoutingModule } from './training-routing.module';

import { CurriculumComponent } from './pages/';
import { MatStepperModule } from '@angular/material/stepper';
import { SharedModule } from 'app/_shared';
import {MatRadioModule} from '@angular/material/radio';



@NgModule({
  declarations: [
    CurriculumComponent
  ],
  imports: [
    MatStepperModule,
    MatRadioModule,
    SharedModule,
    TrainingRoutingModule
  ]
})
export class TrainingModule { }
