import { spawn } from 'child_process';
import { Stream } from 'stream';

export class Mdb extends Stream {
  private _file: string;
  private _tableDelimiter: string;

  constructor(file: string) {
    super();
    this._file = file;
    this._tableDelimiter = ',';
  }

  toCsv(table: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd = spawn('mdb-export', [this._file, table]);

      let data = '';

      cmd.stdout.on('data', result => {
        data += result.toString();
      });

      cmd.stdout.on('end', result => {
        resolve(data);
      });

      cmd.stderr.on('error', error => {
        reject(error);
      });
    });
  }

  tables() {
    return new Promise((resolve, reject) => {
      const cmd = spawn('mdb-tables', ['--delimiter=' + this._tableDelimiter, this._file]);
      cmd.stdout.on('data', result => {
        const tables = result
          .toString()
          .replace(/,\n$/, '')
          .split(this._tableDelimiter);
        resolve(tables);
      });

      cmd.stderr.on('data', data => {
        reject(data);
      });
    });
  }
}
