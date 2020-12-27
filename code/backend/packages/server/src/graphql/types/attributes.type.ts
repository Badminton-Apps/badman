import { logger } from '@badvlasim/shared';
import { attributeFields, Model } from 'graphql-sequelize';

const attributeFieldsCached = {};

export const getAttributeFields = (model, inputType = false) => {
  if (attributeFieldsCached[model.name] == null) {
    attributeFieldsCached[model.name] = attributeFields(model);
  }

  const returnInstance = { ...attributeFieldsCached[model.name] };

  if (inputType) {
    delete returnInstance.createdAt;
    delete returnInstance.updatedAt;
  }

  // logger.debug(`Attributes for ${model.name}`, attributeFieldsCached[model.name]);
  return returnInstance;
};
