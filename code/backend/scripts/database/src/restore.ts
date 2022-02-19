import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { getFiles } from '../utils';
dotenv.config();

const USERNAME = process.env.BADMAN_USERNAME || 'postgres';
const PASSWORD = process.env.BADMAN_PASSWORD || 'postgres';
const DATABASE = process.env.BADMAN_DATABASE || 'ranking';
const HOST = process.env.BADMAN_HOST || 'localhost';
const PORT = process.env.BADMAN_PORT || 5433;

const PSQL = process.env.PSQL || 'C:\\Program Files\\PostgreSQL\\12\\bin';
const DUMP_LOC = process.env.BADMAN_RESTURELOC || 'dump';

const runCommmand = (cmd: string) => {
  let query = ``;
  query += `set PGPASSWORD=${PASSWORD}&`;
  query += `set PGHOST=${HOST}&`;
  query += `set PGPORT=${PORT}&`;
  query += `set PGUSER=${USERNAME}&`;

  query += `${cmd}`;

  console.log(`----- Running: ${query} ----`);
  return new Promise((res, rej) => {
    const migrate = exec(
      query,
      { env: process.env, maxBuffer: 1024 * 100000 },
      (err) => {
        return err ? rej(err) : res('ok');
      }
    );
    // Forward stdout+stderr to this process
    migrate.stdout.pipe(process.stdout);
    migrate.stderr.pipe(process.stderr);
  });
};

(async () => {
  try {
    console.log('----- DUMPING database ----');
    const files = getFiles(path.join(DUMP_LOC, 'splits')).sort((a, b) =>
      a.localeCompare(b)
    );

    for (const file of files) {
      if (file == 'dump.sql') {
        continue;
      }
      console.log(`----- Restoring ${file} ----`);
      await runCommmand(
        `"${PSQL}\\pg_restore" --clean -d ${DATABASE} -f ${path.join(DUMP_LOC, 'splits', file)}`
      );
    }

    // await runCommmand(`"${PSQL}\\psql" ${DATABASE} < dump.sql`);
  } catch (error) {
    console.error(error);
  }
})();
