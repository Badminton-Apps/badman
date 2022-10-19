import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, Injector, NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { DateAdapter, MatOptionModule } from '@angular/material/core';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HasClaimModule } from '@badman/frontend-authentication';
import { MomentModule } from 'ngx-moment';
import {
  BannerComponent,
  BetaComponent,
  ClaimComponent,
  ConfirmationDialogComponent,
  HeaderSearchComponent,
  LanguageComponent,
  NewPlayerComponent,
  NotificationComponent,
  RankingShellComponent,
  SocialsComponent,
  TimePickerInputComponent,
  UserInfoComponent,
  WatchSystemInfoComponent,
} from './components';
import { AssignRankingGroupsComponent } from './dialogs';
import { appInitializerFactory } from './factory';
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
  MatTableModule,
];

const ownModules = [HasClaimModule];

const exportedComponents = [
  AssignRankingGroupsComponent,
  BetaComponent,
  ClaimComponent,
  CommonModule,
  EnumToArrayPipe,
  FlexLayoutModule,
  FormsModule,
  LevelToLetterPipe,
  LoadingPipe,
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MomentModule,
  ReactiveFormsModule,
  TranslateModule,
  TimePickerInputComponent,
  // Temp putting this here so we don't break compatibility with other modules
  HasClaimModule,
];

@NgModule({
  declarations: [
    BannerComponent,
    RankingShellComponent,
    HeaderSearchComponent,
    NotificationComponent,
    LoadingPipe,
    LevelToLetterPipe,
    LanguageComponent,
    EnumToArrayPipe,
    ConfirmationDialogComponent,
    BetaComponent,
    ClaimComponent,
    NewPlayerComponent,
    UserInfoComponent,
    AssignRankingGroupsComponent,
    WatchSystemInfoComponent,
    TimePickerInputComponent,
    SocialsComponent,
  ],
  imports: [
    RouterModule,
    CommonModule,
    FlexLayoutModule,
    TranslateModule.forChild(),
    ...materialModules,
    ...ownModules,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [TranslateService, Injector, DateAdapter],
      multi: true,
    },
  ],

  exports: [...exportedComponents],
})
export class SharedModule {}
