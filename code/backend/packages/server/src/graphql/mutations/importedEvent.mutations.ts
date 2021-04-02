import { ImporterFile, logger } from '@badvlasim/shared';
import { unlink } from 'fs';
import { ImportedType, ImportInputType } from '../types';

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
      }
      logger.debug('Old file deleted', importerFile.fileLocation);
    });

    await importerFile.destroy();
  }
};

export { deleteImportedEventMutation };
