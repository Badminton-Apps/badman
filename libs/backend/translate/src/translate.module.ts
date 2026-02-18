import { Module } from "@nestjs/common";
import * as path from "path";
import { I18nModule } from "nestjs-i18n";
//import { TranslateController } from "./controllers";

//const i18nGeneratedPath = join(__dirname, "../../../libs/utils/src/lib/i18n.generated.ts");

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: "en",
      loaderOptions: {
        path: path.join(__dirname, "/i18n/"),
        watch: true,
      },
      typesOutputPath: path.join(__dirname, "../src/generated/i18n.generated.ts"),
    }),
  ],
  controllers: [],
  // controllers: [TranslateController],
  /*   imports: [
    I18nModule.forRootAsync({
      resolvers: [{ use: QueryResolver, options: ["lang"] }],

      useFactory: () => {
        return {
          fallbackLanguage: "nl_BE",
          loaderOptions: {
            path: join(__dirname, "./assets/i18n/"),
            watch: true,
          },
          typesOutputPath: i18nGeneratedPath,
        };
      },
    }),
  ], */
  exports: [],
})
export class TranslateModule {}
