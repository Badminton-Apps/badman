import { logger } from '@badvlasim/shared';
import { GraphQLString } from 'graphql';
import { attributeFields } from 'graphql-sequelize';

const attributeFieldsCached = {};

export const getAttributeFields = (
  model,
  options: { exclude?: string[]; optionalString?: string[] } = null
) => {
  if (attributeFieldsCached[model.name] == null) {
    attributeFieldsCached[model.name] = attributeFields(model);
  }

  const returnInstance = { ...attributeFieldsCached[model.name] };

  if (options) {
    if (options?.exclude) {
      for (const ex of options.exclude) {
        delete returnInstance[ex];
      }
    }

    if (options?.optionalString) {
      for (const ex of options.optionalString) {
        returnInstance[ex].type = GraphQLString;
      }
    }
  }

  return returnInstance;
};
