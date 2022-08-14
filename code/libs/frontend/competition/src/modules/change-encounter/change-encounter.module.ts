import { NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MomentModule } from 'ngx-moment';
import { ChangeEncounterRoutingModule } from './change-encounter-routing.module';
import {
  ChangeEncounterComponent,
  ListEncountersComponent,
  ShowRequestsComponent,
} from './pages';
import { CalendarComponent, DateSelectorComponent } from './components';
import { FlexModule } from '@angular/flex-layout';
import { MatChipsModule } from '@angular/material/chips';
import {
  SelctionComponentsModule,
  SharedModule,
} from '@badman/frontend/shared';
import { OverlayModule } from '@angular/cdk/overlay';

const materialModules = [
  DragDropModule,
  MatCardModule,
  MatIconModule,
  MatButtonModule,
  MatProgressBarModule,
  MatSelectModule,
  MatTooltipModule,
  MatDialogModule,
  MatCheckboxModule,
  MatListModule,
  MomentModule,
  MatInputModule,
  MatChipsModule,
  MatDatepickerModule,
  NgxMatDatetimePickerModule,
  FlexModule,

  OverlayModule,
];

@NgModule({
  declarations: [
    ChangeEncounterComponent,
    ListEncountersComponent,
    ShowRequestsComponent,
    CalendarComponent,
    DateSelectorComponent,
  ],
  imports: [
    SharedModule,
    SelctionComponentsModule,
    ChangeEncounterRoutingModule,
    ...materialModules,
  ],
})
export class ChangeEncoutnerModule {}
