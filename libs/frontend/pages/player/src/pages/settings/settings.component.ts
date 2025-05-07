import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { HasClaimComponent } from '@badman/frontend-components';
import { Player, Setting } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { AvaliableLanguages, NotificationType } from '@badman/utils';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  selector: 'badman-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    TranslatePipe,
    MatSnackBarModule,
    HasClaimComponent,
  ],
})
export class SettingsPageComponent implements OnInit {
  private apollo = inject(Apollo);
  private translate = inject(TranslateService);
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private breadcrumbsService = inject(BreadcrumbService);
  private snackBar = inject(MatSnackBar);
  private changeDetectorRef = inject(ChangeDetectorRef);
  settingsForm!: FormGroup;

  saving = false;

  notificationType = [
    {
      value: NotificationType.EMAIL,
      viewValue: 'all.settings.notifications.types.email',
    },
    {
      value: NotificationType.PUSH,
      viewValue: 'all.settings.notifications.types.push',
    },
    // { value: NotificationType.SMS, viewValue: 'all.settings.notifications.types.sms' },
  ];

  languageTypes = [
    { value: AvaliableLanguages.en, viewValue: 'all.settings.languages.en' },
    {
      value: AvaliableLanguages.nl_BE,
      viewValue: 'all.settings.languages.nl_BE',
    },
    {
      value: AvaliableLanguages.fr_BE,
      viewValue: 'all.settings.languages.fr_BE',
    },
  ];

  settings$?: Observable<Setting | undefined>;
  player: Player | undefined;

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.player = data['player'];
      if (!this.player) {
        return;
      }

      this.seoService.update({
        title: this.translate.instant('all.settings.title'),
        description: `Player ${this.player.fullName}`,
        type: 'website',
        keywords: ['player', 'badminton'],
      });
      this.breadcrumbsService.set('player/:id', this.player.fullName);

      this.settings$ = this._loadSettings(this.player).pipe(
        tap((setting) => {
          if (setting === null || setting === undefined) {
            return;
          }
          const encounterChangeConfirmationNotificationControl = new FormControl(
            this.getValues(setting.encounterChangeConfirmationNotification),
          );

          const encounterChangeFinishedNotificationControl = new FormControl(
            this.getValues(setting.encounterChangeFinishedNotification),
          );

          const encounterChangeNewNotificationControl = new FormControl(
            this.getValues(setting.encounterChangeNewNotification),
          );

          const encounterNotAcceptedNotificationControl = new FormControl(
            this.getValues(setting.encounterNotAcceptedNotification),
          );

          const encounterNotEnteredNotificationControl = new FormControl(
            this.getValues(setting.encounterNotEnteredNotification),
          );
          const syncSuccessNotification = new FormControl(
            this.getValues(setting.syncSuccessNotification),
          );
          const syncFailedNotification = new FormControl(
            this.getValues(setting.syncFailedNotification),
          );

          const clubEnrollmentNotification = new FormControl(
            this.getValues(setting.clubEnrollmentNotification),
          );
          this.settingsForm = new FormGroup({
            encounterChangeConfirmationNotification: encounterChangeConfirmationNotificationControl,
            encounterChangeFinishedNotification: encounterChangeFinishedNotificationControl,
            encounterChangeNewNotification: encounterChangeNewNotificationControl,
            encounterNotAcceptedNotification: encounterNotAcceptedNotificationControl,
            encounterNotEnteredNotification: encounterNotEnteredNotificationControl,
            syncSuccessNotification: syncSuccessNotification,
            syncFailedNotification: syncFailedNotification,
            clubEnrollmentNotification: clubEnrollmentNotification,
            language: new FormControl(setting.language),
          });
        }),
      );
    });
  }

  private getValues(input: NotificationType = NotificationType.NONE) {
    const value: NotificationType[] = [];

    if (input & NotificationType.EMAIL) {
      value.push(NotificationType.EMAIL);
    }

    if (input & NotificationType.PUSH) {
      value.push(NotificationType.PUSH);
    }

    if (input & NotificationType.SMS) {
      value.push(NotificationType.SMS);
    }

    return value;
  }

  save() {
    this.saving = true;
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateSettings(
            $encounterChangeConfirmationNotification: Int!
            $encounterChangeFinishedNotification: Int!
            $encounterChangeNewNotification: Int!
            $encounterNotAcceptedNotification: Int!
            $encounterNotEnteredNotification: Int!
            $syncSuccessNotification: Int!
            $syncFailedNotification: Int!
            $language: String!
            $playerId: ID!
          ) {
            updateSetting(
              settings: {
                encounterChangeConfirmationNotification: $encounterChangeConfirmationNotification
                encounterChangeFinishedNotification: $encounterChangeFinishedNotification
                encounterChangeNewNotification: $encounterChangeNewNotification
                encounterNotAcceptedNotification: $encounterNotAcceptedNotification
                encounterNotEnteredNotification: $encounterNotEnteredNotification
                syncSuccessNotification: $syncSuccessNotification
                syncFailedNotification: $syncFailedNotification
                language: $language
                playerId: $playerId
              }
            )
          }
        `,
        variables: {
          encounterChangeConfirmationNotification:
            this.settingsForm
              .get('encounterChangeConfirmationNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          encounterChangeFinishedNotification:
            this.settingsForm
              .get('encounterChangeFinishedNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          encounterChangeNewNotification:
            this.settingsForm
              .get('encounterChangeNewNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          encounterNotAcceptedNotification:
            this.settingsForm
              .get('encounterNotAcceptedNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          encounterNotEnteredNotification:
            this.settingsForm
              .get('encounterNotEnteredNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          syncSuccessNotification:
            this.settingsForm
              .get('syncSuccessNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          syncFailedNotification:
            this.settingsForm
              .get('syncFailedNotification')
              ?.value?.reduce((a: number, b: number) => a + b, 0) ?? 0,
          language: this.settingsForm.get('language')?.value ?? 'en',
          playerId: this.player?.id,
        },
      })
      .subscribe(() => {
        this.saving = false;
        this.changeDetectorRef.detectChanges();
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  private _loadSettings(player: Player) {
    return this.apollo
      .query<{ player: Player }>({
        query: gql`
          query GetPlayerSettings($id: ID!) {
            player(id: $id) {
              id
              setting {
                id
                encounterChangeConfirmationNotification
                encounterChangeFinishedNotification
                encounterChangeNewNotification
                encounterNotAcceptedNotification
                encounterNotEnteredNotification
                syncSuccessNotification
                syncFailedNotification
                clubEnrollmentNotification
                language
              }
            }
          }
        `,
        variables: {
          id: player.id || player.slug,
        },
      })
      .pipe(
        map((result) => {
          return new Player(result.data.player)?.setting ?? new Setting({});
        }),
      );
  }
}
