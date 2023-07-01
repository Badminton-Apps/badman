import { I18nTranslations } from '@badman/utils';
import { PathImpl2 } from '@nestjs/config';
import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class AssemblyValidationError {
  @Field(() => String, { nullable: true })
  message!: PathImpl2<I18nTranslations>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  params?: unknown;
}
