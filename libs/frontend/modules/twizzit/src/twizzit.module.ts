import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ITwizzitConfig } from './interfaces';

export const TWIZZIT_CONFIG = new InjectionToken<ITwizzitConfig>('TWIZZIT_CONFIG');

@NgModule({
  imports: [CommonModule],
})
export class TwizzitModule {
  public static forRoot(config: ITwizzitConfig): ModuleWithProviders<TwizzitModule> {
    return {
      ngModule: TwizzitModule,
      providers: [{ provide: TWIZZIT_CONFIG, useValue: config }],
    };
  }
}
