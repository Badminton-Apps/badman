import {
  Field,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@ObjectType({ description: 'An Exception' })
export class PushSubscriptionKeysType {
  @Field(() => String, { nullable: true })
  p256dh?: string;
  @Field(() => String, { nullable: true })
  auth?: string;
}

@ObjectType({ description: 'An Exception' })
export class PushSubscriptionType {
  @Field(() => String, { nullable: true })
  endpoint?: string;
  @Field(() => String, { nullable: true })
  expirationTime?: string;

  @Field(() => PushSubscriptionKeysType, { nullable: true })
  keys?: PushSubscriptionKeys;
}

@InputType()
export class PushSubscriptionInputType extends PartialType(
  OmitType(PushSubscriptionType, ['keys'] as const),
  InputType
) {
  @Field(() => PushSubscriptionKeysInputType, { nullable: true })
  keys?: PushSubscriptionKeys;
}

@InputType()
export class PushSubscriptionKeysInputType extends PartialType(
  OmitType(PushSubscriptionKeysType, [] as const),
  InputType
) {}

export interface PushSubscription {
  endpoint: string;
  expirationTime: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}
