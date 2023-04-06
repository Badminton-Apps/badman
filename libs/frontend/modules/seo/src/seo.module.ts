import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InjectionToken } from '@angular/core';
import { ISeoConfig } from './interfaces/seo-config.interface';

export const SEO_CONFIG = new InjectionToken<ISeoConfig>('SEO_CONFIG');

@NgModule({
  imports: [CommonModule],
})
export class SeoModule {
  public static forRoot(config: ISeoConfig): ModuleWithProviders<SeoModule> {
    return {
      ngModule: SeoModule,
      providers: [{ provide: SEO_CONFIG, useValue: config }],
    };
  }
}
