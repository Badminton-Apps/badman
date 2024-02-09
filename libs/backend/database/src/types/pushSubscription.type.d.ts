export declare class PushSubscriptionKeysType {
    p256dh?: string;
    auth?: string;
}
export declare class PushSubscriptionType {
    endpoint?: string;
    expirationTime?: string;
    keys?: PushSubscriptionKeys;
}
declare const PushSubscriptionInputType_base: import("@nestjs/common").Type<Partial<Omit<PushSubscriptionType, "keys">>>;
export declare class PushSubscriptionInputType extends PushSubscriptionInputType_base {
    keys?: PushSubscriptionKeys;
}
declare const PushSubscriptionKeysInputType_base: import("@nestjs/common").Type<Partial<Omit<PushSubscriptionKeysType, never>>>;
export declare class PushSubscriptionKeysInputType extends PushSubscriptionKeysInputType_base {
}
export interface PushSubscription {
    endpoint: string;
    expirationTime: string;
    keys: PushSubscriptionKeys;
}
export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
}
export {};
