import { Inject, InjectionToken, ModuleWithProviders, NgModule, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WebVitalsService } from './services';

export const ANALYTICS_CONFIG_TOKEN = new InjectionToken<AnalyticsConfig>('analytics.config');

export type AnalyticsConfig = Readonly<{
  enabled: boolean;
  analyticsId: string;
  url: string;
  debug?: boolean;
  path?: string;
  params?: { [key: string]: string };
  scriptType?: 'text/partytown' | 'text/javascript' | string;
}>;

@NgModule({
  imports: [CommonModule],
  providers: [WebVitalsService],
})
export class AnalyticsModule {
  constructor(
    @Inject(PLATFORM_ID)
    platformId: string,
    @Inject(ANALYTICS_CONFIG_TOKEN)
    config: AnalyticsConfig,
    vitals: WebVitalsService,
  ) {
    if (isPlatformBrowser(platformId) && config.enabled) {
      vitals.init();
    }
  }

  static forRoot(config: AnalyticsConfig): ModuleWithProviders<AnalyticsModule> {
    return {
      ngModule: AnalyticsModule,
      providers: [{ provide: ANALYTICS_CONFIG_TOKEN, useValue: config }],
    };
  }
}
