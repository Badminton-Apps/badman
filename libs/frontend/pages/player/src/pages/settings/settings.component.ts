import { CommonModule, isPlatformServer } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Player, Setting } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { AvaliableLanguages, NotificationType } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map, of } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  selector: 'badman-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    TranslateModule,
    MatSnackBarModule,
  ],
})
export class SettingsPageComponent implements OnInit {
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

  constructor(
    private apollo: Apollo,
    private translate: TranslateService,
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const player = data['player'];

      this.seoService.update({
        title: this.translate.instant('all.settings.title'),
        description: `Player ${player.fullName}`,
        type: 'website',
        keywords: ['player', 'badminton'],
      });
      this.breadcrumbsService.set('player/:id', player.fullName);

      this._loadSettings(player).subscribe((setting) => {
        if (setting === null || setting === undefined) {
          return;
        }
        const encounterChangeConformationNotificationControl = new FormControl(
          this.getValues(setting.encounterChangeConformationNotification)
        );

        const encounterChangeFinishedNotificationControl = new FormControl(
          this.getValues(setting.encounterChangeFinishedNotification)
        );

        const encounterChangeNewNotificationControl = new FormControl(
          this.getValues(setting.encounterChangeNewNotification)
        );

        const encounterNotAcceptedNotificationControl = new FormControl(
          this.getValues(setting.encounterNotAcceptedNotification)
        );

        const encounterNotEnteredNotificationControl = new FormControl(
          this.getValues(setting.encounterNotEnteredNotification)
        );
        const syncSuccessNotification = new FormControl(
          this.getValues(setting.syncSuccessNotification)
        );
        const syncFailedNotification = new FormControl(
          this.getValues(setting.syncFailedNotification)
        );

        this.settingsForm = new FormGroup({
          encounterChangeConformationNotification:
            encounterChangeConformationNotificationControl,
          encounterChangeFinishedNotification:
            encounterChangeFinishedNotificationControl,
          encounterChangeNewNotification: encounterChangeNewNotificationControl,
          encounterNotAcceptedNotification:
            encounterNotAcceptedNotificationControl,
          encounterNotEnteredNotification:
            encounterNotEnteredNotificationControl,
          syncSuccessNotification: syncSuccessNotification,
          syncFailedNotification: syncFailedNotification,
          language: new FormControl(setting.language),
        });
      });
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
            $encounterChangeConformationNotification: Int!
            $encounterChangeFinishedNotification: Int!
            $encounterChangeNewNotification: Int!
            $encounterNotAcceptedNotification: Int!
            $encounterNotEnteredNotification: Int!
            $syncSuccessNotification: Int!
            $syncFailedNotification: Int!
            $language: String!
          ) {
            updateSetting(
              settings: {
                encounterChangeConformationNotification: $encounterChangeConformationNotification
                encounterChangeFinishedNotification: $encounterChangeFinishedNotification
                encounterChangeNewNotification: $encounterChangeNewNotification
                encounterNotAcceptedNotification: $encounterNotAcceptedNotification
                encounterNotEnteredNotification: $encounterNotEnteredNotification
                syncSuccessNotification: $syncSuccessNotification
                syncFailedNotification: $syncFailedNotification
                language: $language
              }
            )
          }
        `,
        variables: {
          encounterChangeConformationNotification:
            this.settingsForm
              .get('encounterChangeConformationNotification')
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
        },
      })

      .subscribe(() => {
        this.saving = false;
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  private _loadSettings(player: Player) {
    if (isPlatformServer(this.platformId) || !player) {
      return of();
    }

    return this.apollo
      .query<{ me: Player }>({
        query: gql`
          query GetPlayerSettings {
            me {
              id
              setting {
                id
                encounterChangeConformationNotification
                encounterChangeFinishedNotification
                encounterChangeNewNotification
                encounterNotAcceptedNotification
                encounterNotEnteredNotification
                syncSuccessNotification
                syncFailedNotification
                language
              }
            }
          }
        `,
      })
      .pipe(
        map((result) => {
          if (result.data) {
            return new Player(result.data.me)?.setting as Setting;
          }
          return null;
        })
      );
  }
}
