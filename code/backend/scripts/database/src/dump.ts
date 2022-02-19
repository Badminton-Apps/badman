import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const USERNAME = process.env.LOCALHOST_USERNAME || 'postgres';
const PASSWORD = process.env.LOCALHOST_PASSWORD || 'postgres';
const DATABASE = process.env.LOCALHOST_DATABASE || 'ranking';
const HOST = process.env.LOCALHOST_HOST || 'localhost';
const PORT = process.env.LOCALHOST_PORT || 5433;

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
    const migrate = exec(query, { env: process.env }, (err) => {
      return err ? rej(err) : res('ok');
    });
    // Forward stdout+stderr to this process
    migrate.stdout.pipe(process.stdout);
    migrate.stderr.pipe(process.stderr);
  });
};

(async () => {
  try {
    console.log('----- DUMPING database ----');
    await runCommmand(
      `"${PSQL}\\pg_dump"  -c --inserts ${DATABASE} > ${path.join(DUMP_LOC, 'dump.sql')}`
    );
  } catch (error) {
    console.error(error);
  }
})();
