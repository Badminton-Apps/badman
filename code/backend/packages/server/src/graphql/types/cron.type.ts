import { Cron } from '@badvlasim/shared/models';
import { GraphQLObjectType } from 'graphql';
import { getAttributeFields } from './attributes.type';

export const CronType = new GraphQLObjectType({
  name: 'Cron',
  description: 'A Cron',
  fields: () => Object.assign(getAttributeFields(Cron), {})
});
