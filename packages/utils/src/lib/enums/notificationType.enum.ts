export enum NotificationType {
  NONE = 0 << 0,
  PUSH = 1 << 0,
  EMAIL = 1 << 1,
  SMS = 1 << 2,
  ALL = PUSH | EMAIL | SMS,
}
