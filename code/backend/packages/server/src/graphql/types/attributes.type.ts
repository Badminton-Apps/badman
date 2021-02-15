import { logger } from '@badvlasim/shared';
import { GraphQLNonNull, GraphQLString } from 'graphql';
import { attributeFields, Model } from 'graphql-sequelize';
import { Sequelize } from 'sequelize';

const attributeFieldsCached = {};

export const getAttributeFields = (model, inputType = false) => {
  if (attributeFieldsCached[model.name] == null) {
    attributeFieldsCached[model.name] = attributeFields(model);
  }

  const returnInstance = { ...attributeFieldsCached[model.name] };

  if (inputType) {
    delete returnInstance.createdAt;
    delete returnInstance.updatedAt;

    // If we have an id, change it to optional
    if (returnInstance.id ) {
      returnInstance.id.type = GraphQLString;
    }

  }

  // logger.debug(`Attributes for ${model.name}`, attributeFieldsCached[model.name]);
  return returnInstance;
};
