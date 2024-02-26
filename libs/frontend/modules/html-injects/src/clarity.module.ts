import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, InjectionToken, ModuleWithProviders, NgModule, PLATFORM_ID } from '@angular/core';

function scriptconfig(projectId: string): string {
  return `(function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', '${projectId}');`;
}

const CLARITY_CONFIG_TOKEN = new InjectionToken<ClarityConfiguration>('clarity.config');

export type ClarityConfiguration = Readonly<{
  enabled: boolean;
  projectId: string;
  scriptType?: 'text/javascript' | string;
}>;

@NgModule({})
export class ClarityModule {
  constructor(
    @Inject(PLATFORM_ID)
    platformId: string,
    @Inject(DOCUMENT)
    d: Document,
    @Inject(CLARITY_CONFIG_TOKEN)
    { enabled, projectId, scriptType }: ClarityConfiguration,
  ) {
    if (isPlatformBrowser(platformId) && enabled) {
      const type = scriptType ?? 'text/javascript';

      const script = d.createElement('script');
      script.type = type;
      script.innerHTML = scriptconfig(projectId);
      d.head.appendChild(script);
    }
  }

  static forRoot(config: ClarityConfiguration): ModuleWithProviders<ClarityModule> {
    return {
      ngModule: ClarityModule,
      providers: [{ provide: CLARITY_CONFIG_TOKEN, useValue: config }],
    };
  }
}
