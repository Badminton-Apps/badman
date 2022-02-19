import { lstatSync, readdirSync } from 'fs';
import path from 'path';

export const getMostRecentFile = (dir) => {
  const files = orderReccentFiles(dir);
  return files.length ? files[0] : undefined;
};

export const orderReccentFiles = (dir) => {
  return getFiles(dir)
    .map((file) => ({ file, mtime: lstatSync(path.join(dir, file)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};

export const getFiles = (dir) => {
  return readdirSync(dir).filter((file) =>
    lstatSync(path.join(dir, file)).isFile()
  );
};
