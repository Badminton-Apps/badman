export class Setting {
  encounterChangeConformationNotification?: NotificationType;
  encounterChangeFinishedNotification?: NotificationType;
  encounterChangeNewNotification?: NotificationType;
  encounterNotAcceptedNotification?: NotificationType;
  encounterNotEnteredNotification?: NotificationType;

  constructor({ ...args }: Partial<Setting>) {
    this.encounterChangeConformationNotification =
      args.encounterChangeConformationNotification;
    this.encounterChangeFinishedNotification =
      args.encounterChangeFinishedNotification;
    this.encounterChangeNewNotification = args.encounterChangeNewNotification;
    this.encounterNotAcceptedNotification =
      args.encounterNotAcceptedNotification;
    this.encounterNotEnteredNotification = args.encounterNotEnteredNotification;
  }
}

export enum NotificationType {
  NONE = 0 << 0,
  PUSH = 1 << 0,
  EMAIL = 1 << 1,
  SMS = 1 << 2,
  ALL = PUSH | EMAIL | SMS,
}
