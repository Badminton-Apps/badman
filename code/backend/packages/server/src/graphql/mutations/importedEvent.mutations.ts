import { Event, ImporterFile } from '@badvlasim/shared';
import { GraphQLInt } from 'graphql';
import { ImportInputType, ImportedType } from '../types';

const deleteImportedEventMutation = {
  type: ImportedType,
  args: {
    event: {
      name: 'ImportedEvent',
      type: ImportInputType
    }
  },
  resolve: async (findOptions, { event }) => {
    const importer = await ImporterFile.findByPk(event.id);
    await importer.destroy();
  }
};

export { deleteImportedEventMutation };
