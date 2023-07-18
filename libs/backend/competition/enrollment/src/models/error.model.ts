import { I18nTranslations } from '@badman/utils';
import { PathImpl2 } from '@nestjs/config';
import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class EnrollmentValidationError {
  @Field(() => String, { nullable: true })
  message?: PathImpl2<I18nTranslations>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  params?: unknown;
}

@ObjectType()
export class TeamInfo {
  @Field(() => String, { nullable: true })
  message?: PathImpl2<I18nTranslations>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  params?: unknown;
}

@ObjectType('TeamValidity')
export class TeamValidity {
  @Field(() => String, { nullable: true })
  teamId?: string;

  @Field(() => Boolean, { nullable: true })
  valid?: boolean;
}
