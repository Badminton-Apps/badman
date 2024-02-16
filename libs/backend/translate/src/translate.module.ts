import { Module } from '@nestjs/common';
import { join } from 'path';
import { TranslateController } from './controllers';
import { I18nModule, QueryResolver } from 'nestjs-i18n';
import fs from 'fs';

@Module({
  controllers: [TranslateController],
  imports: [
    I18nModule.forRootAsync({
      resolvers: [{ use: QueryResolver, options: ['lang'] }],

      useFactory: () => {
        // check if generated director/file exists
        const dir = join(__dirname, '../../../libs/utils/src/lib/');
        const file = join(dir, 'i18n.generated.ts');

        if (!fs.existsSync(file)) {
          fs.mkdirSync(dir, {
            recursive: true,
          });
          fs.writeFileSync(
            file,
            `import { Path } from "nestjs-i18n";
            export type I18nTranslations = {};
            export type I18nPath = Path<I18nTranslations>;`,
            { encoding: 'utf8' },
          );
        }

        return {
          fallbackLanguage: 'nl_BE',
          loaderOptions: {
            path: join(__dirname, `./assets/i18n/`),
            watch: true,
          },
          typesOutputPath: file,
        };
      },
    }),
  ],
  exports: [],
})
export class TranslateModule {}
