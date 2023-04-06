import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@badman/utils';

type languages = 'en' | 'fr_BE' | 'nl_BE';

@Controller('translate')
export class TranslateController {
  constructor(private readonly i18nService: I18nService<I18nTranslations>) {}

  @Get('i18n/:lang')
  async translations(
    @Param() param: { lang: languages },
    @Res() res: Response
  ) {
    const translated = this.i18nService.getTranslations();
    res.json(translated[param.lang]);
  }
}
