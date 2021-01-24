import { Event, ImporterFile, logger } from '@badvlasim/shared';
import { unlink } from 'fs';
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
    const importerFile = await ImporterFile.findByPk(event.id);
    unlink(importerFile.fileLocation, err => {
      if (err) {
        logger.error(`delete file ${importerFile.fileLocation} failed`, err);
        throw err;
      }
      logger.debug('Old file deleted', importerFile.fileLocation);
    });

    await importerFile.destroy();
  }
};

export { deleteImportedEventMutation };
