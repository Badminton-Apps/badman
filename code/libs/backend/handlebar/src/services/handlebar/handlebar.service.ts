/* eslint-disable prefer-rest-params */
import {
  lstatSync,
  promises,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import Handlebars from 'handlebars';
import moment from 'moment';
import path from 'path';
const { readFile } = promises;
import { Injectable } from '@nestjs/common';

@Injectable()
export class HandlebarService {
  constructor() {
    const reduceOp = function (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: any,
      reducer: (
        a: string | boolean | number,
        b: string | boolean | number
      ) => boolean
    ) {
      args = Array.from(args);
      args.pop(); // => options
      const first = args.shift();
      return args.reduce(reducer, first);
    };
    Handlebars.registerHelper({
      eq() {
        return reduceOp(
          arguments,
          (a: string | number, b: string | number) => a === b
        );
      },
      ne() {
        return reduceOp(
          arguments,
          (a: string | number, b: string | number) => a !== b
        );
      },
      lt() {
        return reduceOp(arguments, (a: number, b: number) => a < b);
      },
      gt() {
        return reduceOp(arguments, (a: number, b: number) => a > b);
      },
      lte() {
        return reduceOp(arguments, (a: number, b: number) => a <= b);
      },
      gte() {
        return reduceOp(arguments, (a: number, b: number) => a >= b);
      },
      and() {
        return reduceOp(arguments, (a: boolean, b: boolean) => a && b);
      },
      or() {
        return reduceOp(arguments, (a: boolean, b: boolean) => a || b);
      },
      labelSingle: (index, type) => {
        if (type === 'MX') {
          if (index === 0) {
            return 'HE 1';
          } else if (index === 1) {
            return 'HE 2';
          } else if (index === 2) {
            return 'DE 1';
          } else if (index === 3) {
            return 'DE 2';
          }
        } else {
          const prefix = type === 'M' ? 'HE' : 'DE';
          return `${prefix} ${index + 1}`;
        }
      },
      labelDouble: (index, type) => {
        if (type === 'MX') {
          if (index === 0) {
            return 'HD';
          } else if (index === 1) {
            return 'DD';
          } else if (index === 2) {
            return 'GD 1';
          } else if (index === 3) {
            return 'GD 2';
          }
        } else {
          const prefix = type === 'M' ? 'HD' : 'DD';
          return `${prefix} ${index + 1}`;
        }
      },
      dateFormat: (format, date) => {
        return moment(date).format(format);
      },
    });
  }

  public async getHtml(
    templateName: string,
    context: unknown,
    filename: string
  ) {
    const template = await this._getTemplate(templateName);

    const compiled = Handlebars.compile(template)(context);
    // Write file to disk for debugging purposes
    if (process.env.NODE_ENV !== 'production') {
      writeFileSync(`${filename}.html`, compiled);
    }

    return compiled;
  }

  private async _getTemplate(templateName: string) {
    const filePath = path.join(
      __dirname,
      'assets',
      `${templateName}.handlebars`
    );
    if (!filePath) {
      throw new Error(`Could not find ${templateName}.hbs in generatePDF`);
    }
    const html = await readFile(filePath, 'utf-8');

    return html;
  }

  public Compile(template: string, context: unknown) {
    return Handlebars.compile(template)(context);
  }

  public registerPartials(dir: string, parentDir = '') {
    const partials = readdirSync(dir);
    partials.forEach((partial) => {
      // check if file
      if (lstatSync(path.join(dir, partial)).isFile()) {
        // Has the right extension
        if (partial.endsWith('.handlebars')) {
          const name = partial.replace('.handlebars', '');
          const template = readFileSync(path.join(dir, partial), 'utf-8');
          Handlebars.registerPartial(`${parentDir}${name}`, template);
        }
      } else {
        this.registerPartials(
          path.join(dir, partial),
          `${parentDir}${partial}/`
        );
      }
    });
  }
}
