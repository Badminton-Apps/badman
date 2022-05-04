import { NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { NgxMatMomentModule } from '@angular-material-components/moment-adapter';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgcCookieConsentModule } from 'ngx-cookieconsent';
import { MomentModule } from 'ngx-moment';
import {
  BannerComponent,
  BetaComponent,
  ClaimComponent,
  ConfirmationDialogComponent,
  HasClaimComponent,
  HeaderSearchComponent,
  LanguageComponent,
  NewPlayerComponent,
  NotificationComponent,
  PlayerSearchComponent,
  RankingShellComponent,
  TimePickerInput,
  UserInfoComponent,
  WatchSystemInfoComponent,
} from './components';
import { AssignRankingGroupsComponent } from './dialogs';
import { EnumToArrayPipe, LevelToLetterPipe, LoadingPipe } from './pipes';

const materialModules = [
  MatAutocompleteModule,
  MatBadgeModule,
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MatIconModule,
  MatListModule,
  MatMenuModule,
  MatSidenavModule,
  MatToolbarModule,
  MatSelectModule,
  MatExpansionModule,
  MatDialogModule,
  MatSlideToggleModule,
  ReactiveFormsModule,
  FormsModule,
  MatOptionModule,
  MomentModule,
  MatChipsModule,

  MatCheckboxModule,
  MatTableModule
];

const exportedComponents = [
  AssignRankingGroupsComponent,
  BetaComponent,
  ClaimComponent,
  CommonModule,
  EnumToArrayPipe,
  FlexLayoutModule,
  FormsModule,
  HasClaimComponent,
  LevelToLetterPipe,
  LoadingPipe,
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MomentModule,
  PlayerSearchComponent,
  ReactiveFormsModule,
  TranslateModule,
  TimePickerInput
];

@NgModule({
  declarations: [
    BannerComponent,
    RankingShellComponent,
    PlayerSearchComponent,
    HeaderSearchComponent,
    NotificationComponent,
    LoadingPipe,
    LevelToLetterPipe,
    LanguageComponent,
    EnumToArrayPipe,
    ConfirmationDialogComponent,
    BetaComponent,
    ClaimComponent,
    HasClaimComponent,
    NewPlayerComponent,
    UserInfoComponent,
    AssignRankingGroupsComponent,
    WatchSystemInfoComponent,
    TimePickerInput,
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgcCookieConsentModule,
    FlexLayoutModule,
    TranslateModule.forChild(),
    ...materialModules,
  ],

  exports: [...exportedComponents],
})
export class SharedModule {}
