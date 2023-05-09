import { AvaliableLanguages, NotificationType } from '@badman/utils';
export class Setting {
  encounterChangeConformationNotification?: NotificationType;
  encounterChangeFinishedNotification?: NotificationType;
  encounterChangeNewNotification?: NotificationType;
  encounterNotAcceptedNotification?: NotificationType;
  encounterNotEnteredNotification?: NotificationType;
  syncSuccessNotification?: NotificationType;
  syncFailedNotification?: NotificationType;
  clubEnrollmentNotification?: NotificationType;
  language?: AvaliableLanguages;

  constructor({ ...args }: Partial<Setting>) {
    this.encounterChangeConformationNotification =
      args?.encounterChangeConformationNotification;
    this.encounterChangeFinishedNotification =
      args?.encounterChangeFinishedNotification;
    this.encounterChangeNewNotification = args?.encounterChangeNewNotification;
    this.encounterNotAcceptedNotification =
      args?.encounterNotAcceptedNotification;
    this.encounterNotEnteredNotification =
      args?.encounterNotEnteredNotification;
    this.syncSuccessNotification = args?.syncSuccessNotification;
    this.syncFailedNotification = args?.syncFailedNotification;
    this.clubEnrollmentNotification = args?.clubEnrollmentNotification;
    this.language = args?.language;
  }
}
