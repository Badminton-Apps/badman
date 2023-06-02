import { AllowAnonymous } from '@badman/backend-authorization';
import { I18nTranslations } from '@badman/utils';
import { Controller, Get, Param, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { I18nService } from 'nestjs-i18n';

type languages = 'en' | 'fr_BE' | 'nl_BE';

@Controller('translate')
export class TranslateController {
  constructor(private readonly i18nService: I18nService<I18nTranslations>) {}

  @AllowAnonymous()
  @Get('i18n/:lang')
  async translations(
    @Param() param: { lang: languages },
    @Res() res: FastifyReply
  ) {
    const translated = this.i18nService.getTranslations();

    res.send(translated[param.lang]);
  }
}
