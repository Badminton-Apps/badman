import { I18nTranslations } from '@badman/utils';
import { PathImpl2 } from '@nestjs/config';
import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class EnrollmentValidationError {
  @Field(() => String, { nullable: true })
  message: PathImpl2<I18nTranslations>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  params?: unknown;
}

@ObjectType()
export class TeamInfo {
  @Field(() => String, { nullable: true })
  message: PathImpl2<I18nTranslations>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  params?: unknown;
}

@ObjectType('TeamValidity')
export class TeamValidity {
  @Field(() => String)
  teamId: string;

  @Field(() => Boolean)
  valid: boolean;
}

@ObjectType()
export class EnrollmentOutput {
  @Field(() => [EnrollmentValidationError], { nullable: 'itemsAndList' })
  errors?: EnrollmentValidationError[];

  @Field(() => [EnrollmentValidationError], { nullable: 'itemsAndList' })
  warnings?: EnrollmentValidationError[];

  @Field(() => [TeamValidity], { nullable: true })
  valid: {
    teamId: string;
    valid: boolean;
  }[];
}
