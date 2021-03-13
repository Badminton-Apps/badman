import { ImportedConnectionType } from "../types";
import { where } from './utils';

export const importedQuery = {
    type: ImportedConnectionType.connectionType,
    args: {
      ...ImportedConnectionType.connectionArgs,
      where
    },
    resolve: (...args) => ImportedConnectionType.resolve(...args)
  };
  