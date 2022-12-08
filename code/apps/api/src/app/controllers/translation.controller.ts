import { Controller, Get, Param, Res } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Response } from 'express';

export const LANG = ['en', 'fr_BE', 'nl_BE'];

@Controller()
export class TranslateController {
  @Get('i18n/:lang')
  async translate(@Param() param: { lang: string }, @Res() res: Response) {
    if (!LANG.includes(param.lang)) {
      res.status(404).send('Not found');
      return;
    }

    const i18nPath = join(__dirname, `./assets/i18n/${param.lang}.json`);
    const file = await readFile(i18nPath, 'utf-8');

    res.json(JSON.parse(file));
  }
}
