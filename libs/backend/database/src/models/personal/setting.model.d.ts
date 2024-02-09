import { BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { NotificationType } from '@badman/utils';
import { PushSubscription } from '../../types';
import { Player } from '../player.model';
import { AvaliableLanguages } from '@badman/utils';
import { Relation } from '../../wrapper';
export declare class Setting extends Model {
    constructor(values?: Partial<Setting>, options?: BuildOptions);
    id: string;
    language?: AvaliableLanguages;
    player?: Relation<Player>;
    playerId?: string;
    pushSubscriptions: PushSubscription[];
    encounterNotEnteredNotification: NotificationType;
    encounterNotAcceptedNotification: NotificationType;
    encounterChangeNewNotification: NotificationType;
    encounterChangeConfirmationNotification: NotificationType;
    encounterChangeFinishedNotification: NotificationType;
    syncSuccessNotification: NotificationType;
    syncFailedNotification: NotificationType;
    clubEnrollmentNotification: NotificationType;
    synEncounterFailed: NotificationType;
}
declare const SettingUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Setting, "player" | "pushSubscriptions">>>;
export declare class SettingUpdateInput extends SettingUpdateInput_base {
}
declare const SettingNewInput_base: import("@nestjs/common").Type<Partial<Omit<SettingUpdateInput, "id">>>;
export declare class SettingNewInput extends SettingNewInput_base {
}
declare const NotificationOptionsTypes_base: import("@nestjs/common").Type<Omit<Setting, "id" | "player" | "language" | "pushSubscriptions">>;
export declare class NotificationOptionsTypes extends NotificationOptionsTypes_base {
}
export {};
