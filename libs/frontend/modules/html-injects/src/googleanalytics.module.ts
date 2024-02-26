import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, InjectionToken, ModuleWithProviders, NgModule, PLATFORM_ID } from '@angular/core';

function scriptconfig(tag: string): string {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', '${tag}');
`;
}

export const GOOGLEANALYTICS_CONFIG_TOKEN = new InjectionToken<GoogleAnalyticsConfiguration>(
  'googleanalytics.config',
);

export type GoogleAnalyticsConfiguration = Readonly<{
  enabled: boolean;
  tag: string;
  scriptType?: 'text/javascript' | string;
}>;

@NgModule({})
export class GoogleAnalyticsModule {
  constructor(
    @Inject(PLATFORM_ID)
    platformId: string,
    @Inject(DOCUMENT)
    d: Document,
    @Inject(GOOGLEANALYTICS_CONFIG_TOKEN)
    { tag, enabled, scriptType }: GoogleAnalyticsConfiguration,
  ) {
    if (isPlatformBrowser(platformId) && enabled) {
      const type = scriptType ?? 'text/javascript';

      const ads = d.createElement('script');
      ads.type = type;
      ads.src = `https://www.googletagmanager.com/gtag/js?id=${tag}`;
      ads.crossOrigin = 'anonymous';
      d.head.appendChild(ads);

      const script = d.createElement('script');
      script.type = type;
      script.innerHTML = scriptconfig(tag);
      d.head.appendChild(script);
    }
  }

  static forRoot(config: GoogleAnalyticsConfiguration): ModuleWithProviders<GoogleAnalyticsModule> {
    return {
      ngModule: GoogleAnalyticsModule,
      providers: [{ provide: GOOGLEANALYTICS_CONFIG_TOKEN, useValue: config }],
    };
  }
}
