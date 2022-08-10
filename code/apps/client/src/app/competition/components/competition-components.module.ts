import { NgModule } from '@angular/core';
import { FlexModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '@badman/frontend/shared';
import { EventCompetitionFieldsComponent } from './event-competition-fields';
import { EventCompetitionLevelFieldsComponent } from './event-competition-level-fields';
import { ExceptionDaysComponent } from './exception-days';
import { LocationAvailabilityComponent } from './location-availability';
import { LocationsAvailabilityComponent } from './locations-availability';
import { PlayDaysComponent } from './play-days';

const materialModules = [
  MatListModule,
  MatMenuModule,
  MatButtonModule,
  MatIconModule,
  MatTabsModule,
  MatSelectModule,
  FlexModule,
  MatDatepickerModule,
];

@NgModule({
  declarations: [
    EventCompetitionFieldsComponent,
    EventCompetitionLevelFieldsComponent,
    LocationAvailabilityComponent,
    LocationsAvailabilityComponent,
    PlayDaysComponent,
    ExceptionDaysComponent,
  ],
  imports: [SharedModule, ...materialModules],
  exports: [
    EventCompetitionFieldsComponent,
    EventCompetitionLevelFieldsComponent,
    LocationAvailabilityComponent,
    LocationsAvailabilityComponent,
    PlayDaysComponent,
    ExceptionDaysComponent,
  ],
  bootstrap: [PlayDaysComponent],
})
export class CompetitionComponentsModule {}
