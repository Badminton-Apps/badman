import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  Inject,
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  PLATFORM_ID,
} from "@angular/core";
import { inject } from '@vercel/analytics';

function scriptconfig(): string {
  return `
    (adsbygoogle = window.adsbygoogle || []).push({});
`;
}

export const GOOGLEADS_CONFIG_TOKEN =
  new InjectionToken<GoogleAdsConfiguration>("googleads.config");

export type GoogleAdsConfiguration = Readonly<{
  enabled: boolean;
  debug: boolean;
  publisherId: string;
  slots: {
    sidebar: number;
    beta: number
  };
  scriptType?: "text/partytown" | "text/javascript" | string;
}>;

@NgModule({})
export class GoogleAdsModule {
  constructor(
    @Inject(PLATFORM_ID)
    platformId: string,
    @Inject(DOCUMENT)
    d: Document,
    @Inject(GOOGLEADS_CONFIG_TOKEN)
    { enabled, publisherId, scriptType, debug }: GoogleAdsConfiguration
  ) {
    if (isPlatformBrowser(platformId) && enabled) {
      const type = scriptType ?? "text/javascript";

      const ads = d.createElement("script");
      ads.type = type;
      ads.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      ads.async = true;
      ads.crossOrigin = "anonymous";
      ads.defer = true;

      d.body.appendChild(ads);

      const script = d.createElement("script");
      script.type = type;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.defer = true;
      script.innerHTML = scriptconfig();
      d.body.appendChild(script);

      // const amp = d.createElement("script");
      // amp.type = type;
      // amp.src = "https://cdn.ampproject.org/v0/amp-ad-0.1.js";
      // amp.async = true;
      // amp.crossOrigin = "anonymous";
      // amp.setAttribute("custom-element", "amp-ad");
      // d.head.appendChild(amp)

      inject({
        mode: debug ? "development" : "production",
      })
    }
  }

  static forRoot(
    config: GoogleAdsConfiguration
  ): ModuleWithProviders<GoogleAdsModule> {
    return {
      ngModule: GoogleAdsModule,
      providers: [{ provide: GOOGLEADS_CONFIG_TOKEN, useValue: config }],
    };
  }
}
