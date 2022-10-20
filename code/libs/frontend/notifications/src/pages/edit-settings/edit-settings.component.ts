import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { NotificationType, Player, Setting } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'badman-edit-settings',
  templateUrl: './edit-settings.component.html',
  styleUrls: ['./edit-settings.component.scss'],
})
export class EditSettingsComponent implements OnInit {
  settingsForm!: FormGroup;

  saving = false;

  typeOptions = [
    { value: NotificationType.EMAIL, viewValue: 'notifications.types.email' },
    { value: NotificationType.PUSH, viewValue: 'notifications.types.push' },
    // { value: NotificationType.SMS, viewValue: 'notifications.types.sms' },
  ];

  constructor(private apollo: Apollo, titleService: Title, translate: TranslateService ) {
    titleService.setTitle(translate.instant('notifications.title'));
  }

  ngOnInit(): void {
    this.apollo
      .query<{ me: Player }>({
        query: gql`
          query GetPlayerSettings {
            me {
              id
              setting {
                encounterChangeConformationNotification
                encounterChangeFinishedNotification
                encounterChangeNewNotification
                encounterNotAcceptedNotification
                encounterNotEnteredNotification
              }
            }
          }
        `,
      })
      .pipe(
        map((result) => {
          return new Player(result.data.me)?.setting as Setting;
        })
      )
      .subscribe((setting) => {
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
        });

        console.log(this.settingsForm?.value);
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
    console.log(this.settingsForm?.value);
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
          ) {
            updateSetting(
              settings: {
                encounterChangeConformationNotification: $encounterChangeConformationNotification
                encounterChangeFinishedNotification: $encounterChangeFinishedNotification
                encounterChangeNewNotification: $encounterChangeNewNotification
                encounterNotAcceptedNotification: $encounterNotAcceptedNotification
                encounterNotEnteredNotification: $encounterNotEnteredNotification
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
        },
      })

      .subscribe(() => {
        this.saving = false;
      });
  }
}
