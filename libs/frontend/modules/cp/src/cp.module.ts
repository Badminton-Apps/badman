import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICpConfig } from './interfaces';

export const CP_CONFIG = new InjectionToken<ICpConfig>('CP_CONFIG');

@NgModule({
  imports: [CommonModule],
})
export class CpModule {
  public static forRoot(config: ICpConfig): ModuleWithProviders<CpModule> {
    return {
      ngModule: CpModule,
      providers: [{ provide: CP_CONFIG, useValue: config }],
    };
  }
}
